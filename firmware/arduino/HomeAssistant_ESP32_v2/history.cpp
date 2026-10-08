#include "modules.h"
#include <LittleFS.h>
#include <Preferences.h>
#include <esp_task_wdt.h>
struct Record {
  uint64_t epoch, uptime;
  char boot[17];
  float ti, to, hi, ho, watts, wh;
};
struct Event {
  uint64_t epoch, uptime;
  char boot[17], kind[16], detail[96];
};
struct Archive {
  uint32_t magic = 0x48413232, version = 2, generation = 0, count = 0, head = 0,
           eventCount = 0, eventHead = 0;
  int day = 0;
  double wh = 0;
  double totalWh = 0;
  Record records[cfg::HistoryCapacity]{};
  Event events[cfg::EventCapacity]{};
};
static Archive archive;
static SemaphoreHandle_t historyMutex;
static bool fsReady = false;
static uint32_t crc(const void *data, size_t size) {
  uint32_t value = ~0u;
  auto bytes = static_cast<const uint8_t *>(data);
  for (size_t i = 0; i < size; ++i) {
    value ^= bytes[i];
    for (unsigned b = 0; b < 8; ++b)
      value = (value >> 1) ^ (0xEDB88320u & -(value & 1));
  }
  return ~value;
}
void addEvent(const char *kind, const char *detail) {
  if (!historyMutex)
    return;
  auto s = snapshot();
  Event e{};
  time_t now = time(nullptr);
  e.epoch = now >= 1700000000 ? now : 0;
  e.uptime = monotonicMs() / 1000;
  strlcpy(e.boot, s.bootId, sizeof(e.boot));
  strlcpy(e.kind, kind, sizeof(e.kind));
  strlcpy(e.detail, detail, sizeof(e.detail));
  xSemaphoreTake(historyMutex, portMAX_DELAY);
  archive.events[archive.eventHead++ % cfg::EventCapacity] = e;
  archive.eventHead %= cfg::EventCapacity;
  archive.eventCount =
      std::min<uint32_t>(archive.eventCount + 1, cfg::EventCapacity);
  xSemaphoreGive(historyMutex);
}
void storageBegin() {
  historyMutex = xSemaphoreCreateMutex();
  configASSERT(historyMutex);
  fsReady = LittleFS.begin(false);
  if (cfg::InitializeHistoryOnFirstBoot) {
    Preferences provision;
    if (provision.begin("home-config", false)) {
      if (!provision.getBool("fs-initialized", false)) {
        if (!fsReady && LittleFS.format())
          fsReady = LittleFS.begin(false);
        if (fsReady)
          provision.putBool("fs-initialized", true);
      }
      provision.end();
    }
  }
  state.storageReady = fsReady;
  if (fsReady) {
    auto loaded = static_cast<Archive *>(malloc(sizeof(Archive)));
    if (loaded) {
      for (const char *path : {"/history0.bin", "/history1.bin"}) {
        File file = LittleFS.open(path, "r");
        uint32_t sum = 0;
        if (file && file.size() == sizeof(Archive) + sizeof(sum) &&
            file.readBytes(reinterpret_cast<char *>(loaded), sizeof(Archive)) ==
                sizeof(Archive) &&
            file.readBytes(reinterpret_cast<char *>(&sum), sizeof(sum)) ==
                sizeof(sum) &&
            loaded->magic == archive.magic && loaded->version == 2 &&
            loaded->count <= cfg::HistoryCapacity &&
            loaded->head < cfg::HistoryCapacity &&
            loaded->eventCount <= cfg::EventCapacity &&
            loaded->eventHead < cfg::EventCapacity &&
            std::isfinite(loaded->wh) && std::isfinite(loaded->totalWh) &&
            sum == crc(loaded, sizeof(Archive)) &&
            loaded->generation >= archive.generation)
          archive = *loaded;
        file.close();
      }
      free(loaded);
    }
  }
  state.energy.day = archive.day;
  state.energy.wh = archive.wh;
  state.energy.totalWh = archive.totalWh;
  state.energy.partial = true;
  addEvent("restart", "Restart ESP32; denní energie může být neúplná");
}
static void checkpoint(const State &s) {
  if (!fsReady)
    return;
  auto copy = static_cast<Archive *>(malloc(sizeof(Archive)));
  if (!copy) {
    addEvent("storage", "Nedostatek paměti pro checkpoint");
    return;
  }
  xSemaphoreTake(historyMutex, portMAX_DELAY);
  archive.day = s.energy.day;
  archive.wh = s.energy.wh;
  archive.totalWh = s.energy.totalWh;
  ++archive.generation;
  *copy = archive;
  xSemaphoreGive(historyMutex);
  uint32_t sum = crc(copy, sizeof(Archive));
  const char *target = copy->generation % 2 ? "/history1.bin" : "/history0.bin";
  File file = LittleFS.open("/history.tmp", "w");
  bool ok =
      file &&
      file.write(reinterpret_cast<uint8_t *>(copy), sizeof(Archive)) ==
          sizeof(Archive) &&
      file.write(reinterpret_cast<uint8_t *>(&sum), sizeof(sum)) == sizeof(sum);
  file.flush();
  file.close();
  free(copy);
  if (ok) {
    LittleFS.remove(target);
    ok = LittleFS.rename("/history.tmp", target);
  }
  if (!ok) {
    xSemaphoreTake(stateMutex, portMAX_DELAY);
    state.storageReady = false;
    xSemaphoreGive(stateMutex);
    addEvent("storage", "Uložení historie selhalo");
  }
}
void storageTask(void *) {
  esp_task_wdt_add(nullptr);
  uint64_t recorded = 0, saved = monotonicMs(), relayChanged = 0;
  bool lastRelay = snapshot().relay.on, persisted = lastRelay;
  bool lastRelay2 = snapshot().relay2.on, persisted2 = lastRelay2;
  uint64_t relay2Changed = 0;
  for (;;) {
    esp_task_wdt_reset();
    uint64_t now = monotonicMs();
    auto s = snapshot();
    if (now - recorded >= cfg::HistoryIntervalMs) {
      recorded = now;
      time_t epoch = time(nullptr);
      Record r{};
      r.epoch = epoch >= 1700000000 ? epoch : 0;
      r.uptime = now / 1000;
      strlcpy(r.boot, s.bootId, sizeof(r.boot));
      r.ti = s.indoor.valid && now - s.indoor.lastSuccessMs <= cfg::StaleMs
                 ? s.indoor.temperature
                 : logic::missing();
      r.to = s.outdoor.valid && now - s.outdoor.lastSuccessMs <= cfg::StaleMs
                 ? s.outdoor.temperature
                 : logic::missing();
      r.hi = s.indoor.valid && now - s.indoor.lastSuccessMs <= cfg::StaleMs
                 ? s.indoor.humidity
                 : logic::missing();
      r.ho = s.outdoor.valid && now - s.outdoor.lastSuccessMs <= cfg::StaleMs
                 ? s.outdoor.humidity
                 : logic::missing();
      r.watts = s.solar.valid && now - s.solar.lastSuccessMs <= cfg::StaleMs
                    ? s.solar.power
                    : logic::missing();
      r.wh = cfg::SolarDirectionConfirmed && s.energy.day == localDay() &&
                     s.energy.day
                 ? s.energy.wh
                 : logic::missing();
      xSemaphoreTake(historyMutex, portMAX_DELAY);
      archive.records[archive.head++ % cfg::HistoryCapacity] = r;
      archive.head %= cfg::HistoryCapacity;
      archive.count =
          std::min<uint32_t>(archive.count + 1, cfg::HistoryCapacity);
      xSemaphoreGive(historyMutex);
    }
    if (s.relay.on != lastRelay) {
      lastRelay = s.relay.on;
      relayChanged = now;
    }
    if (cfg::RelayRestoreOnBoot && lastRelay != persisted &&
        now - relayChanged >= 30000) {
      Preferences prefs;
      if (prefs.begin("home", false)) {
        if (prefs.putBool("relay", lastRelay))
          persisted = lastRelay;
        prefs.end();
      }
    }
    if (s.relay2.on != lastRelay2) {
      lastRelay2 = s.relay2.on;
      relay2Changed = now;
    }
    if (cfg::RelayRestoreOnBoot && lastRelay2 != persisted2 &&
        now - relay2Changed >= 30000) {
      Preferences prefs;
      if (prefs.begin("home", false)) {
        if (prefs.putBool("relay2", lastRelay2))
          persisted2 = lastRelay2;
        prefs.end();
      }
    }
    if (now - saved >= cfg::CheckpointMs) {
      saved = now;
      checkpoint(s);
    }
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
}
void writeHistory(JsonDocument &doc, unsigned limit) {
  doc["capacity"] = cfg::HistoryCapacity;
  doc["intervalSeconds"] = cfg::HistoryIntervalMs / 1000;
  doc["retentionHours"] = 24;
  doc["checkpointSeconds"] = cfg::CheckpointMs / 1000;
  xSemaphoreTake(historyMutex, portMAX_DELAY);
  auto records = doc["records"].to<JsonArray>();
  unsigned count = std::min<uint32_t>(limit, archive.count);
  for (unsigned i = archive.count - count; i < archive.count; ++i) {
    const auto &r =
        archive
            .records[(archive.head + cfg::HistoryCapacity - archive.count + i) %
                     cfg::HistoryCapacity];
    auto o = records.add<JsonObject>();
    if (r.epoch)
      o["epochSeconds"] = r.epoch;
    else
      o["epochSeconds"] = nullptr;
    o["uptimeSeconds"] = r.uptime;
    o["bootId"] = r.boot;
    nullable(o["indoorTemperature"], r.ti);
    nullable(o["outdoorTemperature"], r.to);
    nullable(o["indoorHumidity"], r.hi);
    nullable(o["outdoorHumidity"], r.ho);
    nullable(o["solarPower"], r.watts);
    nullable(o["solarEnergy"], r.wh);
  }
  auto events = doc["events"].to<JsonArray>();
  for (unsigned i = 0; i < archive.eventCount; ++i) {
    const auto &e = archive.events[(archive.eventHead + cfg::EventCapacity -
                                    archive.eventCount + i) %
                                   cfg::EventCapacity];
    auto o = events.add<JsonObject>();
    if (e.epoch)
      o["epochSeconds"] = e.epoch;
    else
      o["epochSeconds"] = nullptr;
    o["uptimeSeconds"] = e.uptime;
    o["bootId"] = e.boot;
    o["kind"] = e.kind;
    o["detail"] = e.detail;
  }
  xSemaphoreGive(historyMutex);
}
