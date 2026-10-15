import test from "node:test";
import assert from "node:assert/strict";
import {
  parseLiveSnapshot,
  parseHistory,
  setLiveRelay,
} from "../src/services/esp32";
import { liveFixture } from "./fixtures";
import {
  makeSession,
  validSession,
  sameOrigin,
  readJson,
  cookieHeader,
} from "../src/lib/server-auth";
import {
  GET as proxyGet,
  POST as proxyPost,
} from "../src/app/api/esp32/[...path]/route";
import { POST as login } from "../src/app/api/session/route";
test("live data accepts unsynchronized clock but rejects failed/stale sensors and invented battery", () => {
  const f = liveFixture();
  f.timestamp = null;
  f.climate.indoor.ageMs = 15001;
  const data = parseLiveSnapshot(f);
  assert.equal(data.device.connected, true);
  assert.equal(data.indoor.temperature, null);
  assert.equal(data.battery.voltage, null);
  assert.equal(data.powerSource, "unknown");
  f.solar.powerW = -7.2;
  assert.equal(parseLiveSnapshot(f).solar.power, -7.2);
  f.apiVersion = 99;
  assert.throws(() => parseLiveSnapshot(f));
});
test("history preserves gaps and excludes records without a wall clock", () => {
  const value = parseHistory({
    apiVersion: 1,
    records: [
      { epochSeconds: null },
      { epochSeconds: 1800000000, indoorTemperature: null, solarPower: -2 },
    ],
    events: [{ epochSeconds: null, kind: "restart", uptimeSeconds: 3 }],
  });
  assert.equal(value.history.length, 1);
  assert.equal(value.history[0].indoorTemperature, null);
  assert.equal(value.history[0].solarPower, -2);
  assert.equal(value.events[0].timestamp, null);
});
test("v1 relays take precedence over compatibility alias and solar totals preserve signed diagnostics", () => {
  const f = liveFixture();
  const data = parseLiveSnapshot({
    ...f,
    relays: {
      "1": { ...f.lighting.kitchenLed, commandedOn: true, version: 9 },
      "2": { ...f.lighting.kitchenLed, commandedOn: false },
    },
  });
  assert.equal(data.relay.on, true);
  assert.equal(data.relay.version, 9);
  assert.equal(data.relay2?.on,false);
  assert.equal(data.solar.totalEnergy, 123.4);
  assert.equal(data.solar.minimum, -0.2);
  assert.equal(data.solar.rawCurrentMa, 400);
  f.solar.directionConfirmed = false;
  assert.equal(parseLiveSnapshot(f).solar.totalEnergy, null);
});
test("signed sessions, origin checks, bounded bodies and fail-closed gateway", async () => {
  const original = { ...process.env };
  const originalFetch = global.fetch;
  try {
    process.env.DASHBOARD_PASSWORD = "test-password-long-enough";
    process.env.SESSION_SECRET =
      "test-session-secret-long-enough-32-characters";
    delete process.env.DASHBOARD_ORIGIN;
    const now = Date.now();
    const token = makeSession(now);
    const headers = {
      cookie: `home-session=${token}`,
      origin: "http://localhost:3000",
      "content-type": "application/json",
    };
    const request = new Request("http://localhost:3000/api/esp32/state", {
      headers,
    });
    assert.equal(validSession(request, now), true);
    assert.equal(validSession(request, now + 43200001), false);
    assert.equal(
      validSession(
        new Request(request.url, {
          headers: { cookie: `home-session=${token}x` },
        }),
      ),
      false,
    );
    assert.equal(sameOrigin(request), true);
    assert.equal(
      sameOrigin(
        new Request(request.url, {
          headers: { origin: "https://evil.example" },
        }),
      ),
      false,
    );
    assert.match(cookieHeader(request, token), /HttpOnly; SameSite=Strict/);
    await assert.rejects(
      readJson(
        new Request(request.url, {
          method: "POST",
          headers,
          body: '"oversized"',
        }),
        3,
      ),
    );
    const context = { params: Promise.resolve({ path: ["state"] }) };
    assert.equal(
      (await proxyGet(new Request(request.url), context)).status,
      401,
    );
    delete process.env.ESP32_API_URL;
    assert.equal((await proxyGet(request, context)).status, 503);
    process.env.ESP32_API_URL = "http://esp32.local/api";
    process.env.ESP32_API_TOKEN = "test-device-token-long-enough-32-characters";
    let calls = 0;
    global.fetch = async (url, init) => {
      calls++;
      assert.equal(String(url), "http://esp32.local/api/state");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${process.env.ESP32_API_TOKEN}`,
      );
      assert.equal(new Headers(init?.headers).get("cookie"), null);
      return Response.json({ apiVersion: 1 });
    };
    const response = await proxyGet(request, context);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(
      JSON.stringify(await response.json()).includes(
        process.env.ESP32_API_TOKEN,
      ),
      false,
    );
    assert.equal(
      (
        await proxyPost(
          new Request(request.url, {
            method: "POST",
            headers: { ...headers, origin: "https://evil.example" },
            body: '{"state":true}',
          }),
          { params: Promise.resolve({ path: ["relay"] }) },
        )
      ).status,
      403,
    );
    assert.equal(calls, 1);
    for (const channel of [1, 2]) {
      global.fetch = async (url, init) => {
        assert.equal(String(url), `http://esp32.local/api/relays/${channel}`);
        assert.equal(init?.method, "POST");
        assert.deepEqual(JSON.parse(String(init?.body)), { state: true });
        return Response.json({ apiVersion: 1, channel, applied: true });
      };
      assert.equal(
        (
          await proxyPost(
            new Request(`http://localhost:3000/api/esp32/relays/${channel}`, {
              method: "POST",
              headers,
              body: '{"state":true}',
            }),
            { params: Promise.resolve({ path: ["relays", String(channel)] }) },
          )
        ).status,
        200,
      );
    }
    assert.equal(
      (
        await proxyPost(
          new Request(request.url, {
            method: "POST",
            headers,
            body: '{"state":true}',
          }),
          { params: Promise.resolve({ path: ["relays", "3"] }) },
        )
      ).status,
      404,
    );
    const loggedIn = await login(
      new Request("http://localhost:3000/api/session", {
        method: "POST",
        headers,
        body: JSON.stringify({ password: process.env.DASHBOARD_PASSWORD }),
      }),
    );
    assert.equal(loggedIn.status, 200);
    assert.match(loggedIn.headers.get("set-cookie")!, /HttpOnly/);
    global.fetch = async () => {
      throw new Error("offline");
    };
    assert.equal((await proxyGet(request, context)).status, 502);
  } finally {
    process.env = original;
    global.fetch = originalFetch;
  }
});
test("relay requires matching applied acknowledgement, handles conflicts and blocks rapid taps", async () => {
  const originalFetch = global.fetch;
  const current = {
    on: false,
    version: 2,
    controlAvailable: true,
    acknowledgedAt: null,
  };
  try {
    global.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      return Response.json({
        apiVersion: 1,
        bootId: "boot",
        requestId: body.requestId,
        requestedState: true,
        applied: true,
        channel: 1,
        appliedVersion: 3,
        lighting: {
          kitchenLed: {
            commandedOn: true,
            version: 3,
            controlAvailable: true,
            feedbackAvailable: false,
          },
        },
      });
    };
    assert.equal((await setLiveRelay("", true, current, "boot")).on, true);
    global.fetch = async () =>
      Response.json({ error: { message: "Konflikt" } }, { status: 409 });
    await assert.rejects(setLiveRelay("", true, current, "boot"), /Konflikt/);
    global.fetch = async () =>
      Response.json({
        apiVersion: 1,
        applied: true,
        channel: 1,
        requestId: "wrong",
      });
    await assert.rejects(
      setLiveRelay("", true, current, "boot"),
      /nepotvrdilo/,
    );
    let release!: () => void;
    global.fetch = async () => {
      await new Promise<void>((r) => (release = r));
      throw new Error("timeout");
    };
    const pending = setLiveRelay("", true, current, "boot");
    await assert.rejects(setLiveRelay("", true, current, "boot"), /ještě čeká/);
    release();
    await assert.rejects(pending, /ESP32 není připojeno/);
  } finally {
    global.fetch = originalFetch;
  }
});
