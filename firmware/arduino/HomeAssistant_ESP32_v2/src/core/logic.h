#pragma once
#include <cmath>
#include <cstdint>
#include <limits>
namespace logic {
inline float missing() { return std::numeric_limits<float>::quiet_NaN(); }
inline bool climateValid(float t, float h) {
  return std::isfinite(t) && std::isfinite(h) && t >= -40 && t <= 80 &&
         h >= 0 && h <= 100;
}
inline bool solarValid(float bus, float shunt, float current, bool io,
                       bool overflow) {
  return io && !overflow && std::isfinite(bus) && bus >= 0 && bus <= 26 &&
         std::isfinite(shunt) && std::abs(shunt) <= 320 &&
         std::isfinite(current) && std::abs(current) <= 3200;
}
inline float solarPower(float busV, float shuntMv, float currentMa) {
  return (busV + shuntMv / 1000.0f) * currentMa / 1000.0f;
}
enum class Source { Unknown, Mains, Battery };
inline Source source(bool installed, bool high, bool verifiedBackup) {
  return !installed       ? Source::Unknown
         : high           ? Source::Mains
         : verifiedBackup ? Source::Battery
                          : Source::Unknown;
}
inline const char *sourceName(Source s) {
  return s == Source::Mains     ? "MAINS"
         : s == Source::Battery ? "BATTERY"
                                : "UNKNOWN";
}
struct Climate {
  float temperature = missing(), humidity = missing(), minimum = missing(),
        maximum = missing(), minHumidity = missing(), maxHumidity = missing();
  bool valid = false;
  uint64_t lastSuccessMs = 0;
  unsigned errors = 0;
  void read(float t, float h, uint64_t now) {
    valid = climateValid(t, h);
    if (!valid) {
      temperature = humidity = missing();
      ++errors;
      return;
    }
    temperature = t;
    humidity = h;
    lastSuccessMs = now;
    if (!std::isfinite(minimum) || t < minimum)
      minimum = t;
    if (!std::isfinite(maximum) || t > maximum)
      maximum = t;
    if (!std::isfinite(minHumidity) || h < minHumidity)
      minHumidity = h;
    if (!std::isfinite(maxHumidity) || h > maxHumidity)
      maxHumidity = h;
  }
};
struct Energy {
  double wh = 0;
  double totalWh = 0;
  int day = 0;
  bool partial = true;
  uint64_t previousMs = 0;
  float previousPower = 0;
  bool previousValid = false;
  void sample(uint64_t now, float watts, bool valid, int localDay,
              bool directionVerified) {
    // Wall-clock jumps/day changes break the integration segment. Never bridge
    // reboots/errors.
    if (day > 0 && localDay > 0 && localDay < day) {
      previousValid = false;
      return;
    }
    if (localDay > 0 && localDay != day) {
      wh = 0;
      day = localDay;
      partial = true;
      previousValid = false;
    }
    if (!localDay || !directionVerified) {
      previousValid = false;
      return;
    }
    if (valid && previousValid && now >= previousMs &&
        now - previousMs <= 15000) {
      double increment = (static_cast<double>(previousPower) + watts) * 0.5 *
                         (now - previousMs) / 3600000.0;
      wh += increment;
      totalWh += increment;
    }
    previousMs = now;
    previousPower = watts;
    previousValid = valid;
  }
};
struct RelayState {
  bool on = false;
  uint32_t version = 0;
  bool apply(bool next, uint32_t expected) {
    if (expected != version)
      return false;
    if (next != on) {
      on = next;
      ++version;
    }
    return true;
  }
};
inline bool canSwitchRelay(uint64_t last, uint64_t now, uint32_t interval) {
  return last == 0 || now - last >= interval;
}
inline bool constantEqual(const char *a, const char *b) {
  unsigned diff = 0;
  unsigned i = 0;
  for (; a[i] && b[i]; ++i)
    diff |= static_cast<unsigned char>(a[i] ^ b[i]);
  return diff == 0 && a[i] == b[i];
}
} // namespace logic
