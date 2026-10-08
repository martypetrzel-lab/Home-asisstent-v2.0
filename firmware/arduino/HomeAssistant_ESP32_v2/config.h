#pragma once
#include <cstdint>
// Provisional ESP32-WROOM / generic 4 MB esp32dev. Confirm exact board before
// upload.
namespace cfg {
constexpr int IndoorDht = 27, OutdoorDht = 17, Sda = 21, Scl = 22;
constexpr int Relay = 26, Relay2 = 33, Button = 25, PowerStatus = 32;
constexpr uint8_t InaAddress = 0x40;
// Original v1.8.10 confirms both relay modules ACTIVE LOW. -1 disables outputs.
constexpr int RelayActiveLevel = 0;
constexpr bool RelayRestoreOnBoot = false;
constexpr uint32_t RelayMinimumSwitchMs = 500;
constexpr bool RelaySafetyConfirmed =
    false; // Required only to enable restoring ON.
constexpr bool ButtonInstalled = false;
constexpr bool TpsStatusInstalled = false;
// Explicit first-install opt-in for Arduino IDE users; NVS marker prevents
// repeat formatting.
constexpr bool InitializeHistoryOnFirstBoot = false;
// LOW also indicates shutdown. Enable only after validating VIN2 + hardware
// priority mode.
constexpr bool TpsLowIsVerifiedBackup = false;
constexpr uint32_t SensorIntervalMs = 5000, StaleMs = 15000;
constexpr uint32_t HistoryIntervalMs = 300000, CheckpointMs = 1800000;
constexpr unsigned HistoryCapacity = 288, EventCapacity = 48;
constexpr float SolarCurrentSign =
    1.0f; // +1 or -1, verify IN+/IN- and production direction.
constexpr bool SolarDirectionConfirmed = false;
constexpr const char *SolarLocation =
    "NEOVĚŘENO: místo INA219 na solární větvi";
constexpr const char *Hostname = "homeassistant-esp32";
constexpr const char *Timezone = "CET-1CEST,M3.5.0,M10.5.0/3";
constexpr const char *Ntp1 =
    "pool.ntp.org"; // May be changed to a local NTP server.
constexpr const char *Ntp2 = "time.cloudflare.com";
constexpr const char *FirmwareVersion = "2.2.0";
constexpr bool uniquePins() {
  const int pins[] = {IndoorDht, OutdoorDht, Sda,    Scl,
                      Relay,     Relay2,     Button, PowerStatus};
  for (unsigned i = 0; i < 8; ++i)
    for (unsigned j = i + 1; j < 8; ++j)
      if (pins[i] == pins[j])
        return false;
  return true;
}
static_assert(!RelayRestoreOnBoot || RelaySafetyConfirmed,
              "Confirm relay safety before restoring a saved ON state");
static_assert(uniquePins(), "GPIO functions must not overlap");
static_assert(SensorIntervalMs >= 2000, "DHT22 interval must be >= 2 seconds");
constexpr bool criticalPin(int pin) {
  return pin == 0 || pin == 2 || pin == 5 || pin == 12 || pin == 15;
}
static_assert(!criticalPin(Relay) && Relay >= 0 && Relay <= 32 &&
                  !criticalPin(Relay2) && Relay2 >= 0 && Relay2 <= 33,
              "Unsafe relay pin");
static_assert(RelayActiveLevel >= -1 && RelayActiveLevel <= 1,
              "Invalid relay polarity");
static_assert(SolarCurrentSign == 1 || SolarCurrentSign == -1,
              "Invalid current sign");
} // namespace cfg
