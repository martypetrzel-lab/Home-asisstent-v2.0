import type { HomeSnapshot, HistoryRange, RelayStatus } from "@/types";
export const rangeHours: Record<HistoryRange, number> = {
  "1h": 1,
  "24h": 24,
  "7d": 168,
  "30d": 720,
};
export { emptySnapshot } from "./snapshot";
let demoRelay: RelayStatus = {
  on: false,
  acknowledgedAt: null,
  timerMinutes: 0,
  turnOffAt: null,
};
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let expiring = false;
function publishDemo() {
  try {
    localStorage.setItem("home-demo-relay", JSON.stringify(demoRelay));
  } catch {}
  channel?.postMessage(demoRelay);
  listeners.forEach((fn) => fn());
}
export function setDemoTimer(minutes: number) {
  if (![0, 1, 5, 15, 30].includes(minutes))
    throw new Error("Neplatná délka časovače.");
  demoRelay = {
    ...demoRelay,
    timerMinutes: minutes,
    turnOffAt: demoRelay.on && minutes ? Date.now() + minutes * 60000 : null,
  };
  publishDemo();
}
export function subscribeDemo(callback: () => void) {
  if (!listeners.size && typeof window !== "undefined") {
    try {
      const saved = JSON.parse(
        localStorage.getItem("home-demo-relay") || "null",
      );
      if (saved && typeof saved.on === "boolean")
        demoRelay = {
          on: saved.on,
          acknowledgedAt:
            typeof saved.acknowledgedAt === "string"
              ? saved.acknowledgedAt
              : null,
          timerMinutes: [0, 1, 5, 15, 30].includes(saved.timerMinutes)
            ? saved.timerMinutes
            : 0,
          turnOffAt:
            typeof saved.turnOffAt === "number" ? saved.turnOffAt : null,
        };
    } catch {}
    timer = setInterval(() => {
      if (
        demoRelay.on &&
        demoRelay.turnOffAt &&
        Date.now() >= demoRelay.turnOffAt &&
        !expiring
      ) {
        expiring = true;
        void setDemoRelay(false).finally(() => {
          expiring = false;
        });
      }
    }, 500);
  }
  listeners.add(callback);
  if (typeof BroadcastChannel !== "undefined" && !channel) {
    channel = new BroadcastChannel("home-esp32-demo");
    channel.onmessage = (event) => {
      if (typeof event.data?.on === "boolean") {
        demoRelay = event.data;
        listeners.forEach((fn) => fn());
      }
    };
  }
  return () => {
    listeners.delete(callback);
    if (!listeners.size) {
      channel?.close();
      channel = null;
      if (timer) clearInterval(timer);
      timer = null;
    }
  };
}
export async function setDemoRelay(on: boolean): Promise<RelayStatus> {
  await new Promise((resolve) => setTimeout(resolve, 850));
  demoRelay = {
    ...demoRelay,
    on,
    acknowledgedAt: new Date().toISOString(),
    turnOffAt:
      on && demoRelay.timerMinutes
        ? Date.now() + demoRelay.timerMinutes * 60000
        : null,
  };
  publishDemo();
  return demoRelay;
}
export function demoSnapshot(range: HistoryRange = "24h"): HomeSnapshot {
  const now = new Date();
  const history = Array.from(
    {
      length:
        range === "1h" ? 13 : range === "24h" ? 49 : range === "7d" ? 85 : 121,
    },
    (_, i) => {
      const count =
        range === "1h" ? 12 : range === "24h" ? 48 : range === "7d" ? 84 : 120;
      const timestamp = new Date(
        now.getTime() - ((count - i) / count) * rangeHours[range] * 3600000,
      );
      const hour = timestamp.getHours() + timestamp.getMinutes() / 60;
      const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
      return {
        timestamp: timestamp.toISOString(),
        indoorTemperature: 22.4 + Math.sin(i * 0.22) * 0.6,
        outdoorTemperature: 13 + Math.sin(((hour - 8) / 24) * Math.PI * 2) * 5,
        indoorHumidity: 46 + Math.sin(i * 0.3) * 3,
        outdoorHumidity: 65 + Math.cos(i * 0.24) * 6,
        solarPower: Math.round(daylight * 8.6 * 10) / 10,
        solarEnergy: 36 + ((timestamp.getUTCDate() * 7) % 20),
      };
    },
  );
  return {
    device: {
      connected: true,
      name: "ESP32-WROOM",
      lastUpdate: now.toISOString(),
    },
    indoor: { temperature: 22.4, humidity: 46 },
    outdoor: { temperature: 16.8, humidity: 64, trend: 0.4 },
    solar: { power: 7.6, voltage: 18.2, current: 0.418, dailyEnergy: 42.6 },
    battery: { voltage: 12.7, charge: null, measured: false },
    powerSource: "mains",
    mains: true,
    relay: demoRelay,
    weather: {
      temperature: 17,
      feelsLike: 16,
      wind: 12,
      gusts: 19,
      pressure: 1018,
      rain: 10,
      sunrise: "07:12",
      sunset: "18:24",
      condition: "cloudy",
    },
    forecast: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(now.getTime() + i * 86400000).toISOString(),
      min: 9 + (i % 3),
      max: 17 + (i % 4),
      rain: [10, 20, 65, 30, 10, 5, 15][i],
      condition: i === 2 ? "rain" : i % 3 === 0 ? "cloudy" : "sunny",
    })),
    hourly: Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(now.getTime() + i * 3600000).toISOString(),
      temperature: 17 + Math.sin(i * 0.6) * 3,
      rain: 10 + (i % 8) * 3,
      condition: i % 3 === 0 ? "cloudy" : "sunny",
    })),
    history,
    diagnostics: {
      uptime: 184320,
      signal: -54,
      firmware: "Demo · 2.0.0",
      consumption: null,
    },
  };
}
export { parseLiveSnapshot, getLiveSnapshot } from "./esp32";
export { validateEndpoint } from "@/lib/endpoint";
