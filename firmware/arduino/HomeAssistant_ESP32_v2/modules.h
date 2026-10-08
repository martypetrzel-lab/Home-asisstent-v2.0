#pragma once
#include "model.h"
#include <WebServer.h>
void storageBegin();
void storageTask(void *);
void sensorsBegin();
void sensorTask(void *);
void relayBegin();
void relayTask(void *);
void relayPost(uint8_t channel = 1);
void forceRelayOffForOta();
void networkBegin();
void networkTick();
void apiBegin();
void apiTick();
void writeState(JsonDocument &doc, const State &s);
void writeClimate(JsonObject object, const logic::Climate &climate,
                  uint64_t now);
void writeSolar(JsonObject object, const State &s, uint64_t now);
void writeRelay(JsonObject object, const State &s, uint8_t channel = 1);
void writePower(JsonObject object, const State &s);
void writeSystem(JsonObject object, const State &s);
void writeHistory(JsonDocument &doc, unsigned limit);
bool apiAuthorize();
void apiError(int status, const char *code, const char *message);
void apiSend(JsonDocument &doc, int status = 200);
extern WebServer server;

void firmwareSetup();
void firmwareLoop();

int executeRelay(uint8_t channel, JsonDocument &input, JsonDocument &doc,
                 uint64_t expires);
void cloudTask(void *);
