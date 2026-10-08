#include "src/core/json.h"
#include "src/core/logic.h"
#include <cassert>
#include <iostream>
int main() {
  using namespace logic;
  Climate climate;
  climate.read(22, 45, 5000);
  assert(climate.valid && climate.minimum == 22);
  climate.read(missing(), 45, 10000);
  assert(!climate.valid && std::isnan(climate.temperature) &&
         climate.lastSuccessMs == 5000 && climate.errors == 1);
  climate.read(20, 100, 15000);
  assert(climate.minimum == 20 && climate.maximum == 22);
  assert(climate.minHumidity == 45 && climate.maxHumidity == 100);
  assert(!climateValid(20, 101));
  assert(solarValid(18, 20, 400, true, false));
  assert(!solarValid(18, 20, 400, true, true));
  assert(!solarValid(18, 20, 400, false, false));
  assert(!solarValid(27, 20, 400, true, false));
  assert(solarValid(18, -20, -400, true, false));
  assert(std::abs(solarPower(18, 20, 400) - 7.208f) < 0.00001f);
  assert(solarPower(18, -20, -400) < 0);
  Energy energy;
  energy.sample(0, 10, true, 20261008, true);
  energy.sample(5000, 10, true, 20261008, true);
  assert(std::abs(energy.wh - 10.0 * 5 / 3600) < 1e-8);
  double old = energy.wh;
  energy.sample(10000, 0, false, 20261008, true);
  energy.sample(15000, 10, true, 20261008, true);
  assert(energy.wh == old);
  energy.sample(20000, -10, true, 20261008, true);
  assert(energy.wh == old);
  energy.sample(25000, -10, true, 20261008, true);
  assert(energy.wh < old);
  energy.sample(30000, 10, true, 20261009, true);
  assert(energy.wh == 0 && energy.day == 20261009);
  assert(std::abs(energy.totalWh) <
         1e-8); // Signed production and reverse flow cancel.
  Energy cumulative;
  cumulative.sample(0, 10, true, 20261008, true);
  cumulative.sample(5000, 10, true, 20261008, true);
  double monitored = cumulative.totalWh;
  cumulative.sample(10000, 10, true, 20261009, true);
  assert(cumulative.wh == 0 && cumulative.totalWh == monitored &&
         monitored > 0);
  energy.sample(35000, 10, true, 20261008, true);
  assert(energy.day == 20261009 && energy.wh == 0);
  energy.sample(40000, 10, true, 20261009, false);
  assert(!energy.previousValid);
  energy.sample(50000, 10, true, 0, true);
  assert(energy.wh == 0);
  Energy restored;
  restored.day = 20261008;
  restored.wh = 12.5;
  restored.sample(5000, 10, true, 20261008, true);
  assert(restored.wh == 12.5); // Never integrate across a reboot.
  restored.sample(25001, 10, true, 20261008, true);
  assert(restored.wh == 12.5); // Never bridge a >15 s missing segment.
  RelayState relay, relay2;
  assert(canSwitchRelay(0, 100, 500));
  assert(!canSwitchRelay(100, 599, 500));
  assert(canSwitchRelay(100, 600, 500));
  assert(relay2.apply(true, 0) && relay.version == 0);
  assert(relay.apply(true, 0) && relay.version == 1);
  assert(relay.apply(true, 1) && relay.version == 1);
  assert(!relay.apply(false, 0) && relay.on);
  assert(relay.apply(false, 1) && !relay.on && relay.version == 2);
  assert(source(false, true, true) == Source::Unknown);
  assert(source(true, true, false) == Source::Mains);
  assert(source(true, false, false) == Source::Unknown);
  assert(source(true, false, true) == Source::Battery);
  assert(constantEqual("token", "token"));
  assert(!constantEqual("token", "tokem"));
  assert(!constantEqual("token", "tokenx"));
  JsonDocument doc;
  Climate failed;
  climateJson(doc.to<JsonObject>(), failed, 10000, 15000);
  assert(doc["temperatureC"].isNull() && doc["humidityPct"].isNull() &&
         !doc["available"].as<bool>());
  Climate good;
  good.read(23, 50, 5000);
  climateJson(doc.to<JsonObject>(), good, 25000, 15000);
  assert(doc["stale"].as<bool>() && doc["temperatureC"].isNull());
  climateJson(doc.to<JsonObject>(), good, 10000, 15000);
  assert(doc["temperatureC"].as<float>() == 23);
  std::string json;
  serializeJson(doc, json);
  assert(json.find("NaN") == std::string::npos);
  for (const char *input :
       {"{}", "{\"state\":1}", "{\"state\":true,\"expectedVersion\":-1}",
        "{\"state\":true,\"requestId\":null}", "{\"state\":true,\"foo\":0}"}) {
    deserializeJson(doc, input);
    assert(!validCommand(doc));
  }
  deserializeJson(
      doc, "{\"state\":true,\"expectedVersion\":0,\"requestId\":\"test-id\"}");
  assert(validCommand(doc));
  std::cout << "Firmware core: sensor/JSON, request validation, energy, relay, "
               "TPS2116 and authentication tests passed\n";
}
