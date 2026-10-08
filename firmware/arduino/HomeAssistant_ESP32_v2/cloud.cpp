#include "cloud-ca.h"
#include "modules.h"
#include "secrets_config.h"
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

class CloudResponse : public Stream {
public:
  String text;
  using Print::write;
  size_t write(uint8_t byte) override {
    if (text.length() >= 4096)
      return 0;
    text += static_cast<char>(byte);
    return 1;
  }
  int available() override { return 0; }
  int read() override { return -1; }
  int peek() override { return -1; }
  void flush() override {}
};

// All TLS work runs separately from sensors, GPIO and the local HTTP server.
void cloudTask(void *) {
  uint32_t sequence = 0, retryMs = 2000;
  JsonDocument ack;
  uint64_t next = 0;
  for (;;) {
    vTaskDelay(pdMS_TO_TICKS(100));
    if (!HOME_CLOUD_ENABLED || strlen(HOME_CLOUD_TOKEN) < 32 ||
        WiFi.status() != WL_CONNECTED || time(nullptr) < 1700000000 ||
        snapshot().ota || monotonicMs() < next)
      continue;
    JsonDocument payload, stateDoc;
    writeState(stateDoc, snapshot());
    payload["protocolVersion"] = 1;
    payload["sequence"] = ++sequence;
    payload["state"].set(stateDoc.as<JsonVariant>());
    if (!ack.isNull())
      payload["ack"].set(ack.as<JsonVariant>());
    String body;
    serializeJson(payload, body);
    WiFiClientSecure client;
    client.setCACert(CloudRootCa);
    client.setHandshakeTimeout(5);
    client.setTimeout(3000);
    HTTPClient http;
    http.setConnectTimeout(3000);
    http.setTimeout(3000);
    http.setReuse(false);
    http.setFollowRedirects(HTTPC_DISABLE_FOLLOW_REDIRECTS);
    uint64_t started = monotonicMs();
    int status = -1;
    JsonDocument response;
    if (http.begin(client, cfg::CloudUrl)) {
      http.addHeader("Content-Type", "application/json");
      http.addHeader("Authorization", String("Bearer ") + HOME_CLOUD_TOKEN);
      status = http.POST(body);
      // Bound the response before parsing; the cloud never sends bulk history.
      if (status == 200) {
        CloudResponse incoming;
        if (http.getSize() > 4096 || http.writeToStream(&incoming) < 0 ||
            deserializeJson(response, incoming.text) ||
            response["protocolVersion"].as<int>() != 1)
          status = -2;
      }
      http.end();
    }
    client.stop();
    if (status != 200) {
      Serial.printf("Cloud: spojeni selhalo (%d), opakovani za %lu ms\n",
                    status, static_cast<unsigned long>(retryMs));
      next = monotonicMs() + retryMs;
      retryMs = min(retryMs * 2, uint32_t(60000));
      continue;
    }
    retryMs = 2000;
    ack.clear();
    next = monotonicMs() + 2000;
    JsonObject command = response["command"].as<JsonObject>();
    if (command.isNull())
      continue;
    const int channel = command["channel"] | 0;
    const char *id = command["requestId"] | "";
    // A late response must never turn into a fresh command after an outage.
    const uint64_t wall = static_cast<uint64_t>(time(nullptr)) * 1000;
    const uint64_t expiresAt = command["expiresAtMs"] | uint64_t(0);
    const uint64_t validFor = command["validForMs"] | uint64_t(0);
    uint64_t elapsed = monotonicMs() - started;
    if ((channel != 1 && channel != 2) || !strlen(id) || strlen(id) > 40 ||
        !command["state"].is<bool>() ||
        !command["expectedVersion"].is<uint32_t>() ||
        !command["bootId"].is<const char *>() || validFor > 10000 ||
        expiresAt <= wall || validFor <= elapsed)
      continue;
    JsonDocument input, result;
    for (const char *key : {"state", "expectedVersion", "bootId", "requestId"})
      input[key].set(command[key]);
    uint64_t remaining = min(validFor - elapsed, expiresAt - wall);
    int applied =
        executeRelay(channel, input, result, monotonicMs() + remaining);
    ack["requestId"] = String(id);
    ack["channel"] = channel;
    ack["status"] = applied;
    ack["result"].set(result.as<JsonVariant>());
    next = monotonicMs() + 100; // Return GPIO acknowledgement promptly.
  }
}
