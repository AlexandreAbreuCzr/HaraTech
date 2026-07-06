#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <LiquidCrystal.h>

LiquidCrystal lcd(23, 22, 21, 19, 18, 5);
Preferences prefs;
WiFiClient plainClient;
WiFiClientSecure secureClient;

const char* API_URL = "https://hara-tech-api.onrender.com/api/v1";
const char* PROVISIONING_SECRET = "troque-por-um-segredo-forte-com-pelo-menos-32-caracteres";//TROQUE_PELO_DEVICE_PROVISIONING_SECRET;

const int SOIL_SENSOR_PIN = 34;
const int PUMP_RELAY_PIN = 26;
const bool PUMP_ACTIVE_HIGH = true;

const int SOIL_RAW_DRY = 4095;
const int SOIL_RAW_WET = 1200;
const int MOISTURE_HYSTERESIS = 5;

const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
const unsigned long REGISTER_RETRY_INTERVAL_MS = 30000;
const unsigned long HEARTBEAT_INTERVAL_MS = 60000;
const unsigned long SENSOR_INTERVAL_MS = 2000;
const unsigned long DISPLAY_INTERVAL_MS = 2000;
const unsigned long CONFIG_SYNC_INTERVAL_MS = 300000;
const unsigned long TELEMETRY_INTERVAL_MS = 60000;
const unsigned long COMMAND_INTERVAL_MS = 30000;
const uint16_t HTTP_TIMEOUT_MS = 10000;

const int MAX_ZONES = 16;
const int SERVO_FREQ = 50;
const int SERVO_RESOLUTION = 12;
const int SERVO_PERIOD_US = 20000;

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
int lastHttpCode = 0;
bool pumpOn = false;
bool apiReady = false;

struct ActuatorCfg {
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
  int telemetryIntervalSeconds;
  String pumpMode;
  int maxSimultaneousZones;
  ZoneCfg zones[MAX_ZONES];
  int zoneCount;
};

struct ZoneState {
  int index;
  int currentAngle;
  String appliedState;
  bool servoAttached;
};

DeviceCfg config = { 0, "auto", 35, 60, "auto", 0, {}, 0 };
ZoneState zoneStates[MAX_ZONES];
int zoneStateCount = 0;

String getChipId() {
  return String((uint32_t)ESP.getEfuseMac(), HEX);
}

bool isProvisioningSecretConfigured() {
  return String(PROVISIONING_SECRET).length() > 0 &&
         String(PROVISIONING_SECRET) != "TROQUE_PELO_DEVICE_PROVISIONING_SECRET";
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

bool connectWifiPortal() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  WiFiManager wm;
  wm.setConfigPortalTimeout(180);
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
  String newDeviceId = res["deviceId"] | "";
  String newDeviceToken = res["deviceToken"] | "";
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
  String response = http.getString();
  http.end();
  if (code == 200) {
    apiReady = true;
    return true;
  }
  apiReady = false;
  Serial.printf("Heartbeat falhou. HTTP %d\n", code);
  if (code == 401) {
    Serial.println("Token invalido. Rotacionando token do device.");
    deviceToken = "";
    registerDevice(true);
  }
  return false;
}

int readSoilMoisture() {
  int raw = analogRead(SOIL_SENSOR_PIN);
  int percent = map(raw, SOIL_RAW_DRY, SOIL_RAW_WET, 0, 100);
  return constrain(percent, 0, 100);
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

void applyServoAngle(int gpio, int angle, int minPulseUs, int maxPulseUs, bool inverted) {
  int effectiveAngle = inverted ? (180 - angle) : angle;
  int pulseUs = angleToPulseUs(effectiveAngle, minPulseUs, maxPulseUs);
  int duty = pulseUsToDuty(pulseUs);
  ledcWrite(gpio, duty);
}

void setupZoneServo(int gpio, int minPulseUs, int maxPulseUs) {
  ledcAttach(gpio, SERVO_FREQ, SERVO_RESOLUTION);
  int initialPulseUs = constrain(minPulseUs, 500, 2500);
  int initialDuty = pulseUsToDuty(initialPulseUs);
  ledcWrite(gpio, initialDuty);
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
    zoneStates[pos].currentAngle = -1;
    zoneStates[pos].appliedState = "UNKNOWN";
    zoneStates[pos].servoAttached = false;
    zoneStateCount++;
    return pos;
  }
  return -1;
}

void setZoneDesiredState(int zoneIndex, const String& desiredState) {
  for (int i = 0; i < config.zoneCount; i++) {
    if (config.zones[i].index == zoneIndex) {
      config.zones[i].desiredState = desiredState;
      return;
    }
  }
}

void applyZonesFromConfig() {
  for (int i = 0; i < config.zoneCount; i++) {
    ZoneCfg& zone = config.zones[i];
    if (!zone.enabled || !zone.hasActuator) {
      continue;
    }
    int gpio = zone.actuator.channel;
    int targetAngle = (zone.desiredState == "OPEN")
      ? zone.actuator.openAngle
      : zone.actuator.closedAngle;
    int stateIdx = zoneIndexToStateIndex(zone.index);
    if (!zoneStates[stateIdx].servoAttached) {
      setupZoneServo(gpio, zone.actuator.minPulseUs, zone.actuator.maxPulseUs);
      zoneStates[stateIdx].servoAttached = true;
    }
    applyServoAngle(gpio, targetAngle,
      zone.actuator.minPulseUs, zone.actuator.maxPulseUs,
      zone.actuator.inverted);
    zoneStates[stateIdx].currentAngle = targetAngle;
    zoneStates[stateIdx].appliedState = zone.desiredState;
  }
}

void applyIrrigationControl() {
  if (config.pumpMode == "FORCED_ON") {
    setPump(true);
    return;
  }
  if (config.pumpMode == "FORCED_OFF") {
    setPump(false);
    return;
  }
  if (config.operationMode == "OFF") {
    setPump(false);
    return;
  }
  if (config.operationMode != "AUTO") {
    return;
  }
  if (!pumpOn && soilMoisture < config.moistureLimit) {
    setPump(true);
  }
  if (pumpOn && soilMoisture > config.moistureLimit + MOISTURE_HYSTERESIS) {
    setPump(false);
  }
}

void applyPumpSafety() {
  if (!pumpOn) {
    return;
  }
  if (config.maxSimultaneousZones > 0) {
    int openZones = 0;
    for (int i = 0; i < config.zoneCount; i++) {
      if (config.zones[i].enabled && config.zones[i].desiredState == "OPEN") {
        openZones++;
      }
    }
    if (openZones == 0) {
      setPump(false);
    }
  }
}

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
    return false;
  }
  String response = http.getString();
  http.end();
  DynamicJsonDocument doc(4096);
  DeserializationError error = deserializeJson(doc, response);
  if (error) {
    Serial.printf("JSON invalido no config: %s\n", error.c_str());
    return false;
  }
  config.operationMode = doc["operationMode"] | "AUTO";
  config.moistureLimit = doc["moistureThreshold"] | 35;
  config.telemetryIntervalSeconds = doc["telemetryIntervalSeconds"] | 60;
  config.pumpMode = doc["pumpMode"] | "AUTO";
  config.maxSimultaneousZones = doc["maxSimultaneousZones"] | 0;
  int newVersion = doc["configVersion"] | 0;
  JsonArray zonesArray = doc["zones"].as<JsonArray>();
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
  StaticJsonDocument<1024> doc;
  doc["soilMoisture"] = soilMoisture;
  doc["pumpOn"] = pumpOn;
  doc["firmwareTimestampMs"] = millis();
  doc["rssi"] = WiFi.RSSI();
  doc["lastIp"] = WiFi.localIP().toString();
  doc["uptimeSeconds"] = (millis() - bootTimeMs) / 1000;
  doc["firmwareVersion"] = "1.0.0";
  if (config.zoneCount > 0) {
    JsonArray zonesArray = doc.createNestedArray("zones");
    for (int i = 0; i < config.zoneCount; i++) {
      JsonObject z = zonesArray.createNestedObject();
      int stateIdx = zoneIndexToStateIndex(config.zones[i].index);
      z["zoneIndex"] = config.zones[i].index;
      z["desiredState"] = config.zones[i].desiredState;
      z["appliedState"] = zoneStates[stateIdx].appliedState;
      z["servoAngle"] = zoneStates[stateIdx].currentAngle;
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
  if (code == 401) {
    deviceToken = "";
    registerDevice(true);
  }
  return false;
}

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
    return false;
  }
  String response = http.getString();
  http.end();
  DynamicJsonDocument doc(2048);
  DeserializationError error = deserializeJson(doc, response);
  if (error) {
    return false;
  }
  JsonArray commands = doc["commands"].as<JsonArray>();
  if (commands.size() == 0) {
    return true;
  }
  for (JsonObject cmd : commands) {
    const char* cmdId = cmd["id"];
    const char* cmdType = cmd["type"];
    JsonObject payload = cmd["payload"];
    bool success = executeCommand(cmdType, payload);
    acknowledgeCommand(cmdId, success, success ? "" : "Falha na execucao");
  }
  return true;
}

bool executeCommand(const char* type, JsonObject payload) {
  Serial.printf("Executando comando: %s\n", type);
  if (strcmp(type, "SYNC_CONFIG") == 0) {
    return syncConfigFromApi();
  }
  if (strcmp(type, "RESTART") == 0) {
    delay(500);
    ESP.restart();
    return true;
  }
  if (strcmp(type, "PUMP_ON") == 0) {
    config.pumpMode = "FORCED_ON";
    setPump(true);
    return true;
  }
  if (strcmp(type, "PUMP_OFF") == 0) {
    setPump(false);
    config.pumpMode = "FORCED_OFF";
    return true;
  }
  if (strcmp(type, "OPEN_ZONE") == 0 && !payload.isNull()) {
    int zoneIndex = payload["zoneIndex"] | -1;
    if (zoneIndex >= 0) {
      setZoneDesiredState(zoneIndex, "OPEN");
      applyZonesFromConfig();
      applyPumpSafety();
      return true;
    }
    return false;
  }
  if (strcmp(type, "CLOSE_ZONE") == 0 && !payload.isNull()) {
    int zoneIndex = payload["zoneIndex"] | -1;
    if (zoneIndex >= 0) {
      setZoneDesiredState(zoneIndex, "CLOSED");
      applyZonesFromConfig();
      applyPumpSafety();
      return true;
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
  HTTPClient http;
  if (!beginHttp(http, "/devices/" + deviceId + "/commands/" + String(commandId) + "/ack")) {
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  addDeviceAuthHeader(http);
  StaticJsonDocument<256> doc;
  doc["success"] = success;
  if (!success && failReason.length() > 0) {
    doc["failReason"] = failReason;
  }
  String body;
  serializeJson(doc, body);
  int code = http.POST(body);
  http.end();
  return code == 200;
}

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

void setup() {
  Serial.begin(115200);
  lcd.begin(16, 2);
  showStatus("Hara Tech", "Inicializando");
  pinMode(SOIL_SENSOR_PIN, INPUT);
  pinMode(PUMP_RELAY_PIN, OUTPUT);
  setPump(false);
  chipId = getChipId();
  loadCredentials();
  bootTimeMs = millis();
  connectWifiPortal();
  if (WiFi.status() == WL_CONNECTED) {
    ensureDeviceRegistered();
    sendHeartbeat();
    syncConfigFromApi();
  }
}

void loop() {
  unsigned long now = millis();
  maintainWifi();
  if (WiFi.status() == WL_CONNECTED) {
    ensureDeviceRegistered();
  }
  if (now - lastSensorReadAt >= SENSOR_INTERVAL_MS) {
    lastSensorReadAt = now;
    soilMoisture = readSoilMoisture();
    applyIrrigationControl();
    applyPumpSafety();
  }
  if (WiFi.status() == WL_CONNECTED &&
      hasDeviceCredentials() &&
      now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatAt = now;
    sendHeartbeat();
  }
  if (WiFi.status() == WL_CONNECTED &&
      hasDeviceCredentials() &&
      now - lastConfigSyncAt >= CONFIG_SYNC_INTERVAL_MS) {
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
}
