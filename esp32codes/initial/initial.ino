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
const int SOIL_SENSOR_GPIO_PINS[HARA_PORT_COUNT] = {34, 35, 36};

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
const int MOISTURE_HYSTERESIS = 5;

// ============================================================
// TEMPOS E TIMEOUTS
// ============================================================
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
const unsigned long REGISTER_RETRY_INTERVAL_MS = 30000;
const unsigned long HEARTBEAT_INTERVAL_MS = 60000;
const unsigned long SENSOR_INTERVAL_MS = 2000;
const unsigned long DISPLAY_INTERVAL_MS = 2000;
const unsigned long CONFIG_SYNC_INTERVAL_MS = 300000;
const unsigned long TELEMETRY_INTERVAL_MS = 60000;
const unsigned long COMMAND_INTERVAL_MS = 30000;
const uint8_t COMMAND_ACK_MAX_ATTEMPTS = 3;
const unsigned long COMMAND_ACK_RETRY_DELAY_MS = 500;
const uint16_t HTTP_TIMEOUT_MS = 10000;
const unsigned long WDT_TIMEOUT_SEC = 30;

const int MAX_ZONES = HARA_PORT_COUNT;
const int SERVO_FREQ = 50;
const int SERVO_RESOLUTION = 12;
const int SERVO_PERIOD_US = 20000;
const int SERVO_STEP_DEGREES = 1;
const unsigned long SERVO_STEP_INTERVAL_MS = 20;
const unsigned long SERVO_MOVE_TIMEOUT_MS = 6000;

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

int soilMoisture = 0;
int zoneSoilMoisture[HARA_PORT_COUNT] = {-1, -1, -1};
bool hasMoistureReading = false;
int lastHttpCode = 0;
bool pumpOn = false;
bool apiReady = false;
bool restartRequested = false;

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
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(line2.substring(0, 16));
}

// ============================================================
// PERSISTENCIA (Preferences NVS)
// ============================================================

void loadCredentials() {
  prefs.begin("hara", false);
  deviceId = prefs.getString("deviceId", "");
  deviceToken = prefs.getString("deviceToken", "");
  config.configVersion = prefs.getInt("configVersion", 0);
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
  prefs.begin("hara", false);
  prefs.putInt("configVersion", version);
  config.configVersion = version;
  prefs.end();
}

void clearCredentials() {
  prefs.begin("hara", false);
  prefs.remove("deviceId");
  prefs.remove("deviceToken");
  prefs.remove("configVersion");
  prefs.end();
  deviceId = "";
  deviceToken = "";
  config.configVersion = 0;
  apiReady = false;
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

int readSoilMoisture(int gpio) {
  int raw = analogRead(gpio);
  int percent = map(raw, SOIL_RAW_DRY, SOIL_RAW_WET, 0, 100);
  return constrain(percent, 0, 100);
}

bool isValidHaraPortIndex(int zoneIndex) {
  return zoneIndex >= 0 && zoneIndex < HARA_PORT_COUNT;
}

bool isServoMappedToZone(int zoneIndex, int servoGpio) {
  return isValidHaraPortIndex(zoneIndex) &&
    SERVO_GPIO_PINS[zoneIndex] == servoGpio;
}

void readConfiguredSoilMoisture() {
  for (int i = 0; i < HARA_PORT_COUNT; i++) {
    zoneSoilMoisture[i] = -1;
  }

  int total = 0;
  int readingCount = 0;
  for (int i = 0; i < config.zoneCount; i++) {
    int portIndex = config.zones[i].index;
    if (!isValidHaraPortIndex(portIndex)) {
      continue;
    }
    int moisture = readSoilMoisture(SOIL_SENSOR_GPIO_PINS[portIndex]);
    zoneSoilMoisture[portIndex] = moisture;
    total += moisture;
    readingCount++;
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

void writeServoPwm(int gpio, int stateIndex, int duty) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(gpio, duty);
#else
  ledcWrite(stateIndex, duty);
#endif
}

void applyServoAngle(int stateIndex, int angle) {
  ZoneState& state = zoneStates[stateIndex];
  int effectiveAngle = state.inverted ? (180 - angle) : angle;
  int pulseUs = angleToPulseUs(effectiveAngle, state.minPulseUs, state.maxPulseUs);
  writeServoPwm(state.gpio, stateIndex, pulseUsToDuty(pulseUs));
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
  applyServoAngle(stateIndex, state.closedAngle);
  state.appliedState = "CLOSED";
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
    applyServoAngle(stateIndex, state.currentAngle);
    state.appliedState = "CLOSED";
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
    applyServoAngle(i, state.currentAngle);

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
  int stateIdx = zoneIndexToStateIndex(zoneIndex);
  if (stateIdx < 0 || !zoneStates[stateIdx].servoAttached) {
    return false;
  }

  unsigned long startedAt = millis();
  while (millis() - startedAt < SERVO_MOVE_TIMEOUT_MS) {
    unsigned long now = millis();
    updateServoMovements(now);
    ZoneState& state = zoneStates[stateIdx];
    if (state.currentAngle == state.targetAngle &&
        state.appliedState == state.targetState) {
      return true;
    }
    esp_task_wdt_reset();
    delay(5);
  }

  Serial.printf("Timeout ao mover o servo da zona %d.\n", zoneIndex);
  return false;
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
        !isServoMappedToZone(zone.index, zone.actuator.channel) ||
        zoneSoilMoisture[zone.index] < 0) {
      continue;
    }

    int moisture = zoneSoilMoisture[zone.index];
    if (moisture < config.moistureLimit && zone.desiredState != "OPEN") {
      zone.desiredState = "OPEN";
      zoneStateChanged = true;
    } else if (moisture > config.moistureLimit + MOISTURE_HYSTERESIS &&
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
  if (config.configVersion > 0) {
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
    return true;
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
  doc["soilMoisture"] = soilMoisture;
  doc["pumpOn"] = pumpOn;
  doc["firmwareTimestampMs"] = millis();
  doc["rssi"] = WiFi.RSSI();
  doc["lastIp"] = WiFi.localIP().toString();
  doc["uptimeSeconds"] = (millis() - bootTimeMs) / 1000;
  doc["firmwareVersion"] = "1.2.0";
  if (config.zoneCount > 0) {
    JsonArray zonesArray = doc.createNestedArray("zones");
    for (int i = 0; i < config.zoneCount; i++) {
      JsonObject z = zonesArray.createNestedObject();
      int stateIdx = zoneIndexToStateIndex(config.zones[i].index);
      z["zoneIndex"] = config.zones[i].index;
      z["desiredState"] = config.zones[i].desiredState;
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
  if (!hasDeviceCredentials()) {
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
    JsonObject payload = cmd["payload"];
    restartRequested = false;
    bool success = executeCommand(cmdType, payload);
    bool acknowledged = acknowledgeCommand(cmdId, success, success ? "" : "Falha na execucao");
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
    return syncConfigFromApi();
  }
  if (strcmp(type, "RESTART") == 0) {
    restartRequested = true;
    return true;
  }
  if (strcmp(type, "PUMP_ON") == 0) {
    config.pumpMode = "FORCED_ON";
    setPump(irrigationPathIsSafe());
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
    return false;
  }
  if (strcmp(type, "CLOSE_ZONE") == 0 && !payload.isNull()) {
    int zoneIndex = payload["zoneIndex"] | -1;
    if (zoneIndex >= 0 && setZoneDesiredState(zoneIndex, "CLOSED")) {
      applyZonesFromConfig();
      applyPumpSafety();
      return waitForZoneMovement(zoneIndex);
    }
    return false;
  }
  if (strcmp(type, "OTA_UPDATE") == 0) {
    Serial.println("OTA_UPDATE nao implementado neste firmware.");
    return false;
  }
  Serial.printf("Tipo de comando desconhecido: %s\n", type);
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
  String line1 = "Umi " + String(soilMoisture) + "% ";
  line1 += pumpOn ? "B:ON" : "B:OFF";
  String line2;
  if (WiFi.status() != WL_CONNECTED) {
    line2 = "WiFi offline";
  } else if (!hasDeviceCredentials()) {
    line2 = "Sem registro";
  } else if (!apiReady) {
    line2 = "API HTTP " + String(lastHttpCode);
  } else {
    line2 = deviceId + " v" + String(config.configVersion);
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
  }
  analogReadResolution(12);

  chipId = getChipId();
  loadCredentials();
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
