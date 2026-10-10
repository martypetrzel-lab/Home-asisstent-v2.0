// Izolovaný testovací server. Nikdy neodesílá povely fyzickému ESP32.
import { spawn } from "node:child_process";
import { resolve } from "node:path";
const mode = process.argv.includes("--production") ? "start" : "dev";
const env = {
  ...process.env,
  PORT: "3002",
  ESP32_TRANSPORT: "cloud",
  DEVICE_ID: "homeassistant-esp32",
  DEVICE_TOKEN: "cloud-e2e-test-000000000000000000000000",
  DASHBOARD_PASSWORD: "dashboard-e2e-password-12345",
  SESSION_SECRET: "session-e2e-secret-000000000000000000000",
  DASHBOARD_ORIGIN: "http://localhost:3002",
  CLOUD_DATA_DIR: resolve("test-results/cloud-v3"),
  NEXT_PUBLIC_ESP32_API_URL: "",
};
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    mode,
    "--hostname",
    "127.0.0.1",
    "--port",
    "3002",
  ],
  { env, stdio: "inherit" },
);
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => child.kill(s));
child.on("exit", (code) => process.exit(code ?? 1));
