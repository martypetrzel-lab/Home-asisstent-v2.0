import type { HomeSnapshot, HistoryRecord, RelayStatus } from "@/types";
import { emptySnapshot } from "./snapshot";
import { validateEndpoint } from "@/lib/endpoint";
export const object = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const finite = (v: unknown, min = -Infinity, max = Infinity): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max
    ? v
    : null;
const text = (v: unknown): string | null => (typeof v === "string" ? v : null);
export function apiBase(endpoint: string) {
  return endpoint && endpoint !== "/api/esp32"
    ? validateEndpoint(endpoint)
    : "/api/esp32";
}
export class Esp32Error extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}
export async function apiRequest(
  endpoint: string,
  path: string,
  init: RequestInit = {},
  signal?: AbortSignal,
) {
  let response: Response;
  try {
    response = await fetch(`${apiBase(endpoint)}/${path}`, {
      ...init,
      cache: "no-store",
      credentials: apiBase(endpoint) === "/api/esp32" ? "same-origin" : "omit",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
        : AbortSignal.timeout(8000),
    });
  } catch {
    throw new Esp32Error(
      "ESP32 není připojeno. Zkontrolujte síť a místní bránu.",
    );
  }
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Esp32Error("API neposlalo platná data JSON.", response.status);
  }
  if (!response.ok) {
    const error = object(object(value).error);
    throw new Esp32Error(
      text(error.message) || `API odpovědělo chybou ${response.status}.`,
      response.status,
    );
  }
  return value;
}
function climate(value: unknown) {
  const raw = object(value),
    age = finite(raw.ageMs, 0);
  const available =
    raw.available === true &&
    raw.stale !== true &&
    age !== null &&
    age <= 15000;
  return {
    temperature: available ? finite(raw.temperatureC, -40, 80) : null,
    humidity: available ? finite(raw.humidityPct, 0, 100) : null,
    ageMs: age,
    available,
    minimum: finite(raw.minTemperatureC, -40, 80),
    maximum: finite(raw.maxTemperatureC, -40, 80),
  };
}
export function parseRelay(value: unknown): RelayStatus {
  const raw = object(value);
  if (
    typeof raw.commandedOn !== "boolean" ||
    finite(raw.version, 0) === null ||
    !Number.isInteger(raw.version)
  )
    throw new Esp32Error("ESP32 neposlalo platný stav relé.");
  return {
    on: raw.commandedOn,
    version: raw.version as number,
    acknowledgedAt: null,
    controlAvailable: raw.controlAvailable === true,
    feedbackAvailable: raw.feedbackAvailable === true,
    physicalOn:
      raw.feedbackAvailable === true && typeof raw.physicalOn === "boolean"
        ? raw.physicalOn
        : null,
  };
}
export function parseLiveSnapshot(value: unknown): HomeSnapshot {
  const root = object(value),
    system = object(root.system);
  if (
    root.apiVersion !== 1 ||
    typeof root.deviceId !== "string" ||
    !root.deviceId ||
    typeof root.bootId !== "string" ||
    !root.bootId ||
    finite(root.uptimeSeconds, 0) === null
  )
    throw new Esp32Error("ESP32 neposlalo podporovaný stav API v1.");
  if (
    root.timestamp !== null &&
    (typeof root.timestamp !== "string" ||
      !Number.isFinite(Date.parse(root.timestamp)))
  )
    throw new Esp32Error("Neplatný čas ESP32.");
  const result = emptySnapshot(),
    climates = object(root.climate),
    solar = object(root.solar),
    power = object(root.power);
  result.device = {
    connected: true,
    name: root.deviceId,
    lastUpdate: new Date().toISOString(),
    measurementTimestamp: root.timestamp as string | null,
    bootId: root.bootId,
  };
  result.indoor = climate(climates.indoor);
  result.outdoor = { ...climate(climates.outdoor), trend: null };
  const age = finite(solar.ageMs, 0),
    valid =
      solar.available === true &&
      solar.stale !== true &&
      age !== null &&
      age <= 15000;
  result.solar = {
    power: valid ? finite(solar.powerW, -100, 100) : null,
    voltage: valid ? finite(solar.voltageV, 0, 26) : null,
    current: valid ? finite(solar.currentA, -3.2, 3.2) : null,
    dailyEnergy:
      solar.directionConfirmed === true ? finite(solar.energyTodayWh) : null,
    totalEnergy:
      solar.directionConfirmed === true ? finite(solar.energyTotalWh) : null,
    minimum: finite(solar.minPowerW, -100, 100),
    maximum: finite(solar.maxPowerW, -100, 100),
    rawCurrentMa: valid ? finite(solar.rawCurrentMa, -3200, 3200) : null,
    shuntMv: valid ? finite(solar.shuntVoltageMv, -320, 320) : null,
    ageMs: age,
    location: text(solar.measurementLocation) || undefined,
    directionConfirmed: solar.directionConfirmed === true,
    energyPartial: solar.energyPartial !== false,
  };
  result.relay = parseRelay(
    object(root.relays)["1"] || object(root.lighting).kitchenLed,
  );
  result.powerSource =
    power.statusInstalled === true
      ? power.activeSource === "MAINS"
        ? "mains"
        : power.activeSource === "BATTERY" && power.backupVerified === true
          ? "battery"
          : "unknown"
      : "unknown";
  // No installed battery monitor exists in this hardware revision. Ignore any unsolicited fields.
  result.diagnostics = {
    uptime: finite(root.uptimeSeconds, 0),
    signal: finite(system.wifiRssiDbm, -127, 0),
    firmware: text(system.firmwareVersion),
    consumption: null,
    ip: text(system.ip),
    freeHeap: finite(system.freeHeapBytes, 0),
    build: text(system.buildTimestamp),
    rebootReason: finite(system.rebootReason, 0),
    timeSynchronized: system.timeSynchronized === true,
    storageReady: system.storageReady === true,
  };
  return result;
}
export async function getLiveSnapshot(endpoint: string, signal?: AbortSignal) {
  return parseLiveSnapshot(await apiRequest(endpoint, "state", {}, signal));
}
export function parseHistory(value: unknown) {
  const root = object(value);
  if (
    root.apiVersion !== 1 ||
    !Array.isArray(root.records) ||
    !Array.isArray(root.events)
  )
    throw new Esp32Error("Neplatná historie ESP32.");
  const history: HistoryRecord[] = root.records.slice(-288).flatMap((value) => {
    const r = object(value),
      epoch = finite(r.epochSeconds, 1700000000, 4102444800);
    if (epoch === null) return [];
    return [
      {
        timestamp: new Date(epoch * 1000).toISOString(),
        indoorTemperature: finite(r.indoorTemperature, -40, 80),
        outdoorTemperature: finite(r.outdoorTemperature, -40, 80),
        indoorHumidity: finite(r.indoorHumidity, 0, 100),
        outdoorHumidity: finite(r.outdoorHumidity, 0, 100),
        solarPower: finite(r.solarPower, -100, 100),
        solarEnergy: finite(r.solarEnergy),
      },
    ];
  });
  const events = root.events.slice(-48).map((value) => {
    const e = object(value),
      epoch = finite(e.epochSeconds, 1700000000, 4102444800);
    return {
      timestamp: epoch === null ? null : new Date(epoch * 1000).toISOString(),
      kind: text(e.kind) || "unknown",
      detail: text(e.detail) || "",
      uptime: finite(e.uptimeSeconds, 0) || 0,
    };
  });
  return { history, events };
}
let commanding = false;
export async function setLiveRelay(
  endpoint: string,
  on: boolean,
  current: RelayStatus,
  bootId: string | undefined,
): Promise<RelayStatus> {
  if (apiBase(endpoint) !== "/api/esp32")
    throw new Esp32Error(
      "Ovládání používá přihlášenou místní bránu. Vymažte přímou adresu API v Nastavení.",
    );
  if (commanding)
    throw new Esp32Error("Předchozí příkaz ještě čeká na potvrzení.");
  if (
    !current.controlAvailable ||
    !Number.isInteger(current.version) ||
    !bootId
  )
    throw new Esp32Error(
      "Relé není připraveno. Ověřte polaritu a aktuální spojení.",
    );
  commanding = true;
  const requestId = crypto.randomUUID();
  try {
    const root = object(
      await apiRequest(endpoint, "relays/1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: on,
          requestId,
          expectedVersion: current.version,
          bootId,
        }),
      }),
    );
    if (
      root.apiVersion !== 1 ||
      root.applied !== true ||
      root.channel !== 1 ||
      root.requestId !== requestId ||
      root.bootId !== bootId ||
      root.requestedState !== on
    )
      throw new Esp32Error(
        "ESP32 nepotvrdilo tento příkaz GPIO. Obnovte stav.",
      );
    const relay = parseRelay(
      object(root.relays)["1"] || object(root.lighting).kitchenLed,
    );
    if (relay.on !== on || relay.version !== root.appliedVersion)
      throw new Esp32Error(
        "Po příkazu se stav změnil. Načítám aktuální stav.",
        409,
      );
    return { ...relay, acknowledgedAt: new Date().toISOString() };
  } finally {
    commanding = false;
  }
}
