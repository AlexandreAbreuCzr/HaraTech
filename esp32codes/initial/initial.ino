#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <LiquidCrystal.h>
#include <esp_task_wdt.h>

// ============================================================
// PINAGEM OFICIAL - HARA TECH / ESP32 NODEMCU-32S
// ============================================================
const int LCD_RS_PIN = 23;
const int LCD_ENABLE_PIN = 22;
const int LCD_D4_PIN = 21;
const int LCD_D5_PIN = 19;
const int LCD_D6_PIN = 18;
const int LCD_D7_PIN = 5;
const int PUMP_RELAY_PIN = 26;

// Cada conector da caixa possui um sinal para servo e um sinal ADC para sensor.
// O usuario escolhe apenas SAIDA 1, 2 ou 3; estes GPIOs nunca sao configuraveis.
const int HARA_PORT_COUNT = 3;
const int SERVO_GPIO_PINS[HARA_PORT_COUNT] = {13, 14, 25};
const int SOIL_SENSOR_GPIO_PINS[HARA_PORT_COUNT] = {34, 35, 32};

LiquidCrystal lcd(
  LCD_RS_PIN,
  LCD_ENABLE_PIN,
  LCD_D4_PIN,
  LCD_D5_PIN,
  LCD_D6_PIN,
  LCD_D7_PIN
);
Preferences prefs;
WiFiClient plainClient;
WiFiClientSecure secureClient;

// ============================================================
// CONFIGURACAO - Ajuste via build flags ou edite aqui
// ============================================================
#ifndef API_URL
#define API_URL "https://hara-tech-api.onrender.com/api/v1"
#endif

#ifndef PROVISIONING_SECRET
#define PROVISIONING_SECRET "troque-por-um-segredo-forte-com-pelo-menos-32-caracteres"
#endif

// ============================================================
// PINOS E HARDWARE
// ============================================================
// O modulo instalado no Hara Tech e acionado quando IN recebe nivel HIGH.
const bool PUMP_ACTIVE_HIGH = true;

const int SOIL_RAW_DRY = 4095;
const int SOIL_RAW_WET = 1200;
// Com resistor de 100 kOhm entre AO e GND, conector vazio fica proximo de 0.
// Leituras abaixo do ponto molhado calibrado sao eletricamente invalidas.
const int SOIL_RAW_MIN_VALID = SOIL_RAW_WET;
const int MOISTURE_HYSTERESIS = 5;
const uint8_t SENSOR_SAMPLE_COUNT = 15;

// ============================================================
// TEMPOS E TIMEOUTS
// ============================================================
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
const unsigned long REGISTER_RETRY_INTERVAL_MS = 30000;
const unsigned long HEARTBEAT_INTERVAL_MS = 60000;
const unsigned long SENSOR_INTERVAL_MS = 2000;
const unsigned long DISPLAY_INTERVAL_MS = 2000;
const unsigned long CONFIG_SYNC_INTERVAL_MS = 10000;
const unsigned long TELEMETRY_INTERVAL_MS = 5000;
const unsigned long COMMAND_INTERVAL_MS = 2000;
const uint8_t COMMAND_ACK_MAX_ATTEMPTS = 3;
const unsigned long COMMAND_ACK_RETRY_DELAY_MS = 500;
const uint8_t COMPLETED_COMMAND_CACHE_SIZE = 12;
const uint16_t HTTP_TIMEOUT_MS = 10000;
const unsigned long WDT_TIMEOUT_SEC = 30;

const int MAX_ZONES = HARA_PORT_COUNT;
const int SERVO_FREQ = 50;
const int SERVO_RESOLUTION = 12;
const int SERVO_PERIOD_US = 20000;
const int SERVO_STEP_DEGREES = 1;
const unsigned long SERVO_STEP_INTERVAL_MS = 20;
const unsigned long SERVO_MOVE_TIMEOUT_MS = 10000;
const unsigned long SERVO_ENDPOINT_HOLD_MS = 600;

// ============================================================
// ESTADO GLOBAL
// ============================================================
String deviceId = "";
String deviceToken = "";
String chipId = "";

unsigned long lastWifiRetryAt = 0;
unsigned long lastRegisterAttemptAt = 0;
unsigned long lastHeartbeatAt = 0;
unsigned long lastSensorReadAt = 0;
unsigned long lastDisplayAt = 0;
unsigned long lastConfigSyncAt = 0;
unsigned long lastTelemetryAt = 0;
unsigned long lastCommandPollAt = 0;
unsigned long bootTimeMs = 0;
unsigned long lastSensorDebugAt = 0;
int displayZoneCursor = 0;

int soilMoisture = 0;
int zoneSoilMoisture[HARA_PORT_COUNT] = {-1, -1, -1};
int zoneSoilRaw[HARA_PORT_COUNT] = {-1, -1, -1};
int zoneSoilFilteredRaw[HARA_PORT_COUNT] = {-1, -1, -1};
bool hasMoistureReading = false;
int lastHttpCode = 0;
bool pumpOn = false;
bool apiReady = false;
bool configLoaded = false;
bool restartRequested = false;
String lastCommandFailureReason = "";
String completedCommandIds[COMPLETED_COMMAND_CACHE_SIZE];
uint8_t completedCommandCount = 0;
uint8_t completedCommandNext = 0;

struct ActuatorCfg {
  String driver;
  int channel;
  int openAngle;
  int closedAngle;
  int minPulseUs;
  int maxPulseUs;
  bool inverted;
};

struct ZoneCfg {
  int index;
  String name;
  int moistureLimit;
  bool enabled;
  String desiredState;
  ActuatorCfg actuator;
  bool hasActuator;
};

struct DeviceCfg {
  int configVersion;
  String operationMode;
  int moistureLimit;
  int heartbeatIntervalSeconds;
  int telemetryIntervalSeconds;
  int configSyncIntervalSeconds;
  String pumpMode;
  int maxSimultaneousZones;
  ZoneCfg zones[MAX_ZONES];
  int zoneCount;
};

struct ZoneState {
  int index;
  int gpio;
  int currentAngle;
  int targetAngle;
  int closedAngle;
  int minPulseUs;
  int maxPulseUs;
  bool inverted;
  bool detachWhenDone;
  unsigned long lastMoveAt;
  String targetState;
  String appliedState;
  bool servoAttached;
};

DeviceCfg config = {
  0,
  "AUTO",
  35,
  (int)(HEARTBEAT_INTERVAL_MS / 1000),
  (int)(TELEMETRY_INTERVAL_MS / 1000),
  (int)(CONFIG_SYNC_INTERVAL_MS / 1000),
  "AUTO",
  0,
  {},
  0,
};
ZoneState zoneStates[MAX_ZONES];
int zoneStateCount = 0;

// ============================================================
// UTILITARIOS
// ============================================================

String getChipId() {
  return String((uint32_t)ESP.getEfuseMac(), HEX);
}

bool isProvisioningSecretConfigured() {
  String secret = String(PROVISIONING_SECRET);
  return secret.length() > 0 &&
         secret != "troque-por-um-segredo-forte-com-pelo-menos-32-caracteres";
}

String buildApiUrl(const String& path) {
  String base = String(API_URL);
  if (base.endsWith("/")) {
    base.remove(base.length() - 1);
  }
  return base + path;
}

bool beginHttp(HTTPClient& http, const String& path) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }
  String url = buildApiUrl(path);
  if (url.startsWith("https://")) {
    secureClient.setInsecure();
    if (!http.begin(secureClient, url)) {
      return false;
    }
  } else if (!http.begin(plainClient, url)) {
    return false;
  }
  http.setTimeout(HTTP_TIMEOUT_MS);
  return true;
}

void addDeviceAuthHeader(HTTPClient& http) {
  http.addHeader("X-Device-Token", deviceToken);
}

void showStatus(const String& line1, const String& line2 = "") {
  // Sobrescreve as 16 colunas sem limpar o display; isso reduz cintilacao e
  // evita pulsos extras no LCD quando bomba ou servo mudam de estado.
  String paddedLine1 = line1 + "                ";
  String paddedLine2 = line2 + "                ";
  lcd.setCursor(0, 0);
  lcd.print(paddedLine1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(paddedLine2.substring(0, 16));
}

// ============================================================
// PERSISTENCIA (Preferences NVS)
// ============================================================

void loadCredentials() {
  prefs.begin("hara", false);
  deviceId = prefs.getString("deviceId", "");
  deviceToken = prefs.getString("deviceToken", "");
  prefs.end();

  // As areas vivem na API e nao sao persistidas integralmente na ESP32.
  // Portanto, toda inicializacao deve pedir uma copia completa da configuracao.
  config.configVersion = 0;
  configLoaded = false;
}

void loadCompletedCommands() {
  prefs.begin("hara", true);
  String stored = prefs.getString("cmdDone", "");
  prefs.end();

  completedCommandCount = 0;
  completedCommandNext = 0;
  for (uint8_t i = 0; i < COMPLETED_COMMAND_CACHE_SIZE; i++) {
    completedCommandIds[i] = "";
  }

  int start = 0;
  while (start < stored.length() && completedCommandCount < COMPLETED_COMMAND_CACHE_SIZE) {
    int separator = stored.indexOf('\n', start);
    if (separator < 0) {
      separator = stored.length();
    }
    String commandId = stored.substring(start, separator);
    commandId.trim();
    if (commandId.length() > 0) {
      completedCommandIds[completedCommandCount++] = commandId;
    }
    start = separator + 1;
  }
  completedCommandNext = completedCommandCount % COMPLETED_COMMAND_CACHE_SIZE;
}

bool commandAlreadyCompleted(const String& commandId) {
  for (uint8_t i = 0; i < completedCommandCount; i++) {
    if (completedCommandIds[i] == commandId) {
      return true;
    }
  }
  return false;
}

bool commandChangesPhysicalOutput(const char* type) {
  return strcmp(type, "OPEN_ZONE") == 0 ||
         strcmp(type, "CLOSE_ZONE") == 0 ||
         strcmp(type, "TEST_ZONE") == 0 ||
         strcmp(type, "PUMP_ON") == 0 ||
         strcmp(type, "PUMP_OFF") == 0;
}

void rememberCompletedCommand(const String& commandId) {
  if (commandId.length() == 0 || commandAlreadyCompleted(commandId)) {
    return;
  }

  completedCommandIds[completedCommandNext] = commandId;
  completedCommandNext = (completedCommandNext + 1) % COMPLETED_COMMAND_CACHE_SIZE;
  if (completedCommandCount < COMPLETED_COMMAND_CACHE_SIZE) {
    completedCommandCount++;
  }

  String stored = "";
  for (uint8_t i = 0; i < COMPLETED_COMMAND_CACHE_SIZE; i++) {
    if (completedCommandIds[i].length() == 0) {
      continue;
    }
    if (stored.length() > 0) {
      stored += '\n';
    }
    stored += completedCommandIds[i];
  }

  prefs.begin("hara", false);
  prefs.putString("cmdDone", stored);
  prefs.end();
}

void saveCredentials(const String& id, const String& token) {
  prefs.begin("hara", false);
  if (id.length() > 0) {
    prefs.putString("deviceId", id);
    deviceId = id;
  }
  if (token.length() > 0) {
    prefs.putString("deviceToken", token);
    deviceToken = token;
  }
  prefs.end();
}

void saveConfigVersion(int version) {
  config.configVersion = version;
}

void clearCredentials() {
  prefs.begin("hara", false);
  prefs.remove("deviceId");
  prefs.remove("deviceToken");
  prefs.remove("configVersion");
  prefs.remove("cmdDone");
  prefs.end();
  deviceId = "";
  deviceToken = "";
  config.configVersion = 0;
  configLoaded = false;
  apiReady = false;
  completedCommandCount = 0;
  completedCommandNext = 0;
  for (uint8_t i = 0; i < COMPLETED_COMMAND_CACHE_SIZE; i++) {
    completedCommandIds[i] = "";
  }
}

bool hasDeviceCredentials() {
  return deviceId.length() > 0 && deviceToken.length() > 0;
}

// ============================================================
// WIFI
// ============================================================

bool connectWifiPortal() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  WiFiManager wm;
  wm.setConfigPortalTimeout(180);
  wm.setConnectTimeout(15);
  showStatus("Hara Setup", "Conecte WiFi");
  bool ok = wm.autoConnect("HARA_SETUP");
  if (ok) {
    showStatus("WiFi OK", WiFi.localIP().toString());
  } else {
    showStatus("WiFi pendente", "Tentando...");
  }
  return ok;
}

void maintainWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }
  unsigned long now = millis();
  if (now - lastWifiRetryAt < WIFI_RETRY_INTERVAL_MS) {
    return;
  }
  lastWifiRetryAt = now;
  WiFi.reconnect();
  showStatus("Reconectando", "WiFi");
}

// ============================================================
// REGISTRO DO DISPOSITIVO
// ============================================================

bool registerDevice(bool rotateToken) {
  if (!isProvisioningSecretConfigured()) {
    Serial.println("Configure PROVISIONING_SECRET antes de registrar o device.");
    showStatus("Sem segredo", "provisionamento");
    return false;
  }
  HTTPClient http;
  if (!beginHttp(http, "/devices/register")) {
    lastHttpCode = 0;
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Provisioning-Secret", PROVISIONING_SECRET);
  StaticJsonDocument<256> doc;
  doc["chipId"] = chipId;
  if (rotateToken) {
    doc["rotateToken"] = true;
  }
  String body;
  serializeJson(doc, body);
  int code = http.POST(body);
  lastHttpCode = code;
  if (code != 200) {
    Serial.printf("Falha no registro. HTTP %d\n", code);
    http.end();
    return false;
  }
  String response = http.getString();
  StaticJsonDocument<768> res;
  DeserializationError error = deserializeJson(res, response);
  http.end();
  if (error) {
    Serial.printf("JSON invalido no registro: %s\n", error.c_str());
    return false;
  }
  String newDeviceId = res["data"]["deviceId"] | res["deviceId"] | "";
  String newDeviceToken = res["data"]["deviceToken"] | res["deviceToken"] | "";
  if (newDeviceId.length() == 0) {
    Serial.println("Registro sem deviceId na resposta.");
    return false;
  }
  if (newDeviceToken.length() == 0 && deviceToken.length() == 0) {
    if (!rotateToken) {
      Serial.println("Registro sem deviceToken. Tentando rotacionar token.");
      return registerDevice(true);
    }
    Serial.println("Registro sem deviceToken mesmo com rotacao.");
    return false;
  }
  saveCredentials(newDeviceId, newDeviceToken);
  apiReady = hasDeviceCredentials();
  showStatus("Registrado", deviceId);
  return apiReady;
}

bool recoverDeviceRegistration(int httpCode, const char* source) {
  if (httpCode != 401 && httpCode != 404) {
    return false;
  }

  Serial.printf(
    "%s retornou HTTP %d. Apagando cadastro local antigo e registrando novamente.\n",
    source,
    httpCode
  );
  clearCredentials();
  bool registered = registerDevice(true);
  if (registered) {
    Serial.printf("Novo codigo do dispositivo: %s\n", deviceId.c_str());
    showStatus("Novo codigo", deviceId);
  }
  return registered;
}

void ensureDeviceRegistered() {
  if (hasDeviceCredentials()) {
    apiReady = true;
    return;
  }
  unsigned long now = millis();
  if (now - lastRegisterAttemptAt < REGISTER_RETRY_INTERVAL_MS) {
    return;
  }
  lastRegisterAttemptAt = now;
  showStatus("Registrando", chipId);
  registerDevice(true);
}

// ============================================================
// HEARTBEAT
// ============================================================

bool sendHeartbeat() {
  if (!hasDeviceCredentials()) {
    return false;
  }
  HTTPClient http;
  if (!beginHttp(http, "/devices/" + deviceId + "/heartbeat")) {
    lastHttpCode = 0;
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  addDeviceAuthHeader(http);
  StaticJsonDocument<256> doc;
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  String body;
  serializeJson(doc, body);
  int code = http.POST(body);
  lastHttpCode = code;
  http.end();
  if (code == 200) {
    apiReady = true;
    return true;
  }
  apiReady = false;
  Serial.printf("Heartbeat falhou. HTTP %d\n", code);
  recoverDeviceRegistration(code, "Heartbeat");
  return false;
}

// ============================================================
// SENSORES E ATUADORES
// ============================================================

int readSoilRaw(int gpio) {
  int samples[SENSOR_SAMPLE_COUNT];
  analogRead(gpio); // Descarta a primeira conversao depois da troca do ADC.
  for (uint8_t i = 0; i < SENSOR_SAMPLE_COUNT; i++) {
    samples[i] = analogRead(gpio);
    delay(2);
  }
  // Mediana: rejeita os picos causados por rele, bomba e comutacao dos servos.
  for (uint8_t i = 1; i < SENSOR_SAMPLE_COUNT; i++) {
    int value = samples[i];
    int j = i - 1;
    while (j >= 0 && samples[j] > value) {
      samples[j + 1] = samples[j];
      j--;
    }
    samples[j + 1] = value;
  }
  return samples[SENSOR_SAMPLE_COUNT / 2];
}

int soilRawToPercent(int raw) {
  int percent = map(raw, SOIL_RAW_DRY, SOIL_RAW_WET, 0, 100);
  return constrain(percent, 0, 100);
}

bool isSoilSensorReadingValid(int raw) {
  return raw >= SOIL_RAW_MIN_VALID && raw <= SOIL_RAW_DRY;
}

bool isValidHaraPortIndex(int zoneIndex) {
  return zoneIndex >= 0 && zoneIndex < HARA_PORT_COUNT;
}

bool isServoMappedToZone(int zoneIndex, int servoGpio) {
  return isValidHaraPortIndex(zoneIndex) &&
    SERVO_GPIO_PINS[zoneIndex] == servoGpio;
}

void readConfiguredSoilMoisture() {
  bool configuredPorts[HARA_PORT_COUNT] = {false, false, false};
  for (int i = 0; i < HARA_PORT_COUNT; i++) {
    zoneSoilMoisture[i] = -1;
    zoneSoilRaw[i] = -1;
  }

  int total = 0;
  int readingCount = 0;
  bool printDiagnostics = millis() - lastSensorDebugAt >= 10000;
  for (int i = 0; i < config.zoneCount; i++) {
    int portIndex = config.zones[i].index;
    if (!isValidHaraPortIndex(portIndex)) {
      continue;
    }
    configuredPorts[portIndex] = true;
    int raw = readSoilRaw(SOIL_SENSOR_GPIO_PINS[portIndex]);
    zoneSoilRaw[portIndex] = raw;
    if (!isSoilSensorReadingValid(raw)) {
      zoneSoilFilteredRaw[portIndex] = -1;
      if (printDiagnostics) {
        Serial.printf(
          "Sensor S%d GPIO %d: DESCONECTADO/INVALIDO (ADC=%d, minimo=%d).\n",
          portIndex + 1,
          SOIL_SENSOR_GPIO_PINS[portIndex],
          raw,
          SOIL_RAW_MIN_VALID
        );
      }
      continue;
    }
    if (zoneSoilFilteredRaw[portIndex] < 0) {
      zoneSoilFilteredRaw[portIndex] = raw;
    } else {
      // Filtro temporal: 75% do valor anterior e 25% da nova mediana.
      zoneSoilFilteredRaw[portIndex] =
        (zoneSoilFilteredRaw[portIndex] * 3 + raw) / 4;
    }
    int moisture = soilRawToPercent(zoneSoilFilteredRaw[portIndex]);
    zoneSoilMoisture[portIndex] = moisture;
    total += moisture;
    readingCount++;
    if (printDiagnostics) {
      Serial.printf(
        "Sensor S%d GPIO %d: ADC=%d, filtrado=%d, umidade=%d%%.\n",
        portIndex + 1,
        SOIL_SENSOR_GPIO_PINS[portIndex],
        raw,
        zoneSoilFilteredRaw[portIndex],
        moisture
      );
    }
  }

  for (int i = 0; i < HARA_PORT_COUNT; i++) {
    if (!configuredPorts[i]) {
      zoneSoilFilteredRaw[i] = -1;
    }
  }
  if (printDiagnostics) {
    lastSensorDebugAt = millis();
  }

  hasMoistureReading = readingCount > 0;
  soilMoisture = hasMoistureReading ? total / readingCount : 0;
}

void setPump(bool enabled) {
  pumpOn = enabled;
  if (PUMP_ACTIVE_HIGH) {
    digitalWrite(PUMP_RELAY_PIN, enabled ? HIGH : LOW);
  } else {
    digitalWrite(PUMP_RELAY_PIN, enabled ? LOW : HIGH);
  }
}

int angleToPulseUs(int angle, int minPulseUs, int maxPulseUs) {
  return map(constrain(angle, 0, 180), 0, 180, minPulseUs, maxPulseUs);
}

int pulseUsToDuty(int pulseUs) {
  return map(pulseUs, 0, SERVO_PERIOD_US, 0, (1 << SERVO_RESOLUTION) - 1);
}

bool attachServoPwm(int gpio, int stateIndex) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  return ledcAttach(gpio, SERVO_FREQ, SERVO_RESOLUTION);
#else
  double configuredFrequency = ledcSetup(stateIndex, SERVO_FREQ, SERVO_RESOLUTION);
  if (configuredFrequency <= 0) {
    return false;
  }
  ledcAttachPin(gpio, stateIndex);
  return true;
#endif
}

void detachServoPwm(int gpio) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcDetach(gpio);
#else
  ledcDetachPin(gpio);
#endif
}

bool writeServoPwm(int gpio, int stateIndex, int duty) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  return ledcWrite(gpio, duty);
#else
  ledcWrite(stateIndex, duty);
  return true;
#endif
}

bool applyServoAngle(int stateIndex, int angle) {
  ZoneState& state = zoneStates[stateIndex];
  int effectiveAngle = state.inverted ? (180 - angle) : angle;
  int pulseUs = angleToPulseUs(effectiveAngle, state.minPulseUs, state.maxPulseUs);
  return writeServoPwm(state.gpio, stateIndex, pulseUsToDuty(pulseUs));
}

void detachZoneServo(int stateIndex) {
  ZoneState& state = zoneStates[stateIndex];
  if (!state.servoAttached) {
    return;
  }
  detachServoPwm(state.gpio);
  state.servoAttached = false;
  state.gpio = -1;
}

bool setupZoneServo(int stateIndex, const ActuatorCfg& actuator) {
  ZoneState& state = zoneStates[stateIndex];
  state.gpio = actuator.channel;
  state.closedAngle = constrain(actuator.closedAngle, 0, 180);
  state.currentAngle = state.closedAngle;
  state.targetAngle = state.closedAngle;
  state.minPulseUs = constrain(actuator.minPulseUs, 400, 2999);
  state.maxPulseUs = constrain(actuator.maxPulseUs, state.minPulseUs + 1, 3000);
  state.inverted = actuator.inverted;
  state.detachWhenDone = false;
  state.lastMoveAt = millis();
  state.targetState = "CLOSED";
  state.appliedState = "UNKNOWN";

  if (!attachServoPwm(state.gpio, stateIndex)) {
    Serial.printf("Falha ao configurar PWM do servo da zona %d no GPIO %d.\n",
      state.index, state.gpio);
    state.gpio = -1;
    return false;
  }

  state.servoAttached = true;
  if (!applyServoAngle(stateIndex, state.closedAngle)) {
    Serial.printf("Falha ao escrever PWM inicial do servo da zona %d no GPIO %d.\n",
      state.index, state.gpio);
    detachZoneServo(stateIndex);
    return false;
  }
  delay(SERVO_ENDPOINT_HOLD_MS);
  state.appliedState = "CLOSED";
  Serial.printf(
    "Servo da zona %d pronto: GPIO %d, fechado %d, aberto %d, pulsos %d-%d us.\n",
    state.index,
    state.gpio,
    actuator.closedAngle,
    actuator.openAngle,
    state.minPulseUs,
    state.maxPulseUs
  );
  return true;
}

int zoneIndexToStateIndex(int index) {
  for (int i = 0; i < zoneStateCount; i++) {
    if (zoneStates[i].index == index) {
      return i;
    }
  }
  if (zoneStateCount < MAX_ZONES) {
    int pos = zoneStateCount;
    zoneStates[pos].index = index;
    zoneStates[pos].gpio = -1;
    zoneStates[pos].currentAngle = -1;
    zoneStates[pos].targetAngle = -1;
    zoneStates[pos].closedAngle = 10;
    zoneStates[pos].minPulseUs = 500;
    zoneStates[pos].maxPulseUs = 2500;
    zoneStates[pos].inverted = false;
    zoneStates[pos].detachWhenDone = false;
    zoneStates[pos].lastMoveAt = 0;
    zoneStates[pos].targetState = "CLOSED";
    zoneStates[pos].appliedState = "UNKNOWN";
    zoneStates[pos].servoAttached = false;
    zoneStateCount++;
    return pos;
  }
  return -1;
}

int findZoneStateIndex(int index) {
  for (int i = 0; i < zoneStateCount; i++) {
    if (zoneStates[i].index == index) {
      return i;
    }
  }
  return -1;
}

bool setZoneDesiredState(int zoneIndex, const String& desiredState) {
  for (int i = 0; i < config.zoneCount; i++) {
    if (config.zones[i].index == zoneIndex) {
      if (desiredState == "OPEN" && !config.zones[i].enabled) {
        return false;
      }
      config.zones[i].desiredState = desiredState;
      return true;
    }
  }
  return false;
}

bool gpioAlreadyUsedInConfig(int configPosition, int gpio) {
  for (int i = 0; i < configPosition; i++) {
    const ZoneCfg& other = config.zones[i];
    if (other.hasActuator && other.actuator.driver == "ESP32_PWM" &&
        other.actuator.channel == gpio) {
      return true;
    }
  }
  return false;
}

bool stateHasActiveConfig(const ZoneState& state) {
  for (int i = 0; i < config.zoneCount; i++) {
    const ZoneCfg& zone = config.zones[i];
    if (zone.index == state.index && zone.hasActuator &&
        zone.actuator.driver == "ESP32_PWM" &&
        isServoMappedToZone(zone.index, zone.actuator.channel)) {
      return true;
    }
  }
  return false;
}

void scheduleServoDetach(int stateIndex) {
  ZoneState& state = zoneStates[stateIndex];
  if (!state.servoAttached) {
    return;
  }
  state.targetAngle = state.closedAngle;
  state.targetState = "CLOSED";
  state.detachWhenDone = true;
}

void updateServoMovements(unsigned long now);

void closeAndDetachZoneServo(int stateIndex) {
  ZoneState& state = zoneStates[stateIndex];
  scheduleServoDetach(stateIndex);
  unsigned long startedAt = millis();
  while (state.servoAttached && millis() - startedAt < SERVO_MOVE_TIMEOUT_MS) {
    updateServoMovements(millis());
    esp_task_wdt_reset();
    delay(5);
  }
  if (state.servoAttached) {
    // Ultimo recurso de seguranca: ordena fechado antes de liberar o PWM antigo.
    state.currentAngle = state.closedAngle;
    if (applyServoAngle(stateIndex, state.currentAngle)) {
      state.appliedState = "CLOSED";
    } else {
      state.appliedState = "UNKNOWN";
    }
    delay(100);
    detachZoneServo(stateIndex);
  }
}

void applyZonesFromConfig() {
  for (int i = 0; i < config.zoneCount; i++) {
    ZoneCfg& zone = config.zones[i];
    if (!zone.hasActuator) {
      continue;
    }

    if (zone.actuator.driver != "ESP32_PWM") {
      Serial.printf("Zona %d ignorada: driver %s nao suportado neste firmware.\n",
        zone.index, zone.actuator.driver.c_str());
      continue;
    }

    int gpio = zone.actuator.channel;
    if (!isServoMappedToZone(zone.index, gpio)) {
      Serial.printf(
        "Saida %d ignorada: servo deve usar GPIO %d, mas recebeu GPIO %d.\n",
        zone.index + 1,
        isValidHaraPortIndex(zone.index) ? SERVO_GPIO_PINS[zone.index] : -1,
        gpio
      );
      continue;
    }
    if (gpioAlreadyUsedInConfig(i, gpio)) {
      Serial.printf("Zona %d ignorada: GPIO %d repetido na configuracao.\n",
        zone.index, gpio);
      continue;
    }

    String targetState = (zone.enabled && zone.desiredState == "OPEN")
      ? "OPEN"
      : "CLOSED";
    int targetAngle = (targetState == "OPEN")
      ? zone.actuator.openAngle
      : zone.actuator.closedAngle;
    int stateIdx = zoneIndexToStateIndex(zone.index);
    if (stateIdx < 0) {
      Serial.printf("Sem espaco de estado para a zona %d.\n", zone.index);
      continue;
    }

    ZoneState& state = zoneStates[stateIdx];
    if (state.servoAttached && state.gpio != gpio) {
      closeAndDetachZoneServo(stateIdx);
    }
    if (!state.servoAttached && !setupZoneServo(stateIdx, zone.actuator)) {
      continue;
    }

    state.closedAngle = constrain(zone.actuator.closedAngle, 0, 180);
    state.minPulseUs = constrain(zone.actuator.minPulseUs, 400, 2999);
    state.maxPulseUs = constrain(zone.actuator.maxPulseUs, state.minPulseUs + 1, 3000);
    state.inverted = zone.actuator.inverted;
    state.targetAngle = constrain(targetAngle, 0, 180);
    state.targetState = targetState;
    state.detachWhenDone = false;
  }

  for (int i = 0; i < zoneStateCount; i++) {
    if (zoneStates[i].servoAttached && !stateHasActiveConfig(zoneStates[i])) {
      scheduleServoDetach(i);
    }
  }
}

void updateServoMovements(unsigned long now) {
  for (int i = 0; i < zoneStateCount; i++) {
    ZoneState& state = zoneStates[i];
    if (!state.servoAttached) {
      continue;
    }

    if (state.currentAngle == state.targetAngle) {
      state.appliedState = state.targetState;
      if (state.detachWhenDone) {
        detachZoneServo(i);
      }
      continue;
    }
    if (now - state.lastMoveAt < SERVO_STEP_INTERVAL_MS) {
      continue;
    }

    state.lastMoveAt = now;
    int delta = state.targetAngle - state.currentAngle;
    int step = constrain(delta, -SERVO_STEP_DEGREES, SERVO_STEP_DEGREES);
    state.currentAngle += step;
    if (!applyServoAngle(i, state.currentAngle)) {
      Serial.printf("Falha ao atualizar PWM da zona %d no GPIO %d.\n",
        state.index, state.gpio);
      lastCommandFailureReason = "Falha ao escrever PWM do servo";
      state.appliedState = "UNKNOWN";
      detachZoneServo(i);
      continue;
    }

    if (state.currentAngle == state.targetAngle) {
      state.appliedState = state.targetState;
      Serial.printf("Zona %d em %s (%d graus, GPIO %d).\n",
        state.index, state.appliedState.c_str(), state.currentAngle, state.gpio);
      if (state.detachWhenDone) {
        detachZoneServo(i);
      }
    }
  }
}

bool waitForZoneMovement(int zoneIndex) {
  int stateIdx = findZoneStateIndex(zoneIndex);
  if (stateIdx < 0 || !zoneStates[stateIdx].servoAttached) {
    lastCommandFailureReason = "Servo da area nao esta configurado";
    Serial.printf("Servo da zona %d nao esta configurado ou conectado ao PWM.\n", zoneIndex);
    return false;
  }

  unsigned long startedAt = millis();
  while (millis() - startedAt < SERVO_MOVE_TIMEOUT_MS) {
    unsigned long now = millis();
    updateServoMovements(now);
    ZoneState& state = zoneStates[stateIdx];
    if (!state.servoAttached) {
      if (lastCommandFailureReason.length() == 0) {
        lastCommandFailureReason = "PWM do servo foi desconectado";
      }
      return false;
    }
    if (state.currentAngle == state.targetAngle &&
        state.appliedState == state.targetState) {
      return true;
    }
    esp_task_wdt_reset();
    delay(5);
  }

  Serial.printf("Timeout ao mover o servo da zona %d.\n", zoneIndex);
  lastCommandFailureReason = "Timeout do movimento do servo";
  return false;
}

bool testZoneServo(int zoneIndex) {
  if (pumpOn) {
    lastCommandFailureReason = "Desligue a bomba antes de testar o servo";
    return false;
  }

  int configIndex = -1;
  for (int i = 0; i < config.zoneCount; i++) {
    if (config.zones[i].index == zoneIndex) {
      configIndex = i;
      break;
    }
  }
  if (configIndex < 0 || !config.zones[configIndex].hasActuator) {
    lastCommandFailureReason = "Area sem servo configurado";
    return false;
  }
  if (config.zones[configIndex].desiredState != "CLOSED") {
    lastCommandFailureReason = "Feche a area antes de testar o servo";
    return false;
  }

  Serial.printf("Teste do servo da zona %d: FECHADO -> ABERTO -> FECHADO.\n", zoneIndex);
  applyZonesFromConfig();
  if (!waitForZoneMovement(zoneIndex)) {
    return false;
  }
  delay(SERVO_ENDPOINT_HOLD_MS);

  config.zones[configIndex].desiredState = "OPEN";
  applyZonesFromConfig();
  if (!waitForZoneMovement(zoneIndex)) {
    config.zones[configIndex].desiredState = "CLOSED";
    applyZonesFromConfig();
    return false;
  }
  delay(SERVO_ENDPOINT_HOLD_MS);

  config.zones[configIndex].desiredState = "CLOSED";
  applyZonesFromConfig();
  if (!waitForZoneMovement(zoneIndex)) {
    return false;
  }
  delay(SERVO_ENDPOINT_HOLD_MS);
  Serial.printf("Teste do servo da zona %d concluido.\n", zoneIndex);
  return true;
}

void countIrrigationPaths(int& controlledZones, int& openZones) {
  controlledZones = 0;
  openZones = 0;
  for (int i = 0; i < config.zoneCount; i++) {
    ZoneCfg& zone = config.zones[i];
    if (!zone.hasActuator || zone.actuator.driver != "ESP32_PWM" ||
        !isServoMappedToZone(zone.index, zone.actuator.channel)) {
      continue;
    }
    controlledZones++;
    int stateIdx = findZoneStateIndex(zone.index);
    if (stateIdx >= 0 && zoneStates[stateIdx].targetState == "OPEN" &&
        zoneStates[stateIdx].appliedState == "OPEN") {
      openZones++;
    }
  }
}

bool irrigationPathIsSafe() {
  int controlledZones;
  int openZones;
  countIrrigationPaths(controlledZones, openZones);
  if (controlledZones == 0 || openZones == 0) {
    return false;
  }
  return config.maxSimultaneousZones <= 0 ||
    openZones <= config.maxSimultaneousZones;
}

void applyIrrigationControl() {
  if (!hasMoistureReading) {
    setPump(false);
    return;
  }
  if (config.pumpMode == "FORCED_ON") {
    setPump(irrigationPathIsSafe());
    return;
  }
  if (config.pumpMode == "FORCED_OFF") {
    setPump(false);
    return;
  }
  if (config.operationMode == "OFF") {
    bool changed = false;
    for (int i = 0; i < config.zoneCount; i++) {
      if (config.zones[i].desiredState != "CLOSED") {
        config.zones[i].desiredState = "CLOSED";
        changed = true;
      }
    }
    if (changed) {
      applyZonesFromConfig();
    }
    setPump(false);
    return;
  }
  if (config.operationMode != "AUTO") {
    return;
  }

  // Cada area decide pelo proprio sensor e movimenta somente o seu registro.
  bool zoneStateChanged = false;
  for (int i = 0; i < config.zoneCount; i++) {
    ZoneCfg& zone = config.zones[i];
    if (!zone.enabled || !zone.hasActuator ||
        !isServoMappedToZone(zone.index, zone.actuator.channel)) {
      continue;
    }

    // Falha segura: sem leitura valida, fecha o registro e nunca sustenta a bomba.
    if (zoneSoilMoisture[zone.index] < 0) {
      if (zone.desiredState != "CLOSED") {
        zone.desiredState = "CLOSED";
        zoneStateChanged = true;
      }
      continue;
    }

    int moisture = zoneSoilMoisture[zone.index];
    if (moisture < zone.moistureLimit && zone.desiredState != "OPEN") {
      zone.desiredState = "OPEN";
      zoneStateChanged = true;
    } else if (moisture > zone.moistureLimit + MOISTURE_HYSTERESIS &&
               zone.desiredState != "CLOSED") {
      zone.desiredState = "CLOSED";
      zoneStateChanged = true;
    }
  }
  if (zoneStateChanged) {
    applyZonesFromConfig();
  }

  // A bomba so parte depois que pelo menos um registro terminou de abrir.
  setPump(irrigationPathIsSafe());
}

void applyPumpSafety() {
  if (!pumpOn) {
    return;
  }

  int controlledZones;
  int openZones;
  countIrrigationPaths(controlledZones, openZones);

  bool noOpenPath = controlledZones > 0 && openZones == 0;
  bool tooManyOpenZones = config.maxSimultaneousZones > 0 &&
    openZones > config.maxSimultaneousZones;
  if (noOpenPath || tooManyOpenZones) {
    setPump(false);
    if (tooManyOpenZones) {
      Serial.println("Bomba desligada: limite de zonas simultaneas excedido.");
    }
  }
}

// ============================================================
// CONFIGURACAO REMOTA
// ============================================================

bool syncConfigFromApi() {
  if (!hasDeviceCredentials()) {
    return false;
  }
  HTTPClient http;
  String path = "/devices/" + deviceId + "/config";
  if (configLoaded && config.configVersion > 0) {
    path += "?configVersion=" + String(config.configVersion);
  }
  if (!beginHttp(http, path)) {
    lastHttpCode = 0;
    return false;
  }
  addDeviceAuthHeader(http);
  int code = http.GET();
  lastHttpCode = code;
  if (code == 304) {
    http.end();
    if (configLoaded) {
      return true;
    }
    // Nunca aceite 304 sem possuir as areas em RAM; force download completo.
    config.configVersion = 0;
    Serial.println("Config 304 sem cache local; solicitando configuracao completa.");
    return false;
  }
  if (code != 200) {
    Serial.printf("Falha no sync de config. HTTP %d\n", code);
    http.end();
    recoverDeviceRegistration(code, "Config");
    return false;
  }
  String response = http.getString();
  http.end();

  // Check the new standardized response format (success.data) or legacy
  DynamicJsonDocument doc(6144);
  DeserializationError error = deserializeJson(doc, response);
  if (error) {
    Serial.printf("JSON invalido no config: %s\n", error.c_str());
    return false;
  }

  // Handle both new (success.data) and legacy response formats
  JsonObject configData;
  if (doc["success"] == true && !doc["data"].isNull()) {
    configData = doc["data"].as<JsonObject>();
  } else {
    configData = doc.as<JsonObject>();
  }

  if (configData.isNull()) {
    Serial.println("Config: dados nao encontrados na resposta");
    return false;
  }

  config.operationMode = configData["operationMode"] | "AUTO";
  config.moistureLimit = configData["moistureThreshold"] | 35;
  config.heartbeatIntervalSeconds = max(
    1,
    configData["heartbeatIntervalSeconds"] | (int)(HEARTBEAT_INTERVAL_MS / 1000)
  );
  config.telemetryIntervalSeconds = max(
    1,
    configData["telemetryIntervalSeconds"] | (int)(TELEMETRY_INTERVAL_MS / 1000)
  );
  config.configSyncIntervalSeconds = max(
    1,
    configData["configSyncIntervalSeconds"] | (int)(CONFIG_SYNC_INTERVAL_MS / 1000)
  );
  config.pumpMode = configData["pumpMode"] | "AUTO";
  config.maxSimultaneousZones = configData["maxSimultaneousZones"] | 0;
  int newVersion = configData["configVersion"] | 0;
  JsonArray zonesArray = configData["zones"].as<JsonArray>();
  config.zoneCount = min((int)zonesArray.size(), MAX_ZONES);
  for (int i = 0; i < config.zoneCount; i++) {
    JsonObject z = zonesArray[i];
    config.zones[i].index = z["index"] | i;
    config.zones[i].name = z["name"] | "";
    config.zones[i].moistureLimit = constrain(
      z["moistureThreshold"] | config.moistureLimit,
      0,
      100
    );
    config.zones[i].enabled = z["enabled"] | true;
    config.zones[i].desiredState = z["desiredState"] | "CLOSED";
    JsonObject act = z["actuator"];
    if (!act.isNull()) {
      config.zones[i].hasActuator = true;
      config.zones[i].actuator.driver = act["driver"] | "ESP32_PWM";
      config.zones[i].actuator.channel = act["channel"] | 0;
      config.zones[i].actuator.openAngle = act["openAngle"] | 90;
      config.zones[i].actuator.closedAngle = act["closedAngle"] | 10;
      config.zones[i].actuator.minPulseUs = act["minPulseUs"] | 500;
      config.zones[i].actuator.maxPulseUs = act["maxPulseUs"] | 2500;
      config.zones[i].actuator.inverted = act["inverted"] | false;
    } else {
      config.zones[i].hasActuator = false;
    }
  }
  saveConfigVersion(newVersion);
  applyZonesFromConfig();
  configLoaded = true;
  Serial.printf("Config sync OK. Versao %d, %d zonas\n", newVersion, config.zoneCount);
  showStatus("Config OK", String(newVersion) + " v" + String(config.zoneCount) + "z");
  return true;
}

// ============================================================
// TELEMETRIA
// ============================================================

bool sendTelemetryToApi() {
  if (!hasDeviceCredentials()) {
    return false;
  }
  HTTPClient http;
  if (!beginHttp(http, "/devices/" + deviceId + "/telemetry")) {
    lastHttpCode = 0;
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  addDeviceAuthHeader(http);
  StaticJsonDocument<4096> doc;
  // Agregado legado; automacao e interface usam as leituras dentro de zones.
  doc["soilMoisture"] = soilMoisture;
  doc["pumpOn"] = pumpOn;
  doc["firmwareTimestampMs"] = millis();
  doc["rssi"] = WiFi.RSSI();
  doc["lastIp"] = WiFi.localIP().toString();
  doc["uptimeSeconds"] = (millis() - bootTimeMs) / 1000;
  doc["firmwareVersion"] = "1.4.3";
  if (config.zoneCount > 0) {
    JsonArray zonesArray = doc.createNestedArray("zones");
    for (int i = 0; i < config.zoneCount; i++) {
      JsonObject z = zonesArray.createNestedObject();
      int stateIdx = zoneIndexToStateIndex(config.zones[i].index);
      z["zoneIndex"] = config.zones[i].index;
      z["desiredState"] = config.zones[i].desiredState;
      z["confirmedState"] = "UNAVAILABLE";
      if (isValidHaraPortIndex(config.zones[i].index) &&
          zoneSoilMoisture[config.zones[i].index] >= 0) {
        z["soilMoisture"] = zoneSoilMoisture[config.zones[i].index];
      }
      if (stateIdx >= 0) {
        z["appliedState"] = zoneStates[stateIdx].appliedState;
        if (zoneStates[stateIdx].currentAngle >= 0) {
          z["servoAngle"] = zoneStates[stateIdx].currentAngle;
        }
      } else {
        z["appliedState"] = "UNKNOWN";
      }
    }
  }
  String body;
  serializeJson(doc, body);
  int code = http.POST(body);
  lastHttpCode = code;
  http.end();
  if (code == 201) {
    apiReady = true;
    return true;
  }
  apiReady = false;
  Serial.printf("Falha no envio de telemetria. HTTP %d\n", code);
  recoverDeviceRegistration(code, "Telemetria");
  return false;
}

// ============================================================
// COMANDOS
// ============================================================

bool checkPendingCommands() {
  if (!hasDeviceCredentials() || !configLoaded) {
    return false;
  }
  HTTPClient http;
  if (!beginHttp(http, "/devices/" + deviceId + "/commands/pending")) {
    lastHttpCode = 0;
    return false;
  }
  addDeviceAuthHeader(http);
  int code = http.GET();
  lastHttpCode = code;
  if (code != 200) {
    http.end();
    recoverDeviceRegistration(code, "Comandos");
    return false;
  }
  String response = http.getString();
  http.end();
  DynamicJsonDocument doc(4096);
  DeserializationError error = deserializeJson(doc, response);
  if (error) {
    return false;
  }
  // Handle both new (success.data.commands) and legacy (commands) formats
  JsonArray commands;
  if (doc["success"] == true && !doc["data"]["commands"].isNull()) {
    commands = doc["data"]["commands"].as<JsonArray>();
  } else {
    commands = doc["commands"].as<JsonArray>();
  }
  if (commands.isNull() || commands.size() == 0) {
    return true;
  }
  for (JsonObject cmd : commands) {
    const char* cmdId = cmd["id"];
    const char* cmdType = cmd["type"];
    if (cmdId == nullptr || cmdType == nullptr) {
      Serial.println("Comando ignorado: id ou tipo ausente.");
      continue;
    }
    JsonObject payload = cmd["payload"];
    restartRequested = false;
    lastCommandFailureReason = "";
    bool repeated = commandAlreadyCompleted(String(cmdId));
    bool success = true;
    if (repeated) {
      Serial.printf("Comando %s ja executado; reenviando apenas a confirmacao.\n", cmdId);
    } else {
      success = executeCommand(cmdType, payload);
      if (success && commandChangesPhysicalOutput(cmdType)) {
        // Persiste antes do ACK: se a rede cair, o comando reenviado nao move o hardware de novo.
        rememberCompletedCommand(String(cmdId));
      }
    }
    String failReason = lastCommandFailureReason.length() > 0
      ? lastCommandFailureReason
      : "Falha na execucao";
    bool acknowledged = acknowledgeCommand(cmdId, success, success ? "" : failReason);
    if (success && acknowledged && restartRequested) {
      delay(500);
      ESP.restart();
    }
  }
  return true;
}

bool executeCommand(const char* type, JsonObject payload) {
  Serial.printf("Executando comando: %s\n", type);
  if (strcmp(type, "SYNC_CONFIG") == 0) {
    bool synced = syncConfigFromApi();
    if (!synced) {
      lastCommandFailureReason = "Falha ao sincronizar configuracao";
    }
    return synced;
  }
  if (strcmp(type, "RESTART") == 0) {
    restartRequested = true;
    return true;
  }
  if (strcmp(type, "PUMP_ON") == 0) {
    config.pumpMode = "FORCED_ON";
    setPump(irrigationPathIsSafe());
    if (!pumpOn) {
      lastCommandFailureReason = "Nenhum registro aberto para ligar a bomba";
    }
    return pumpOn;
  }
  if (strcmp(type, "PUMP_OFF") == 0) {
    setPump(false);
    config.pumpMode = "FORCED_OFF";
    return true;
  }
  if (strcmp(type, "OPEN_ZONE") == 0 && !payload.isNull()) {
    int zoneIndex = payload["zoneIndex"] | -1;
    if (zoneIndex >= 0 && setZoneDesiredState(zoneIndex, "OPEN")) {
      applyZonesFromConfig();
      applyPumpSafety();
      return waitForZoneMovement(zoneIndex);
    }
    lastCommandFailureReason = "Area invalida ou sem atuador configurado";
    return false;
  }
  if (strcmp(type, "CLOSE_ZONE") == 0 && !payload.isNull()) {
    int zoneIndex = payload["zoneIndex"] | -1;
    if (zoneIndex >= 0 && setZoneDesiredState(zoneIndex, "CLOSED")) {
      applyZonesFromConfig();
      applyPumpSafety();
      return waitForZoneMovement(zoneIndex);
    }
    lastCommandFailureReason = "Area invalida ou sem atuador configurado";
    return false;
  }
  if (strcmp(type, "TEST_ZONE") == 0 && !payload.isNull()) {
    int zoneIndex = payload["zoneIndex"] | -1;
    if (zoneIndex < 0) {
      lastCommandFailureReason = "Area invalida para teste";
      return false;
    }
    return testZoneServo(zoneIndex);
  }
  if (strcmp(type, "OTA_UPDATE") == 0) {
    Serial.println("OTA_UPDATE nao implementado neste firmware.");
    lastCommandFailureReason = "Atualizacao OTA nao implementada";
    return false;
  }
  Serial.printf("Tipo de comando desconhecido: %s\n", type);
  lastCommandFailureReason = "Tipo de comando desconhecido";
  return false;
}

bool acknowledgeCommand(const char* commandId, bool success, const String& failReason) {
  if (!hasDeviceCredentials()) {
    return false;
  }
  StaticJsonDocument<256> doc;
  doc["success"] = success;
  if (!success && failReason.length() > 0) {
    doc["failReason"] = failReason;
  }
  String body;
  serializeJson(doc, body);

  for (uint8_t attempt = 0; attempt < COMMAND_ACK_MAX_ATTEMPTS; attempt++) {
    HTTPClient http;
    if (beginHttp(http, "/devices/" + deviceId + "/commands/" + String(commandId) + "/ack")) {
      http.addHeader("Content-Type", "application/json");
      addDeviceAuthHeader(http);
      int code = http.POST(body);
      lastHttpCode = code;
      http.end();
      if (code == 200) {
        return true;
      }
    } else {
      lastHttpCode = 0;
    }

    if (attempt + 1 < COMMAND_ACK_MAX_ATTEMPTS) {
      delay(COMMAND_ACK_RETRY_DELAY_MS);
    }
  }

  return false;
}

// ============================================================
// DISPLAY
// ============================================================

void updateDisplay() {
  String line1;
  if (config.zoneCount <= 0) {
    line1 = "Sem areas";
  } else {
    if (displayZoneCursor >= config.zoneCount) {
      displayZoneCursor = 0;
    }
    ZoneCfg& zone = config.zones[displayZoneCursor];
    int moisture = isValidHaraPortIndex(zone.index)
      ? zoneSoilMoisture[zone.index]
      : -1;
    int stateIdx = findZoneStateIndex(zone.index);
    String servoState = stateIdx >= 0 && zoneStates[stateIdx].targetState == "OPEN"
      ? "ABR"
      : "FCH";
    line1 = "S" + String(zone.index + 1);
    if (moisture >= 0) {
      line1 += " U:" + String(moisture) + "% ";
    } else {
      line1 += " SENSOR OFF ";
    }
    line1 += servoState;
    displayZoneCursor = (displayZoneCursor + 1) % config.zoneCount;
  }

  String line2;
  if (WiFi.status() != WL_CONNECTED) {
    line2 = "WiFi offline";
  } else if (!hasDeviceCredentials()) {
    line2 = "Sem registro";
  } else if (!apiReady) {
    line2 = "API HTTP " + String(lastHttpCode);
  } else {
    line2 = pumpOn ? "B:ON  WiFi:OK" : "B:OFF WiFi:OK";
  }
  showStatus(line1, line2);
}

// ============================================================
// SETUP
// ============================================================

void setupWatchdog() {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  esp_task_wdt_config_t wdtConfig;
  wdtConfig.timeout_ms = WDT_TIMEOUT_SEC * 1000;
  wdtConfig.idle_core_mask = 0;
  wdtConfig.trigger_panic = true;
  esp_err_t result = esp_task_wdt_reconfigure(&wdtConfig);
  if (result == ESP_ERR_INVALID_STATE) {
    result = esp_task_wdt_init(&wdtConfig);
  }
#else
  esp_err_t result = esp_task_wdt_init(WDT_TIMEOUT_SEC, true);
#endif
  if (result != ESP_OK && result != ESP_ERR_INVALID_STATE) {
    Serial.printf("Falha ao configurar watchdog: %d\n", result);
  }
  if (esp_task_wdt_status(NULL) != ESP_OK) {
    esp_task_wdt_add(NULL);
  }
}

void setup() {
  // Desliga o rele antes de inicializar display, Serial ou Wi-Fi.
  pinMode(PUMP_RELAY_PIN, OUTPUT);
  setPump(false);

  Serial.begin(115200);
  lcd.begin(16, 2);
  showStatus("Hara Tech", "Inicializando");

  for (int i = 0; i < HARA_PORT_COUNT; i++) {
    pinMode(SOIL_SENSOR_GPIO_PINS[i], INPUT);
    analogSetPinAttenuation(SOIL_SENSOR_GPIO_PINS[i], ADC_11db);
  }
  analogReadResolution(12);

  chipId = getChipId();
  loadCredentials();
  loadCompletedCommands();
  bootTimeMs = millis();
  connectWifiPortal();
  if (WiFi.status() == WL_CONNECTED) {
    ensureDeviceRegistered();
    sendHeartbeat();
    syncConfigFromApi();
  }

  // O portal do WiFiManager pode ficar aberto por ate 180 segundos.
  // Ative o watchdog somente depois dele terminar para evitar reinicios
  // enquanto o usuario informa a rede Wi-Fi.
  setupWatchdog();
}

// ============================================================
// LOOP PRINCIPAL
// ============================================================

void loop() {
  unsigned long now = millis();

  updateServoMovements(now);
  maintainWifi();
  if (WiFi.status() == WL_CONNECTED) {
    ensureDeviceRegistered();
  }

  if (now - lastSensorReadAt >= SENSOR_INTERVAL_MS) {
    lastSensorReadAt = now;
    readConfiguredSoilMoisture();
    applyIrrigationControl();
    applyPumpSafety();
  }

  if (WiFi.status() == WL_CONNECTED &&
      hasDeviceCredentials() &&
      now - lastHeartbeatAt >= (unsigned long)config.heartbeatIntervalSeconds * 1000) {
    lastHeartbeatAt = now;
    sendHeartbeat();
  }

  if (WiFi.status() == WL_CONNECTED &&
      hasDeviceCredentials() &&
      now - lastConfigSyncAt >= (unsigned long)config.configSyncIntervalSeconds * 1000) {
    lastConfigSyncAt = now;
    syncConfigFromApi();
  }

  if (WiFi.status() == WL_CONNECTED &&
      hasDeviceCredentials() &&
      now - lastTelemetryAt >= (unsigned long)config.telemetryIntervalSeconds * 1000) {
    lastTelemetryAt = now;
    sendTelemetryToApi();
  }

  if (WiFi.status() == WL_CONNECTED &&
      hasDeviceCredentials() &&
      now - lastCommandPollAt >= COMMAND_INTERVAL_MS) {
    lastCommandPollAt = now;
    checkPendingCommands();
  }

  if (now - lastDisplayAt >= DISPLAY_INTERVAL_MS) {
    lastDisplayAt = now;
    updateDisplay();
  }

  esp_task_wdt_reset();
}
