#pragma once
#include "logic.h"
#include <ArduinoJson.h>
#include <cctype>
#include <cstring>
namespace logic {
template <typename Target> inline void jsonNumber(Target target, double value) {
  if (std::isfinite(value))
    target.set(value);
  else
    target.set(nullptr);
}
inline void climateJson(JsonObject o, const Climate &c, uint64_t now,
                        uint64_t staleMs) {
  bool valid =
      c.valid && now >= c.lastSuccessMs && now - c.lastSuccessMs <= staleMs;
  o["available"] = valid;
  o["stale"] = !valid;
  if (c.lastSuccessMs)
    o["ageMs"] = now >= c.lastSuccessMs ? now - c.lastSuccessMs : 0;
  else
    o["ageMs"] = nullptr;
  jsonNumber(o["temperatureC"], valid ? c.temperature : missing());
  jsonNumber(o["humidityPct"], valid ? c.humidity : missing());
  jsonNumber(o["minTemperatureC"], c.minimum);
  jsonNumber(o["maxTemperatureC"], c.maximum);
  jsonNumber(o["minHumidityPct"], c.minHumidity);
  jsonNumber(o["maxHumidityPct"], c.maxHumidity);
  o["errors"] = c.errors;
  o["extremaScope"] = "since_boot";
}
inline bool validCommand(const JsonDocument &input) {
  if (!input.is<JsonObjectConst>() || !input["state"].is<bool>())
    return false;
  for (JsonPairConst field : input.as<JsonObjectConst>())
    if (strcmp(field.key().c_str(), "state") &&
        strcmp(field.key().c_str(), "requestId") &&
        strcmp(field.key().c_str(), "expectedVersion") &&
        strcmp(field.key().c_str(), "bootId"))
      return false;
  if (!input["expectedVersion"].isUnbound() &&
      !input["expectedVersion"].is<uint32_t>())
    return false;
  if (!input["bootId"].isUnbound() && !input["bootId"].is<const char *>())
    return false;
  if (!input["requestId"].isUnbound()) {
    if (!input["requestId"].is<const char *>())
      return false;
    const char *id = input["requestId"];
    if (!strlen(id) || strlen(id) > 40)
      return false;
    for (unsigned i = 0; id[i]; ++i)
      if (!std::isalnum(static_cast<unsigned char>(id[i])) && id[i] != '-' &&
          id[i] != '_')
        return false;
  }
  return true;
}
} // namespace logic
