#include "../v3/bounded-dht.h"
#include <cassert>
#include <cstdio>
#include <vector>

// Exercise the actual driver with synthetic GPIO pulses and a wrapping clock.
static uint64_t clockUs = 0, releasedUs = 0, criticalStart = 0, longestCritical = 0;
static bool output = false, locked = false;
static int scenario = 0;
static std::vector<unsigned> widths;
uint32_t micros() { return static_cast<uint32_t>(clockUs++); }
uint32_t millis() { return static_cast<uint32_t>(clockUs / 1000); }
void delay(unsigned long ms) { clockUs += ms * 1000; }
void delayMicroseconds(unsigned int us) { clockUs += us; }
void digitalWrite(uint8_t, uint8_t) {}
void pinMode(uint8_t, uint8_t mode) {
  if (output && mode == INPUT_PULLUP) releasedUs = clockUs;
  output = mode == OUTPUT;
}
void noInterrupts() { assert(!locked); locked = true; criticalStart = clockUs; }
void interrupts() {
  assert(locked); locked = false;
  const auto elapsed = clockUs - criticalStart;
  if (elapsed > longestCritical) longestCritical = elapsed;
}
int digitalRead(uint8_t) {
  ++clockUs;
  if (scenario == 0) return HIGH; // disconnected with pull-up
  if (scenario == 1) return LOW;  // shorted/held low
  auto elapsed = clockUs - releasedUs;
  if (elapsed < 20) return HIGH;
  elapsed -= 20;
  for (unsigned i = 0; i < widths.size(); ++i) {
    if (elapsed < widths[i]) return i % 2 ? HIGH : LOW;
    elapsed -= widths[i];
  }
  return scenario == 2 ? LOW : HIGH; // stuck after initial response / complete
}
static void frame(bool checksumValid) {
  widths = {80, 80};
  uint8_t bytes[] = {2, 128, 0, 230, 0}; // 64.0 % humidity, 23.0 C
  bytes[4] = static_cast<uint8_t>(bytes[0]+bytes[1]+bytes[2]+bytes[3]);
  if (!checksumValid) bytes[4] ^= 1;
  for (auto b : bytes) for (int bit = 7; bit >= 0; --bit) {
    widths.push_back(50); widths.push_back((b & (1 << bit)) ? 70 : 28);
  }
  widths.push_back(50);
}
static void checkFailure(int mode) {
  scenario = mode; widths = {80, 80};
  BoundedDHT sensor(32, BDHT22); sensor.begin();
  const auto start = clockUs;
  assert(std::isnan(sensor.readTemperature()));
  assert(std::isnan(sensor.readHumidity()));
  assert(!locked && clockUs - start < 15000);
}
int main() {
  checkFailure(0); checkFailure(1); checkFailure(2);
  scenario = 3; frame(true);
  BoundedDHT sensor(32, BDHT22); sensor.begin();
  assert(std::abs(sensor.readTemperature()-23.0f)<0.01f);
  assert(std::abs(sensor.readHumidity()-64.0f)<0.01f);
  clockUs += 3000000; frame(false);
  assert(std::isnan(sensor.readTemperature()));
  widths.assign(82, 140); // noisy pulses that individually fit but exceed total budget
  BoundedDHT noisy(32, BDHT22); noisy.begin();
  assert(std::isnan(noisy.readTemperature()));
  clockUs = 0xffffffffULL - 2200; // pulse deadline across micros() wrap
  checkFailure(1);
  assert(longestCritical < 10350 && !locked);
  std::puts("DHT tests passed: valid frame, checksum, disconnected, stuck, partial frame, clock wrap; interrupts restored.");
}
