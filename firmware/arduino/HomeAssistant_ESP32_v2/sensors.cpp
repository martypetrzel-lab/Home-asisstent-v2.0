#include "modules.h"
#include <Adafruit_INA219.h>
#include <DHT.h>
#include <Wire.h>
#include <esp_task_wdt.h>
static DHT indoor(cfg::IndoorDht, DHT22), outdoor(cfg::OutdoorDht, DHT22);
static Adafruit_INA219 ina(cfg::InaAddress);
void sensorsBegin() {
  indoor.begin();
  outdoor.begin();
  Wire.begin(cfg::Sda, cfg::Scl, 100000);
  Wire.setTimeOut(50);
}
// Check the raw bus overflow bit in addition to every library transaction
// result.
static bool busRegister(uint16_t &raw) {
  Wire.beginTransmission(cfg::InaAddress);
  Wire.write(0x02);
  if (Wire.endTransmission(false) != 0)
    return false;
  if (Wire.requestFrom(cfg::InaAddress, static_cast<uint8_t>(2)) != 2)
    return false;
  raw = (Wire.read() << 8) | Wire.read();
  return true;
}
void sensorTask(void *) {
  esp_task_wdt_add(nullptr);
  sensorsBegin();
  bool initialized = false;
  TickType_t wake = xTaskGetTickCount();
  for (;;) {
    esp_task_wdt_reset();
    auto old = snapshot();
    auto in = old.indoor, out = old.outdoor;
    auto sol = old.solar;
    auto energy = old.energy;
    uint64_t now = monotonicMs();
    in.read(indoor.readTemperature(), indoor.readHumidity(), now);
    out.read(outdoor.readTemperature(), outdoor.readHumidity(), now);
    if (!initialized) {
      initialized = ina.begin(&Wire);
      if (initialized)
        ina.setCalibration_32V_2A();
    }
    uint16_t raw = 0;
    bool io = initialized && busRegister(raw);
    float v = io ? ina.getBusVoltage_V() : logic::missing();
    io = io && ina.success();
    float shunt = io ? ina.getShuntVoltage_mV() : logic::missing();
    io = io && ina.success();
    float rawCurrent = io ? ina.getCurrent_mA() : logic::missing();
    float current = rawCurrent * cfg::SolarCurrentSign;
    io = io && ina.success();
    uint16_t after = 0;
    io = io && busRegister(after);
    sol.valid =
        logic::solarValid(v, shunt, current, io, (raw & 1) || (after & 1));
    if (sol.valid) {
      sol.bus = v;
      sol.shunt = shunt;
      sol.currentMa = current;
      sol.rawCurrentMa = rawCurrent;
      sol.power = logic::solarPower(v, shunt, current);
      if (!std::isfinite(sol.minimum) || sol.power < sol.minimum)
        sol.minimum = sol.power;
      if (!std::isfinite(sol.maximum) || sol.power > sol.maximum)
        sol.maximum = sol.power;
      sol.lastSuccessMs = now;
    } else {
      sol.bus = sol.shunt = sol.rawCurrentMa = sol.currentMa = sol.power =
          logic::missing();
      ++sol.errors;
      initialized = false;
    }
    energy.sample(now, sol.power, sol.valid, localDay(),
                  cfg::SolarDirectionConfirmed);
    xSemaphoreTake(stateMutex, portMAX_DELAY);
    state.indoor = in;
    state.outdoor = out;
    state.solar = sol;
    state.energy = energy;
    xSemaphoreGive(stateMutex);
    if (in.valid != old.indoor.valid)
      addEvent("sensor",
               in.valid ? "Vnitřní DHT22 obnoven" : "Vnitřní DHT22 nedostupný");
    if (out.valid != old.outdoor.valid)
      addEvent("sensor", out.valid ? "Venkovní DHT22 obnoven"
                                   : "Venkovní DHT22 nedostupný");
    if (sol.valid != old.solar.valid)
      addEvent("sensor", sol.valid ? "INA219 obnoven" : "INA219 nedostupný");
    // Initial failed samples also need an event (initial state is already
    // invalid).
    if (in.errors == 1 && !in.valid)
      addEvent("sensor", "První čtení vnitřního DHT22 selhalo");
    if (out.errors == 1 && !out.valid)
      addEvent("sensor", "První čtení venkovního DHT22 selhalo");
    if (sol.errors == 1 && !sol.valid)
      addEvent("sensor", "První čtení INA219 selhalo");
    vTaskDelayUntil(&wake, pdMS_TO_TICKS(cfg::SensorIntervalMs));
  }
}
