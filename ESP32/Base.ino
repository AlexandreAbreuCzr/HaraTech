#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <LiquidCrystal.h>

LiquidCrystal lcd(23, 22, 21, 19, 18, 5);

Preferences prefs;

String API_URL = "http://SEU_SERVIDOR/api";
String deviceId = "";

void conectarWifi() {

  WiFiManager wm;

  bool ok = wm.autoConnect("HARA_SETUP");

  if (!ok) {
    ESP.restart();
  }

  lcd.clear();
  lcd.print("WiFi OK");

  delay(1000);
}

void carregarDeviceId() {

  prefs.begin("hara", false);

  deviceId = prefs.getString("deviceId", "");

  prefs.end();
}

void salvarDeviceId(String id) {

  prefs.begin("hara", false);

  prefs.putString("deviceId", id);

  prefs.end();
}

bool registrarDispositivo() {

  HTTPClient http;

  http.begin(API_URL + "/devices/register");

  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(256);

  doc["chipId"] = String((uint32_t)ESP.getEfuseMac(), HEX);

  String body;

  serializeJson(doc, body);

  int code = http.POST(body);

  if (code != 200) {
    http.end();
    return false;
  }

  String response = http.getString();

  DynamicJsonDocument res(512);

  deserializeJson(res, response);

  deviceId = res["deviceId"].as<String>();

  salvarDeviceId(deviceId);

  http.end();

  return true;
}

void heartbeat() {

  if (deviceId == "") return;

  HTTPClient http;

  http.begin(API_URL + "/devices/" + deviceId + "/heartbeat");

  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(256);

  doc["ip"] = WiFi.localIP().toString();

  doc["rssi"] = WiFi.RSSI();

  String body;

  serializeJson(doc, body);

  http.POST(body);

  http.end();
}

void setup() {

  Serial.begin(115200);

  lcd.begin(16, 2);

  lcd.print("Hara Tech");

  delay(1500);

  conectarWifi();

  carregarDeviceId();

  if (deviceId == "") {

    lcd.clear();
    lcd.print("Registrando");

    if (registrarDispositivo()) {

      lcd.clear();
      lcd.print("ID:");
      lcd.setCursor(0, 1);
      lcd.print(deviceId);

    } else {

      lcd.clear();
      lcd.print("Erro API");

      while (true);
    }
  }

  delay(2000);

  lcd.clear();
}

unsigned long ultimoHeartbeat = 0;

void loop() {

  if (millis() - ultimoHeartbeat > 60000) {

    heartbeat();

    ultimoHeartbeat = millis();

    lcd.clear();

    lcd.print("Online");

    lcd.setCursor(0, 1);

    lcd.print(deviceId);
  }
}
