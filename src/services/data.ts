import type { HomeSnapshot, HistoryRange, RelayStatus } from "@/types";
export const rangeHours: Record<HistoryRange, number> = {
  "1h": 1,
  "24h": 24,
  "7d": 168,
  "30d": 720,
};
export function emptySnapshot(): HomeSnapshot {
  return {
    device: { connected: false, name: "ESP32-WROOM", lastUpdate: null },
    indoor: { temperature: null, humidity: null },
    outdoor: { temperature: null, humidity: null, trend: null },
    solar: { power: null, voltage: null, current: null, dailyEnergy: null },
    battery: { voltage: null, charge: null, measured: false },
    powerSource: "unknown",
    mains: null,
    relay: { on: null, acknowledgedAt: null },
    weather: {
      temperature: null,
      feelsLike: null,
      wind: null,
      gusts: null,
      pressure: null,
      rain: null,
      sunrise: null,
      sunset: null,
      condition: null,
    },
    forecast: [],
    hourly: [],
    history: [],
    diagnostics: {
      uptime: null,
      signal: null,
      firmware: null,
      consumption: null,
    },
  };
}
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
const nullableNumber = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const record = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
// Only installed sensors are accepted. Future power hardware and internet weather
// remain unavailable until separate, validated integrations are implemented.
export function parseLiveSnapshot(value: unknown): HomeSnapshot {
  const root = record(value),
    device = record(root.device),
    indoor = record(root.indoor),
    outdoor = record(root.outdoor),
    solar = record(root.solar),
    relay = record(root.relay);
  if (
    device.connected !== true ||
    typeof device.lastUpdate !== "string" ||
    !Number.isFinite(Date.parse(device.lastUpdate))
  )
    throw new Error("Zařízení neposlalo platný stav a čas měření.");
  if (Math.abs(Date.now() - Date.parse(device.lastUpdate)) > 120000)
    throw new Error("Poslední měření je starší než dvě minuty.");
  const result = emptySnapshot();
  result.device = {
    connected: true,
    name: "ESP32-WROOM",
    lastUpdate: device.lastUpdate,
  };
  result.indoor = {
    temperature: nullableNumber(indoor.temperature),
    humidity: nullableNumber(indoor.humidity),
  };
  result.outdoor = {
    temperature: nullableNumber(outdoor.temperature),
    humidity: nullableNumber(outdoor.humidity),
    trend: null,
  };
  result.solar = {
    power: nullableNumber(solar.power),
    voltage: nullableNumber(solar.voltage),
    current: nullableNumber(solar.current),
    dailyEnergy: nullableNumber(solar.dailyEnergy),
  };
  result.relay = {
    on: typeof relay.on === "boolean" ? relay.on : null,
    acknowledgedAt:
      typeof relay.acknowledgedAt === "string" ? relay.acknowledgedAt : null,
  };
  return result;
}
export function validateEndpoint(endpoint: string) {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Zadejte platnou adresu API včetně http:// nebo https://.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "API musí používat HTTP(S), bez hesla, parametrů a fragmentu v adrese.",
    );
  return url.toString().replace(/\/$/, "");
}
export async function getLiveSnapshot(endpoint: string, signal?: AbortSignal) {
  if (!endpoint)
    throw new Error("ESP32 není připojeno. Nastavte adresu API v Nastavení.");
  const base = validateEndpoint(endpoint);
  let response: Response;
  try {
    response = await fetch(`${base}/status`, {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(6000)])
        : AbortSignal.timeout(6000),
      cache: "no-store",
      credentials: "omit",
    });
  } catch {
    throw new Error(
      "Spojení s ESP32 selhalo. Zkontrolujte adresu, síť a oprávnění CORS.",
    );
  }
  if (!response.ok)
    throw new Error(`API odpovědělo chybou ${response.status}.`);
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error("API neposlalo platná data JSON.");
  }
  return parseLiveSnapshot(value);
}
