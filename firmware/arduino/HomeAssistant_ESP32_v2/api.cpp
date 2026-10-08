#include "modules.h"
#include "secrets_config.h"
#include "src/core/json.h"
#include <WiFi.h>
#include <esp_system.h>
WebServer server(80);
static const char *headers[] = {"Authorization", "Origin", "Content-Type"};
static void responseHeaders() {
  server.sendHeader("Cache-Control", "no-store");
  server.sendHeader("X-Content-Type-Options", "nosniff");
  if (strlen(HOME_ALLOWED_ORIGIN) &&
      server.header("Origin") == HOME_ALLOWED_ORIGIN) {
    server.sendHeader("Access-Control-Allow-Origin", HOME_ALLOWED_ORIGIN);
    server.sendHeader("Vary", "Origin");
  }
}
void apiSend(JsonDocument &doc, int status) {
  responseHeaders();
  if (doc.overflowed()) {
    server.send(503, "application/json",
                "{\"error\":{\"message\":\"Nedostatek paměti API.\"}}");
    return;
  }
  // Avoid a second full history-sized allocation; batch TCP writes.
  class BufferedClient : public Print {
    WiFiClient client;
    uint8_t buffer[512];
    size_t used = 0;

  public:
    explicit BufferedClient(WiFiClient c) : client(c) {}
    void flush() {
      if (used) {
        client.write(buffer, used);
        used = 0;
      }
    }
    size_t write(uint8_t c) override {
      buffer[used++] = c;
      if (used == sizeof(buffer))
        flush();
      return 1;
    }
  } output(server.client());
  server.setContentLength(measureJson(doc));
  server.send(status, "application/json; charset=utf-8", "");
  serializeJson(doc, output);
  output.flush();
}
void apiError(int status, const char *code, const char *message) {
  JsonDocument doc;
  doc["apiVersion"] = 1;
  doc["error"]["code"] = code;
  doc["error"]["message"] = message;
  apiSend(doc, status);
}
bool apiAuthorize() {
  if (strlen(HOME_API_TOKEN) < 32) {
    apiError(503, "not_configured", "API klíč není nakonfigurován.");
    return false;
  }
  String origin = server.header("Origin");
  if (origin.length() &&
      (!strlen(HOME_ALLOWED_ORIGIN) || origin != HOME_ALLOWED_ORIGIN)) {
    apiError(403, "origin", "Tento původ není povolen.");
    return false;
  }
  String expected = String("Bearer ") + HOME_API_TOKEN;
  if (!logic::constantEqual(server.header("Authorization").c_str(),
                            expected.c_str())) {
    apiError(401, "unauthorized", "Přístup vyžaduje platný API klíč.");
    return false;
  }
  return true;
}
static void stamp(JsonObject object, uint64_t ms, uint64_t now, bool valid) {
  object["available"] = valid && now >= ms && now - ms <= cfg::StaleMs;
  object["stale"] = !valid || now < ms || now - ms > cfg::StaleMs;
  if (ms)
    object["ageMs"] = now >= ms ? now - ms : 0;
  else
    object["ageMs"] = nullptr;
}
void writeClimate(JsonObject o, const logic::Climate &c, uint64_t now) {
  logic::climateJson(o, c, now, cfg::StaleMs);
  if (c.lastSuccessMs && isoTime().length()) {
    time_t epoch =
        time(nullptr) - static_cast<time_t>((now - c.lastSuccessMs) / 1000);
    struct tm t;
    gmtime_r(&epoch, &t);
    char text[25];
    strftime(text, sizeof(text), "%Y-%m-%dT%H:%M:%SZ", &t);
    o["readingTimestamp"] = text;
  } else
    o["readingTimestamp"] = nullptr;
}
void writeSolar(JsonObject o, const State &s, uint64_t now) {
  stamp(o, s.solar.lastSuccessMs, now, s.solar.valid);
  bool valid = o["available"].as<bool>();
  nullable(o["voltageV"], valid ? s.solar.bus : logic::missing());
  nullable(o["shuntVoltageMv"], valid ? s.solar.shunt : logic::missing());
  nullable(o["currentMa"], valid ? s.solar.currentMa : logic::missing());
  nullable(o["rawCurrentMa"], valid ? s.solar.rawCurrentMa : logic::missing());
  nullable(o["minPowerW"], s.solar.minimum);
  nullable(o["maxPowerW"], s.solar.maximum);
  o["extremaScope"] = "since_boot";
  nullable(o["energyTotalWh"],
           cfg::SolarDirectionConfirmed ? s.energy.totalWh : logic::missing());
  o["totalScope"] = "monitored_signed_energy_since_installation";
  nullable(o["currentA"],
           valid ? s.solar.currentMa / 1000.0f : logic::missing());
  nullable(o["powerW"], valid ? s.solar.power : logic::missing());
  nullable(o["energyTodayWh"], cfg::SolarDirectionConfirmed && s.energy.day &&
                                       s.energy.day == localDay()
                                   ? s.energy.wh
                                   : logic::missing());
  o["energyPartial"] = s.energy.partial;
  if (s.energy.day)
    o["energyDay"] = String(s.energy.day);
  else
    o["energyDay"] = nullptr;
  o["directionConfirmed"] = cfg::SolarDirectionConfirmed;
  o["measurementLocation"] = cfg::SolarLocation;
  o["errors"] = s.solar.errors;
}
void writeRelay(JsonObject o, const State &s, uint8_t channel) {
  const auto &relay = channel == 1 ? s.relay : s.relay2;
  o["commandedOn"] = relay.on;
  o["version"] = relay.version;
  o["controlAvailable"] = (cfg::RelayActiveLevel >= 0) && !s.ota;
  o["feedbackAvailable"] = false;
  o["physicalOn"] = nullptr;
  o["acknowledgement"] = "gpio_command_only";
  o["appliedUptimeMs"] = s.relayAppliedMs;
}
void writePower(JsonObject o, const State &s) {
  o["activeSource"] = logic::sourceName(s.power);
  o["statusInstalled"] = cfg::TpsStatusInstalled;
  o["backupVerified"] = cfg::TpsLowIsVerifiedBackup;
  o["statusLowAmbiguous"] =
      cfg::TpsStatusInstalled && s.power != logic::Source::Mains;
  o["batteryVoltageV"] = nullptr;
  o["batterySocPct"] = nullptr;
  o["batteryCurrentA"] = nullptr;
  o["batteryChargeStatus"] = nullptr;
  o["switching"] = "hardware_controlled";
  o["tabletPower"] = "independent_mains";
}
void writeSystem(JsonObject o, const State &s) {
  o["firmwareVersion"] = cfg::FirmwareVersion;
  o["buildTimestamp"] = __DATE__ " " __TIME__;
  o["freeHeapBytes"] = ESP.getFreeHeap();
  o["uptimeSeconds"] = monotonicMs() / 1000;
  o["wifiConnected"] = WiFi.status() == WL_CONNECTED;
  if (WiFi.status() == WL_CONNECTED) {
    o["wifiRssiDbm"] = WiFi.RSSI();
    o["ip"] = WiFi.localIP().toString();
  } else {
    o["wifiRssiDbm"] = nullptr;
    o["ip"] = nullptr;
  }
  o["rebootReason"] = static_cast<int>(esp_reset_reason());
  o["timeSynchronized"] = isoTime().length() > 0;
  o["storageReady"] = s.storageReady;
  o["otaEnabled"] = HOME_OTA_ENABLED && strlen(HOME_OTA_PASSWORD) >= 16;
  o["otaInProgress"] = s.ota;
  o["hostname"] = cfg::Hostname;
}
void writeState(JsonDocument &doc, const State &s) {
  doc["apiVersion"] = 1;
  doc["deviceId"] = cfg::Hostname;
  doc["bootId"] = s.bootId;
  auto timestamp = isoTime();
  if (timestamp.length())
    doc["timestamp"] = timestamp;
  else
    doc["timestamp"] = nullptr;
  doc["uptimeSeconds"] = monotonicMs() / 1000;
  writeClimate(doc["climate"]["indoor"].to<JsonObject>(), s.indoor,
               monotonicMs());
  writeClimate(doc["climate"]["outdoor"].to<JsonObject>(), s.outdoor,
               monotonicMs());
  writeSolar(doc["solar"].to<JsonObject>(), s, monotonicMs());
  writeRelay(doc["lighting"]["kitchenLed"].to<JsonObject>(), s);
  writeRelay(doc["relays"]["1"].to<JsonObject>(), s, 1);
  writeRelay(doc["relays"]["2"].to<JsonObject>(), s, 2);
  writePower(doc["power"].to<JsonObject>(), s);
  writeSystem(doc["system"].to<JsonObject>(), s);
}
void apiBegin() {
  server.collectHeaders(headers, 3);
  for (const char *path :
       {"/api/state", "/api/climate", "/api/solar", "/api/relay", "/api/power",
        "/api/system", "/api/health", "/api/version", "/api/history",
        "/api/relays", "/api/relays/1", "/api/relays/2"}) {
    server.on(path, HTTP_OPTIONS, []() {
      if (!strlen(HOME_ALLOWED_ORIGIN) ||
          server.header("Origin") != HOME_ALLOWED_ORIGIN) {
        apiError(403, "origin", "Původ není povolen.");
        return;
      }
      responseHeaders();
      server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      server.sendHeader("Access-Control-Allow-Headers",
                        "Authorization, Content-Type");
      server.send(204);
    });
    String route(path);
    if (route == "/api/relays/1" || route == "/api/relays/2")
      continue;
    server.on(path, HTTP_GET, [route]() {
      if (!apiAuthorize())
        return;
      JsonDocument doc;
      auto s = snapshot();
      writeState(doc, s);
      if (route == "/api/history") {
        doc.clear();
        doc["apiVersion"] = 1;
        unsigned limit = cfg::HistoryCapacity;
        if (server.hasArg("limit")) {
          String v = server.arg("limit");
          for (unsigned i = 0; i < v.length(); ++i)
            if (!isdigit(v[i])) {
              apiError(400, "limit", "Neplatný limit historie.");
              return;
            }
          limit = v.toInt();
          if (limit < 1 || limit > cfg::HistoryCapacity) {
            apiError(400, "limit", "Limit historie je 1–288.");
            return;
          }
        }
        writeHistory(doc, limit);
      } else if (route == "/api/health") {
        doc.clear();
        doc["apiVersion"] = 1;
        doc["status"] = "ok";
        doc["uptimeSeconds"] = monotonicMs() / 1000;
        doc["sensorDegraded"] =
            !s.indoor.valid || !s.outdoor.valid || !s.solar.valid ||
            monotonicMs() - s.indoor.lastSuccessMs > cfg::StaleMs ||
            monotonicMs() - s.outdoor.lastSuccessMs > cfg::StaleMs ||
            monotonicMs() - s.solar.lastSuccessMs > cfg::StaleMs;
        doc["storageReady"] = s.storageReady;
      } else if (route == "/api/version") {
        doc.clear();
        doc["apiVersion"] = 1;
        doc["firmwareVersion"] = cfg::FirmwareVersion;
        doc["buildTimestamp"] = __DATE__ " " __TIME__;
      }
      // Other GETs share the same versioned envelope, with only their requested
      // section.
      else if (route != "/api/state") {
        const char *section = route == "/api/climate"  ? "climate"
                              : route == "/api/solar"  ? "solar"
                              : route == "/api/relay"  ? "lighting"
                              : route == "/api/relays" ? "relays"
                              : route == "/api/power"  ? "power"
                                                       : "system";
        for (const char *name :
             {"climate", "solar", "lighting", "relays", "power", "system"})
          if (strcmp(name, section))
            doc.remove(name);
      }
      apiSend(doc);
    });
  }
  server.on("/api/relay", HTTP_POST, []() { relayPost(1); });
  server.on("/api/relays/1", HTTP_POST, []() { relayPost(1); });
  server.on("/api/relays/2", HTTP_POST, []() { relayPost(2); });
  server.onNotFound(
      []() { apiError(404, "not_found", "Endpoint neexistuje."); });
  server.begin();
}
void apiTick() { server.handleClient(); }
