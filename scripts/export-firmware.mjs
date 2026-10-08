import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

// Export the maintained modules without reading local secrets.h.
const source = resolve("firmware/arduino/HomeAssistant_ESP32_v2");
const destination = resolve("exports/HomeAssistant_ESP32_v2_full");
const files = [
  "secrets.example.h",
  "secrets_config.h",
  "config.h",
  "cloud-ca.h",
  "src/core/logic.h",
  "model.h",
  "modules.h",
  "src/core/json.h",
  "app.cpp",
  "history.cpp",
  "sensors.cpp",
  "relay.cpp",
  "network.cpp",
  "api.cpp",
  "cloud.cpp",
  "HomeAssistant_ESP32_v2.ino",
];
const includes = new Set(["#include <Arduino.h>"]);
const sections = [];
for (const name of files) {
  let code = await readFile(join(source, name), "utf8");
  if (name === "secrets.example.h") {
    code = code.replace(
      "// Copy to secrets.h (ignored by Git). Never put real values in this example.",
      "// Vyplňte vlastní údaje přímo zde. Tento export neobsahuje skutečná hesla.",
    );
  }
  code = code.replace(/^#include <[^>]+>\s*$/gm, (line) => {
    includes.add(line.trim());
    return "";
  });
  code = code
    .replace(/^#include "[^"\r\n]+"\s*$/gm, "")
    .replace(/^#pragma once\s*$/gm, "");
  sections.push(`// ===== ${name} =====\n${code.trim()}\n`);
}
await mkdir(destination, { recursive: true });
const header = `// HOME ASSISTANT ESP32 v2.2.0 — COMPLETE SINGLE-FILE EXPORT
// Generated from the maintained Arduino sketch modules. No real secrets included.
// Board: ESP32 Dev Module, Espressif core 3.3.8, WROOM, 4 MB, PSRAM disabled.
// Libraries: ArduinoJson 7.4.3, DHT sensor library 1.4.7,
// Adafruit INA219 1.2.3, Unified Sensor 1.1.15, BusIO 1.17.4.
// Fill HOME_WIFI_SSID, HOME_WIFI_PASSWORD and HOME_CLOUD_TOKEN below before uploading.
// HOME_CLOUD_TOKEN must match Railway DEVICE_TOKEN (at least 32 characters).
// HOME_API_TOKEN is optional and only unlocks the separate local HTTP API.
// Both relays are ACTIVE LOW and boot OFF. Optional TPS/button/OTA default OFF.
// Cloud telemetry and weather use the Railway dashboard.
// Do not place this file in the modular sketch folder: it already contains everything.
\n`;
const path = join(destination, "HomeAssistant_ESP32_v2_full.ino");
await writeFile(
  path,
  header + [...includes].join("\n") + "\n\n" + sections.join("\n"),
  "utf8",
);
console.log(path);
