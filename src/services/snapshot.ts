import type { HomeSnapshot } from "@/types";
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
