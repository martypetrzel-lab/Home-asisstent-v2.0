import test from "node:test";
import assert from "node:assert/strict";
import { CloudStore } from "../src/lib/cloud-store";
import { parseLiveSnapshot, parseHistory } from "../src/services/esp32";
import { liveFixture } from "./fixtures";

test("BMP280 pressure survives cloud storage and history; stale pressure is unavailable", () => {
  const now = Date.now();
  const state = liveFixture();
  Object.assign(state.climate.indoor, {
    sensorModel: "BMP280",
    pressureHpa: 992.4,
    humidityPct: null,
  });
  Object.assign(state.climate.outdoor, {
    sensorModel: "BMP280",
    available: true,
    stale: false,
    ageMs: 0,
    temperatureC: 12,
    pressureHpa: 992.8,
    humidityPct: null,
  });
  const store = new CloudStore(":memory:");
  try {
    store.sync({ protocolVersion: 1, sequence: 1, state }, state.deviceId, now);
    const parsed = parseLiveSnapshot(store.state(now));
    assert.equal(parsed.indoor.pressure, 992.4);
    assert.equal(parsed.outdoor.pressure, 992.8);
    assert.equal(parsed.indoor.humidity, null);
    state.climate.indoor.temperatureC = 85;
    assert.equal(parseLiveSnapshot(state).indoor.temperature, 85);
    const history = parseHistory(store.history(288, "24h", now));
    assert.equal(history.history[0].indoorPressure, 992.4);
    assert.equal(
      parseLiveSnapshot(store.state(now + 14500)).indoor.pressure,
      null,
    );
    state.climate.indoor = {
      ...state.climate.indoor,
      pressureHpa: 1200,
    } as typeof state.climate.indoor;
    assert.equal(parseLiveSnapshot(state).indoor.pressure, null);
  } finally {
    store.close();
  }
});
