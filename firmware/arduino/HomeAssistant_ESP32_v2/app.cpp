#include "modules.h"
#include "src/core/json.h"
#include <esp_arduino_version.h>
#include <esp_system.h>
#include <esp_task_wdt.h>
State state;
SemaphoreHandle_t stateMutex;
String isoTime() {
  time_t now = time(nullptr);
  if (now < 1700000000)
    return String();
  struct tm t;
  gmtime_r(&now, &t);
  char text[25];
  strftime(text, sizeof(text), "%Y-%m-%dT%H:%M:%SZ", &t);
  return String(text);
}
int localDay() {
  time_t now = time(nullptr);
  if (now < 1700000000)
    return 0;
  struct tm t;
  localtime_r(&now, &t);
  return (t.tm_year + 1900) * 10000 + (t.tm_mon + 1) * 100 + t.tm_mday;
}

void firmwareSetup() {
  stateMutex = xSemaphoreCreateMutex();
  configASSERT(stateMutex);
  snprintf(state.bootId, sizeof(state.bootId), "%08lx%08lx",
           static_cast<unsigned long>(esp_random()),
           static_cast<unsigned long>(esp_random()));
  relayBegin(); // Before Serial, flash, network or sensor initialization.
  Serial.begin(115200);
  storageBegin();
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  esp_task_wdt_config_t watchdog{};
  watchdog.timeout_ms = 15000;
  watchdog.idle_core_mask = 0;
  watchdog.trigger_panic = true;
  if (esp_task_wdt_init(&watchdog) == ESP_ERR_INVALID_STATE)
    esp_task_wdt_reconfigure(&watchdog);
#else
  esp_task_wdt_init(15, true);
#endif
  esp_task_wdt_add(nullptr);
  configASSERT(xTaskCreatePinnedToCore(relayTask, "relay", 4096, nullptr, 3,
                                       nullptr, 1) == pdPASS);
  configASSERT(xTaskCreatePinnedToCore(sensorTask, "sensors", 6144, nullptr, 1,
                                       nullptr, 1) == pdPASS);
  configASSERT(xTaskCreatePinnedToCore(storageTask, "history", 6144, nullptr, 1,
                                       nullptr, 0) == pdPASS);
  networkBegin();
  apiBegin();
  configASSERT(xTaskCreatePinnedToCore(cloudTask, "cloud", 16384, nullptr, 1,
                                       nullptr, 0) == pdPASS);
  Serial.println("Home Assistant ESP32: spuštěno. Žádné přihlašovací údaje se "
                 "nevypisují.");
}
void firmwareLoop() {
  esp_task_wdt_reset();
  networkTick();
  apiTick();
  delay(2);
}
