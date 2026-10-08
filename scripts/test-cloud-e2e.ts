import assert from "node:assert/strict";
import { liveFixture } from "../tests/fixtures";
const origin = "http://localhost:3002"; // Restricted to the local test server.
const token = "cloud-e2e-test-000000000000000000000000";
const state = {
  ...liveFixture(),
  bootId: `e2e-${Date.now()}`,
  relays: {
    "1": {
      commandedOn: false,
      version: 0,
      controlAvailable: true,
      feedbackAvailable: false,
      physicalOn: null,
    },
    "2": {
      commandedOn: false,
      version: 0,
      controlAvailable: true,
      feedbackAvailable: false,
      physicalOn: null,
    },
  },
};
let sequence = 0;
let ack: unknown = null;
async function push() {
  state.timestamp = new Date().toISOString();
  state.uptimeSeconds++;
  const response = await fetch(origin + "/api/device/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      protocolVersion: 1,
      sequence: ++sequence,
      state,
      ack,
    }),
  });
  assert.equal(response.status, 200, await response.clone().text());
  const value = await response.json();
  ack = null;
  if (value.command) {
    const cmd = value.command,
      channel = String(cmd.channel) as "1" | "2";
    const relay = state.relays[channel];
    assert.equal(cmd.bootId, state.bootId);
    assert.equal(cmd.expectedVersion, relay.version);
    assert.ok(cmd.expiresAtMs > Date.now());
    if (relay.commandedOn !== cmd.state) relay.version++;
    relay.commandedOn = cmd.state;
    ack = {
      requestId: cmd.requestId,
      channel: cmd.channel,
      status: 200,
      result: {
        apiVersion: 1,
        channel: cmd.channel,
        applied: true,
        requestId: cmd.requestId,
        bootId: state.bootId,
        appliedVersion: relay.version,
        requestedState: relay.commandedOn,
        relays: { [channel]: relay },
      },
    };
  }
}
async function main() {
  await push();
  assert.equal((await fetch(origin + "/api/esp32/state")).status, 401);
  const session = await fetch(origin + "/api/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify({ password: "cloud-e2e-password-0000" }),
  });
  assert.equal(session.status, 200);
  const cookie = session.headers.get("set-cookie")!.split(";")[0];
  let running = true;
  const pump = (async () => {
    while (running) {
      await new Promise((r) => setTimeout(r, 200));
      if (running) await push();
    }
  })();
  try {
    for (const channel of [1, 2]) {
      const response = await fetch(origin + `/api/esp32/relays/${channel}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          Cookie: cookie,
        },
        body: JSON.stringify({
          state: true,
          requestId: `e2e-command-${channel}-${Date.now()}`,
          bootId: state.bootId,
          expectedVersion: 0,
        }),
      });
      assert.equal(response.status, 200, await response.clone().text());
      assert.equal((await response.json()).applied, true);
    }
    const response = await fetch(origin + "/api/esp32/state", {
      headers: { Cookie: cookie },
    });
    const snapshot = await response.json();
    assert.equal(snapshot.transport, "cloud");
    assert.equal(snapshot.relays["1"].commandedOn, true);
    assert.equal(snapshot.relays["2"].commandedOn, true);
    assert.equal(
      (await fetch(origin + "/api/config").then((r) => r.json())).defaultMode,
      "live",
    );
    console.log(
      "Cloud HTTP E2E passed: authenticated ingest, session, both relay ACKs, live default.",
    );
    if (process.argv.includes("--preview")) {
      console.log("Serving test readings for UI preview; stop with Ctrl+C.");
      await new Promise(() => {});
    }
  } finally {
    running = false;
    await pump;
  }
}
void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
