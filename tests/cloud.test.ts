import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CloudStore } from "../src/lib/cloud-store";
import { liveFixture } from "./fixtures";
import { parseLiveSnapshot } from "../src/services/esp32";
import { POST as sync } from "../src/app/api/device/sync/route";

test("cloud persists readings, ages sensors and refuses offline relay commands", () => {
  const directory = mkdtempSync(join(tmpdir(), "home-cloud-"));
  const path = join(directory, "home.sqlite");
  const now = Date.now(),
    state = liveFixture();
  let store = new CloudStore(path);
  store.sync({ protocolVersion: 1, sequence: 1, state }, state.deviceId, now);
  assert.equal(
    parseLiveSnapshot(store.state(now + 1000)).indoor.temperature,
    23,
  );
  assert.equal(
    parseLiveSnapshot(store.state(now + 14500)).indoor.temperature,
    null,
  );
  assert.throws(() => store.state(now + 15001), /neposílá/);
  assert.throws(() => store.enqueue(1, { state: true }, now + 15001));
  assert.equal(store.history(288).records.length, 1);
  store.close();
  store = new CloudStore(path);
  assert.equal(
    parseLiveSnapshot(store.state(now + 1000)).indoor.temperature,
    23,
  );
  store.close();
  rmSync(directory, { recursive: true });
});

test("cloud relays wait for matching GPIO ACK, deduplicate and expire old commands", () => {
  const store = new CloudStore(":memory:"),
    state = liveFixture(),
    now = Date.now();
  const send = (sequence: number, extra = {}, time = now) =>
    store.sync(
      { protocolVersion: 1, sequence, state, ...extra },
      state.deviceId,
      time,
    );
  send(1);
  const input = {
    state: true,
    requestId: "cloud-command-1",
    bootId: state.bootId,
    expectedVersion: 2,
  };
  const id = store.enqueue(1, input, now);
  assert.equal(store.enqueue(1, input, now), id);
  assert.equal(store.result(id, now), null);
  assert.throws(
    () => store.enqueue(1, { ...input, requestId: "other" }, now),
    /předchozí/,
  );
  assert.equal(send(2).command?.requestId, id);
  const relay = { ...state.lighting.kitchenLed, commandedOn: true, version: 3 };
  const result = {
    apiVersion: 1,
    channel: 1,
    applied: true,
    requestId: id,
    bootId: state.bootId,
    requestedState: true,
    appliedVersion: 3,
    relays: { "1": relay },
  };
  assert.throws(
    () =>
      send(3, {
        ack: {
          channel: 1,
          requestId: id,
          status: 200,
          result: { ...result, bootId: "wrong" },
        },
      }),
    /potvrzení/,
  );
  state.lighting.kitchenLed = relay;
  send(3, { ack: { channel: 1, requestId: id, status: 200, result } });
  assert.equal(store.result(id, now)?.status, 200);
  const pending = store.enqueue(
    1,
    {
      state: false,
      requestId: "expire",
      bootId: state.bootId,
      expectedVersion: 3,
    },
    now,
  );
  assert.equal(store.result(pending, now + 10001)?.status, 408);
  assert.equal(send(4, {}, now + 10001).command, null);
  send(5);
  assert.throws(
    () => store.enqueue(1, { ...input, requestId: "conflict" }, now),
    /změnily/,
  );
  store.enqueue(1, { state: false, requestId: "restart" }, now);
  state.bootId = "new-boot";
  state.uptimeSeconds = 1;
  send(1);
  assert.equal(store.result("restart", now)?.status, 409);
  state.bootId = "test-boot";
  assert.throws(() => send(50), /stará relace/);
  store.close();
});

test("repeated push cannot keep a cached device online; ingest authenticates and bounds data", async () => {
  const store = new CloudStore(":memory:"),
    state = liveFixture(),
    now = Date.now();
  const payload = { protocolVersion: 1, sequence: 1, state };
  store.sync(payload, state.deviceId, now);
  store.sync(payload, state.deviceId, now + 10000);
  assert.throws(() => store.state(now + 15001));
  assert.throws(() => store.sync(payload, "another-device", now));
  store.close();
  process.env.ESP32_TRANSPORT = "cloud";
  process.env.DEVICE_TOKEN = "test-cloud-token-00000000000000000000000";
  const request = (body: string, token = "bad") =>
    new Request("https://example.test/api/device/sync", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body,
    });
  try {
    assert.equal((await sync(request(JSON.stringify(payload)))).status, 401);
    assert.equal(
      (await sync(request("x".repeat(24577), process.env.DEVICE_TOKEN))).status,
      400,
    );
  } finally {
    delete process.env.ESP32_TRANSPORT;
    delete process.env.DEVICE_TOKEN;
  }
});
