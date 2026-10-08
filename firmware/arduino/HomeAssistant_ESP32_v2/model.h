#pragma once
#include "config.h"
#include "src/core/logic.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <esp_timer.h>
struct Solar {
  float bus = logic::missing(), shunt = logic::missing(),
        currentMa = logic::missing(), power = logic::missing(),
        rawCurrentMa = logic::missing(), minimum = logic::missing(),
        maximum = logic::missing();
  bool valid = false;
  uint64_t lastSuccessMs = 0;
  unsigned errors = 0;
};
struct State {
  logic::Climate indoor, outdoor;
  Solar solar;
  logic::Energy energy;
  logic::RelayState relay, relay2;
  logic::Source power = logic::Source::Unknown;
  uint64_t relayAppliedMs = 0;
  bool ota = false, storageReady = false;
  char bootId[17] = {};
};
extern State state;
extern SemaphoreHandle_t stateMutex;
inline uint64_t monotonicMs() { return esp_timer_get_time() / 1000; }
inline State snapshot() {
  xSemaphoreTake(stateMutex, portMAX_DELAY);
  State copy = state;
  xSemaphoreGive(stateMutex);
  return copy;
}
String isoTime();
int localDay();
template <typename Target> inline void nullable(Target target, double value) {
  if (std::isfinite(value))
    target.set(value);
  else
    target.set(nullptr);
}
void addEvent(const char *kind, const char *detail);
