/*
  Home Assistant v2 - local kitchen, migrated from original v1.8.24.
  GPIO26 / IN1: svetlo pod troubou; GPIO33 / IN2: volne rele.
  Both relays ACTIVE LOW, OFF at startup; no garage or cloud transport.
  Indoor DHT22 GPIO27, outdoor DHT22 GPIO32; INA219 SDA21 / SCL22.
  Keep all .cpp/.h files and src/core alongside this sketch.
  Wi-Fi / API / OTA credentials are in secrets.h.
  Local web server reads http://<ESP32-IP>/api; ESP32 does not push to web.
*/
#include "modules.h"
void setup() { firmwareSetup(); }
void loop() { firmwareLoop(); }
