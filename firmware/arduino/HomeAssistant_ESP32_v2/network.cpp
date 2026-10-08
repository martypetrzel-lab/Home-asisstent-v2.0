#include "modules.h"
#include "secrets_config.h"
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include <WiFi.h>
#include <esp_task_wdt.h>
static bool connected = false, otaStarted = false;
static uint64_t retryAt = 0;
static unsigned backoff = 2000;
static_assert(
    !(HOME_OTA_ENABLED && cfg::RelayRestoreOnBoot),
    "OTA requires RelayRestoreOnBoot=false to guarantee OFF after update");
void networkBegin() {
  retryAt = monotonicMs() + 10000;
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(cfg::Hostname);
  WiFi.setAutoReconnect(false);
  if (strlen(HOME_WIFI_SSID))
    WiFi.begin(HOME_WIFI_SSID, HOME_WIFI_PASSWORD);
  configTzTime(cfg::Timezone, cfg::Ntp1, cfg::Ntp2);
}
void networkTick() {
  bool up = WiFi.status() == WL_CONNECTED;
  if (up && !connected) {
    connected = true;
    backoff = 2000;
    MDNS.end();
    if (MDNS.begin(cfg::Hostname))
      MDNS.addService("http", "tcp", 80);
    addEvent("wifi", "Wi-Fi připojeno");
    Serial.print("LAN IP: ");
    Serial.println(WiFi.localIP());
    if (HOME_OTA_ENABLED && strlen(HOME_OTA_PASSWORD) >= 16) {
      ArduinoOTA.setHostname(cfg::Hostname);
      ArduinoOTA.setPassword(HOME_OTA_PASSWORD);
      ArduinoOTA.onProgress(
          [](unsigned int, unsigned int) { esp_task_wdt_reset(); });
      ArduinoOTA.onStart([]() { forceRelayOffForOta(); });
      ArduinoOTA.onError([](ota_error_t) {
        addEvent("ota", "Aktualizace selhala; relé zůstává vypnuté");
      });
      ArduinoOTA.begin();
      otaStarted = true;
    }
  }
  if (!up && connected) {
    connected = false;
    MDNS.end();
    addEvent("wifi", "Wi-Fi odpojeno");
  }
  if (!up && strlen(HOME_WIFI_SSID) && monotonicMs() >= retryAt) {
    WiFi.disconnect(false, false);
    WiFi.begin(HOME_WIFI_SSID, HOME_WIFI_PASSWORD);
    retryAt = monotonicMs() + backoff;
    backoff = std::min(backoff * 2, 60000u);
  }
  if (up && otaStarted)
    ArduinoOTA.handle();
}
