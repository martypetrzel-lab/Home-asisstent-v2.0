import { test } from "node:test";
import assert from "node:assert/strict";
import { liveFixture } from "./fixtures";
import {
  demoSnapshot,
  emptySnapshot,
  getLiveSnapshot,
  parseLiveSnapshot,
  rangeHours,
  setDemoRelay,
  setDemoTimer,
  validateEndpoint,
} from "../src/services/data";

test("live defaults contain no simulated measurements or installed future hardware", () => {
  const data = emptySnapshot();
  assert.equal(data.indoor.temperature, null);
  assert.equal(data.solar.power, null);
  assert.equal(data.battery.voltage, null);
  assert.equal(data.battery.charge, null);
  assert.equal(data.powerSource, "unknown");
  assert.equal(data.relay.on, null);
  assert.deepEqual(data.history, []);
  assert.deepEqual(data.forecast, []);
});
test("live parser accepts installed sensors, ignores demo and future hardware", () => {
  const fixture = liveFixture();
  fixture.climate.indoor.temperatureC = 20.5;
  fixture.climate.indoor.humidityPct = NaN;
  const data = parseLiveSnapshot(fixture);
  assert.equal(data.indoor.temperature, 20.5);
  assert.equal(data.indoor.humidity, null);
  assert.equal(data.solar.power, 7.2);
  assert.equal(data.solar.current, 0.4);
  assert.equal(data.battery.voltage, null);
  assert.equal(data.battery.charge, null);
  assert.equal(data.mains, null);
  assert.equal(data.powerSource, "unknown");
  assert.deepEqual(data.forecast, []);
  assert.deepEqual(data.history, []);
});
test("missing, invalid, stale and offline device reports are rejected", () => {
  for (const value of [
    null,
    {},
    { device: { connected: true, lastUpdate: "invalid" } },
    { device: { connected: false, lastUpdate: new Date().toISOString() } },
    {
      device: {
        connected: true,
        lastUpdate: new Date(Date.now() - 180000).toISOString(),
      },
    },
  ])
    assert.throws(() => parseLiveSnapshot(value));
});
test("endpoint rejects credentials, tokens in query strings and unsafe protocols", () => {
  assert.equal(
    validateEndpoint("http://192.168.1.2/api/"),
    "http://192.168.1.2/api",
  );
  for (const value of [
    "javascript:alert(1)",
    "ftp://device",
    "https://user:secret@device",
    "https://device?token=secret",
    "https://device#token",
    "invalid",
  ])
    assert.throws(() => validateEndpoint(value));
});
test("demo histories cover requested ranges with bounded sensor values", () => {
  for (const range of ["1h", "24h", "7d", "30d"] as const) {
    const data = demoSnapshot(range);
    const first = Date.parse(data.history[0].timestamp),
      last = Date.parse(data.history.at(-1)!.timestamp);
    assert.equal(last - first, rangeHours[range] * 3600000);
    assert.ok(
      data.history.every(
        (d) =>
          d.solarPower !== null &&
          d.indoorHumidity !== null &&
          d.solarPower >= 0 &&
          d.solarPower <= 10 &&
          d.indoorHumidity >= 0 &&
          d.indoorHumidity <= 100,
      ),
    );
  }
});
test("relay waits for acknowledgement and demo timer persists across snapshots", async () => {
  setDemoTimer(5);
  const before = demoSnapshot().relay.on;
  const pending = setDemoRelay(!before);
  assert.equal(demoSnapshot().relay.on, before);
  const confirmed = await pending;
  assert.equal(confirmed.on, !before);
  assert.ok(confirmed.acknowledgedAt);
  assert.equal(demoSnapshot().relay.timerMinutes, 5);
  if (confirmed.on) assert.ok(confirmed.turnOffAt! > Date.now());
  await setDemoRelay(false);
  assert.equal(demoSnapshot().relay.turnOffAt, null);
  setDemoTimer(0);
});
test("failed live requests reject without silently returning demo data", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("offline");
  });
  await assert.rejects(
    getLiveSnapshot("http://device.local"),
    /není připojeno/,
  );
  await assert.rejects(getLiveSnapshot(""), /není připojeno/);
});
test("live service requests the v1 state endpoint with no cached or cross-origin credentials", async (t) => {
  let requestUrl = "";
  let options: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    requestUrl = url;
    options = init;
    return new Response(JSON.stringify(liveFixture()), { status: 200 });
  });
  const data = await getLiveSnapshot("http://device.local/api");
  assert.equal(requestUrl, "http://device.local/api/state");
  assert.equal(options?.cache, "no-store");
  assert.equal(options?.credentials, "omit");
  assert.equal(data.indoor.temperature, 23);
  assert.equal(data.solar.power, 7.2);
});
