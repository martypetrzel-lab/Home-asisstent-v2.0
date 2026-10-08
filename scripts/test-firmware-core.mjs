import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
mkdirSync("test-results", { recursive: true });
const win = process.platform === "win32",
  file = `test-results/firmware-core${win ? ".exe" : ""}`;
const compiler = win ? "py" : "g++";
const args = [
  ...(win
    ? ["-3", "-m", "ziglang", "c++", "-Wno-nullability-completeness"]
    : []),
  "-std=c++17",
  "-Wall",
  "-Wextra",
  "-Ifirmware/arduino/HomeAssistant_ESP32_v2",
  "-Ifirmware/.pio/libdeps/esp32dev/ArduinoJson/src",
  "firmware/tests/core.cpp",
  "-o",
  file,
];
const build = spawnSync(compiler, args, { stdio: "inherit" });
if (build.status !== 0) process.exit(build.status || 1);
const result = spawnSync(file, [], { stdio: "inherit" });
process.exit(result.status ?? 1);
