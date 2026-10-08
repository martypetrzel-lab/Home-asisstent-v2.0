#include "modules.h"
#include "src/core/json.h"
#include <Preferences.h>
#include <esp_task_wdt.h>
struct Command {
  uint8_t channel;
  bool on;
  uint32_t expected;
  char id[41];
};
struct Result {
  uint8_t channel = 1;
  char id[41] = {};
  bool on = false;
  int status = 0;
  uint32_t version = 0;
};
static QueueHandle_t commands;
static Result results[8];
static unsigned resultHead = 0;
static uint64_t switchedAt[2] = {};
static bool enabled() {
  return cfg::RelayActiveLevel == 0 || cfg::RelayActiveLevel == 1;
}
void relayBegin() {
  commands = xQueueCreate(2, sizeof(Command));
  configASSERT(commands);
  for (int pin : {cfg::Relay, cfg::Relay2}) {
    if (enabled()) {
      digitalWrite(pin, !cfg::RelayActiveLevel);
      pinMode(pin, OUTPUT);
      digitalWrite(pin, !cfg::RelayActiveLevel);
    } else
      pinMode(pin, INPUT);
  } // External verified inactive bias is required
    // before connecting relay.
  if (cfg::ButtonInstalled)
    pinMode(cfg::Button, INPUT_PULLUP);
  if (cfg::TpsStatusInstalled)
    pinMode(cfg::PowerStatus, INPUT); // External 3.3 V pull-up required.
  if (enabled() && cfg::RelayRestoreOnBoot) {
    Preferences prefs;
    if (prefs.begin("home", true)) {
      state.relay.on = prefs.getBool("relay", false);
      state.relay2.on = prefs.getBool("relay2", false);
      prefs.end();
    }
    digitalWrite(cfg::Relay, state.relay.on ? cfg::RelayActiveLevel
                                            : !cfg::RelayActiveLevel);
    digitalWrite(cfg::Relay2, state.relay2.on ? cfg::RelayActiveLevel
                                              : !cfg::RelayActiveLevel);
  }
}
static int apply(uint8_t channel, bool on, uint32_t expected) {
  xSemaphoreTake(stateMutex, portMAX_DELAY);
  auto &relay = channel == 1 ? state.relay : state.relay2;
  int status = !enabled() || state.ota     ? 503
               : relay.version != expected ? 409
               : relay.on != on && !logic::canSwitchRelay(
                                       switchedAt[channel - 1], monotonicMs(),
                                       cfg::RelayMinimumSwitchMs)
                   ? 429
                   : 200;
  if (status == 200) {
    if (relay.on != on)
      switchedAt[channel - 1] = monotonicMs();
    digitalWrite(channel == 1 ? cfg::Relay : cfg::Relay2,
                 on ? cfg::RelayActiveLevel : !cfg::RelayActiveLevel);
    relay.apply(on, expected);
    state.relayAppliedMs = monotonicMs();
  }
  xSemaphoreGive(stateMutex);
  return status;
}
void forceRelayOffForOta() {
  xSemaphoreTake(stateMutex, portMAX_DELAY);
  state.ota = true;
  if (enabled()) {
    digitalWrite(cfg::Relay, !cfg::RelayActiveLevel);
    digitalWrite(cfg::Relay2, !cfg::RelayActiveLevel);
    state.relay.apply(false, state.relay.version);
    state.relay2.apply(false, state.relay2.version);
    state.relayAppliedMs = monotonicMs();
  }
  xSemaphoreGive(stateMutex);
}
void relayTask(void *) {
  esp_task_wdt_add(nullptr);
  bool raw = true, stable = true;
  uint64_t changed = 0;
  for (;;) {
    esp_task_wdt_reset();
    Command command;
    if (xQueueReceive(commands, &command, 0) == pdTRUE) {
      int status = apply(command.channel, command.on, command.expected);
      auto s = snapshot();
      xSemaphoreTake(stateMutex, portMAX_DELAY);
      auto &result = results[resultHead++ % 8];
      strlcpy(result.id, command.id, sizeof(result.id));
      result.channel = command.channel;
      result.on = command.on;
      result.status = status;
      result.version =
          command.channel == 1 ? s.relay.version : s.relay2.version;
      xSemaphoreGive(stateMutex);
      if (status == 200) {
        char detail[64];
        snprintf(detail, sizeof(detail), "Relé %u: GPIO %s", command.channel,
                 command.on ? "zapnout" : "vypnout");
        addEvent("relay", detail);
      }
    }
    if (cfg::ButtonInstalled) {
      bool next = digitalRead(cfg::Button);
      if (next != raw) {
        raw = next;
        changed = monotonicMs();
      }
      if (raw != stable && monotonicMs() - changed >= 50) {
        stable = raw;
        if (!stable) {
          auto s = snapshot();
          if (apply(1, !s.relay.on, s.relay.version) == 200)
            addEvent("relay", "Místní tlačítko: změna GPIO");
        }
      }
    }
    auto old = snapshot();
    auto source =
        logic::source(cfg::TpsStatusInstalled,
                      cfg::TpsStatusInstalled && digitalRead(cfg::PowerStatus),
                      cfg::TpsLowIsVerifiedBackup);
    // Debounce status separately from the physical switch.
    static auto candidate = logic::Source::Unknown;
    static uint64_t since = 0;
    if (source != candidate) {
      candidate = source;
      since = monotonicMs();
    }
    if (source != old.power && monotonicMs() - since >= 250) {
      xSemaphoreTake(stateMutex, portMAX_DELAY);
      state.power = source;
      xSemaphoreGive(stateMutex);
      addEvent("power", logic::sourceName(source));
    }
    vTaskDelay(pdMS_TO_TICKS(10));
  }
}
void relayPost(uint8_t channel) {
  if (!apiAuthorize())
    return;
  if (server.header("Content-Type").indexOf("application/json") != 0) {
    apiError(415, "content_type", "Použijte application/json.");
    return;
  }
  if (server.arg("plain").length() > 512) {
    apiError(413, "body_size", "Příkaz je příliš velký.");
    return;
  }
  JsonDocument input;
  if (deserializeJson(input, server.arg("plain")) ||
      !logic::validCommand(input)) {
    apiError(400, "invalid_body",
             "Neplatný příkaz; state musí být boolean a ostatní pole musí "
             "odpovídat API v1.");
    return;
  }
  for (JsonPair field : input.as<JsonObject>())
    if (strcmp(field.key().c_str(), "state") &&
        strcmp(field.key().c_str(), "expectedVersion") &&
        strcmp(field.key().c_str(), "requestId") &&
        strcmp(field.key().c_str(), "bootId")) {
      apiError(400, "unknown_field", "Neznámé pole příkazu.");
      return;
    }
  auto s = snapshot();
  if (input["bootId"].is<const char *>() &&
      String(input["bootId"].as<const char *>()) != s.bootId) {
    apiError(409, "restarted", "ESP32 se restartovalo. Načtěte nový stav.");
    return;
  }
  if (!input["bootId"].isNull() && !input["bootId"].is<const char *>()) {
    apiError(400, "boot_id", "Neplatné bootId.");
    return;
  }
  if (!input["expectedVersion"].isNull() &&
      !input["expectedVersion"].is<uint32_t>()) {
    apiError(400, "version", "Neplatná verze relé.");
    return;
  }
  String id = input["requestId"].is<const char *>()
                  ? input["requestId"].as<const char *>()
                  : String(s.bootId) + "-" +
                        String(static_cast<unsigned long>(esp_random()));
  if (!input["requestId"].isNull() && !input["requestId"].is<const char *>()) {
    apiError(400, "request_id", "Neplatné requestId.");
    return;
  }
  if (!id.length() || id.length() > 40) {
    apiError(400, "request_id", "requestId musí mít 1–40 znaků.");
    return;
  }
  for (unsigned i = 0; i < id.length(); ++i)
    if (!isalnum(id[i]) && id[i] != '-' && id[i] != '_') {
      apiError(400, "request_id", "Neplatné znaky requestId.");
      return;
    }
  bool on = input["state"].as<bool>();
  Result found;
  xSemaphoreTake(stateMutex, portMAX_DELAY);
  for (const auto &result : results)
    if (id == result.id)
      found = result;
  xSemaphoreGive(stateMutex);
  if (found.status) {
    if (found.on != on || found.channel != channel) {
      apiError(409, "duplicate_conflict",
               "requestId již patří jinému příkazu.");
      return;
    }
    if (found.status != 200) {
      apiError(found.status, "command_rejected", "Příkaz nebyl přijat.");
      return;
    }
  } else {
    Command cmd{channel,
                on,
                input["expectedVersion"].isNull()
                    ? (channel == 1 ? s.relay.version : s.relay2.version)
                    : input["expectedVersion"].as<uint32_t>(),
                {}};
    strlcpy(cmd.id, id.c_str(), sizeof(cmd.id));
    if (xQueueSend(commands, &cmd, 0) != pdTRUE) {
      apiError(429, "busy", "Relé zpracovává jiný příkaz.");
      return;
    }
    uint64_t started = monotonicMs();
    while (monotonicMs() - started < 750 && !found.status) {
      xSemaphoreTake(stateMutex, portMAX_DELAY);
      for (const auto &r : results)
        if (id == r.id)
          found = r;
      xSemaphoreGive(stateMutex);
      delay(5);
    }
    if (found.status != 200) {
      apiError(found.status ? found.status : 504,
               found.status == 409 ? "conflict" : "command_failed",
               found.status == 409
                   ? "Stav změnil jiný klient. Načtěte jej znovu."
                   : "GPIO příkaz nebyl potvrzen. Ověřte konfiguraci relé a "
                     "nový stav.");
      return;
    }
  }
  JsonDocument doc;
  doc["apiVersion"] = 1;
  doc["requestId"] = id;
  doc["applied"] = true;
  doc["appliedVersion"] = found.version;
  doc["requestedState"] = on;
  doc["bootId"] = s.bootId;
  auto current = snapshot();
  doc["channel"] = channel;
  writeRelay(doc["relays"][String(channel)].to<JsonObject>(), current, channel);
  if (channel == 1)
    writeRelay(doc["lighting"]["kitchenLed"].to<JsonObject>(), current);
  apiSend(doc);
}
