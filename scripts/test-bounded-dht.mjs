import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
mkdirSync("test-results", { recursive: true });
const win = process.platform === "win32";
const compiler = win ? "py" : "g++";
const output = `test-results/bounded-dht${win ? ".exe" : ""}`;
const args = [
  ...(win ? ["-3", "-m", "ziglang", "c++"] : []),
  "-std=c++17",
  "-Wall",
  "-Wextra",
  "-Ifirmware/tests/dht-stub",
  "firmware/v3/bounded-dht.cpp",
  "firmware/tests/bounded-dht.cpp",
  "-o",
  output,
];
const built = spawnSync(compiler, args, { stdio: "inherit" });
if (built.status !== 0) process.exit(built.status || 1);
const tested = spawnSync(output, [], { stdio: "inherit" });
process.exit(tested.status ?? 1);
