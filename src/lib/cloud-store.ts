import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { object, parseLiveSnapshot, parseRelay } from "@/services/esp32";

export class CloudError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const cloudEnabled = () => process.env.ESP32_TRANSPORT === "cloud";
function fail(message: string, status = 400): never {
  throw new CloudError(message, status);
}
const identifier = (v: unknown, max = 64): v is string =>
  typeof v === "string" &&
  v.length > 0 &&
  v.length <= max &&
  /^[A-Za-z0-9_-]+$/.test(v);
const errorResult = (message: string) => ({
  apiVersion: 1,
  error: { message },
});
type StateRow = {
  payload: string;
  received: number;
  boot: string;
  sequence: number;
};
type CommandRow = {
  id: string;
  channel: number;
  desired: number;
  version: number;
  boot: string;
  expires: number;
  status: number;
  result: string | null;
};

// One device and one Railway replica. SQLite lives on the attached Railway volume.
export class CloudStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;
      CREATE TABLE IF NOT EXISTS device (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL,
        received INTEGER NOT NULL, boot TEXT NOT NULL, sequence INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS boots (id TEXT PRIMARY KEY, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS history (bucket INTEGER PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS commands (id TEXT PRIMARY KEY, channel INTEGER NOT NULL,
        desired INTEGER NOT NULL, version INTEGER NOT NULL, boot TEXT NOT NULL,
        expires INTEGER NOT NULL, status INTEGER NOT NULL DEFAULT 0, result TEXT);`);
  }
  close() {
    this.db.close();
  }
  private transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  private row() {
    return this.db.prepare("SELECT * FROM device WHERE id=1").get() as
      StateRow | undefined;
  }
  private event(
    kind: string,
    detail: string,
    now: number,
    boot: string,
    uptime: number,
  ) {
    this.db.prepare("INSERT INTO events(payload) VALUES(?)").run(
      JSON.stringify({
        kind,
        detail,
        epochSeconds: Math.floor(now / 1000),
        uptimeSeconds: uptime,
        bootId: boot,
        clockSource: "server_received",
      }),
    );
    this.db.exec(
      "DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY id DESC LIMIT 48)",
    );
  }
  private expire(now: number) {
    this.db
      .prepare(
        "UPDATE commands SET status=408,result=? WHERE status=0 AND expires<=?",
      )
      .run(
        JSON.stringify(
          errorResult("Platnost povelu vypršela; načtěte nový stav."),
        ),
        now,
      );
    this.db.prepare("DELETE FROM commands WHERE expires<?").run(now - 3600000);
  }
  sync(value: unknown, expectedDevice: string, now = Date.now()) {
    const input = object(value),
      state = object(input.state);
    if (
      input.protocolVersion !== 1 ||
      !Number.isSafeInteger(input.sequence) ||
      Number(input.sequence) < 1 ||
      state.deviceId !== expectedDevice ||
      !identifier(state.bootId, 40)
    )
      fail("Neplatná identita nebo formát zařízení.");
    if (
      Object.keys(input).some(
        (k) => !["protocolVersion", "sequence", "state", "ack"].includes(k),
      )
    )
      fail("Neznámé pole synchronizace.");
    parseLiveSnapshot(state);
    if (
      !Number.isSafeInteger(state.uptimeSeconds) ||
      Number(state.uptimeSeconds) < 0 ||
      (state.timestamp !== null &&
        Math.abs(now - Date.parse(String(state.timestamp))) > 300000)
    )
      fail("Neplatný čas nebo uptime zařízení.");
    if (object(state.relays)["2"]) parseRelay(object(state.relays)["2"]);
    return this.transaction(() => {
      this.expire(now);
      const previous = this.row();
      const duplicate =
        previous &&
        previous.boot === state.bootId &&
        Number(input.sequence) <= previous.sequence;
      if (
        previous &&
        previous.boot !== state.bootId &&
        this.db
          .prepare("SELECT id FROM boots WHERE id=?")
          .get(String(state.bootId))
      )
        fail("Odmítnuta stará relace po restartu zařízení.", 409);
      if (
        previous &&
        previous.boot === state.bootId &&
        !duplicate &&
        Number(state.uptimeSeconds) <
          Number(object(JSON.parse(previous.payload)).uptimeSeconds)
      )
        fail("Uptime se v jedné relaci nesmí vrátit zpět.", 409);
      if (!duplicate) {
        if (!previous || previous.boot !== state.bootId) {
          this.db
            .prepare("INSERT OR IGNORE INTO boots(id,created) VALUES(?,?)")
            .run(String(state.bootId), now);
          this.db
            .prepare(
              "UPDATE commands SET status=409,result=? WHERE status=0 AND boot<>?",
            )
            .run(
              JSON.stringify(
                errorResult("ESP32 se restartovalo. Načtěte nový stav."),
              ),
              String(state.bootId),
            );
          this.event(
            "restart",
            "Cloud přijal novou relaci ESP32",
            now,
            String(state.bootId),
            Number(state.uptimeSeconds),
          );
        }
        // Only the documented state sections are persisted; transport never stores credentials.
        const clean = Object.fromEntries(
          [
            "apiVersion",
            "deviceId",
            "bootId",
            "timestamp",
            "uptimeSeconds",
            "climate",
            "solar",
            "lighting",
            "relays",
            "power",
            "system",
          ]
            .filter((k) => k in state)
            .map((k) => [k, state[k]]),
        );
        this.db
          .prepare(
            `INSERT INTO device VALUES(1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          payload=excluded.payload,received=excluded.received,boot=excluded.boot,sequence=excluded.sequence`,
          )
          .run(
            JSON.stringify(clean),
            now,
            String(state.bootId),
            Number(input.sequence),
          );
        const parsed = parseLiveSnapshot(this.state(now));
        const bucket = Math.floor(now / 300000);
        this.db
          .prepare("INSERT OR IGNORE INTO history(bucket,payload) VALUES(?,?)")
          .run(
            bucket,
            JSON.stringify({
              epochSeconds:
                state.timestamp === null
                  ? null
                  : Math.floor(Date.parse(String(state.timestamp)) / 1000),
              receivedAt: new Date(now).toISOString(),
              bootId: state.bootId,
              uptimeSeconds: state.uptimeSeconds,
              indoorTemperature: parsed.indoor.temperature,
              outdoorTemperature: parsed.outdoor.temperature,
              indoorHumidity: parsed.indoor.humidity,
              outdoorHumidity: parsed.outdoor.humidity,
              solarPower: parsed.solar.power,
              solarEnergy: parsed.solar.dailyEnergy,
            }),
          );
        this.db.exec(
          "DELETE FROM history WHERE bucket NOT IN (SELECT bucket FROM history ORDER BY bucket DESC LIMIT 288)",
        );
      }
      if (input.ack !== undefined && input.ack !== null)
        this.ack(input.ack, state, now);
      const current = this.state(now);
      const pending = this.db
        .prepare(
          "SELECT * FROM commands WHERE status=0 ORDER BY expires LIMIT 1",
        )
        .get() as CommandRow | undefined;
      let command: Record<string, unknown> | null = null;
      if (pending) {
        const relay = parseRelay(
          object(current.relays)[String(pending.channel)] ||
            object(current.lighting).kitchenLed,
        );
        if (
          pending.boot !== current.bootId ||
          pending.version !== relay.version ||
          !relay.controlAvailable
        ) {
          this.db
            .prepare("UPDATE commands SET status=409,result=? WHERE id=?")
            .run(
              JSON.stringify(
                errorResult("Stav relé se změnil; načtěte jej znovu."),
              ),
              pending.id,
            );
        } else
          command = {
            channel: pending.channel,
            state: Boolean(pending.desired),
            expectedVersion: pending.version,
            bootId: pending.boot,
            requestId: pending.id,
            expiresAtMs: pending.expires,
            validForMs: pending.expires - now,
          };
      }
      return {
        protocolVersion: 1,
        accepted: !duplicate,
        serverTime: now,
        command,
      };
    });
  }
  private ack(value: unknown, state: Record<string, unknown>, now: number) {
    const ack = object(value),
      result = object(ack.result);
    if (
      !identifier(ack.requestId, 40) ||
      ![1, 2].includes(ack.channel as number) ||
      ![200, 400, 408, 409, 429, 503, 504].includes(ack.status as number)
    )
      fail("Neplatné potvrzení povelu.");
    const cmd = this.db
      .prepare("SELECT * FROM commands WHERE id=?")
      .get(String(ack.requestId)) as CommandRow | undefined;
    if (!cmd) return; // An old acknowledgement after database recovery cannot execute a command.
    if (cmd.channel !== ack.channel || cmd.boot !== state.bootId)
      fail("Potvrzení patří jiné relaci.", 409);
    if (cmd.status === 200) return;
    let canonical: Record<string, unknown>;
    if (ack.status === 200) {
      const relay = object(
        object(result.relays)[String(cmd.channel)] ||
          object(result.lighting).kitchenLed,
      );
      if (
        result.apiVersion !== 1 ||
        result.applied !== true ||
        result.channel !== cmd.channel ||
        result.requestId !== cmd.id ||
        result.bootId !== cmd.boot ||
        result.requestedState !== Boolean(cmd.desired) ||
        !Number.isInteger(result.appliedVersion) ||
        Number(result.appliedVersion) < cmd.version ||
        Number(result.appliedVersion) > cmd.version + 1 ||
        relay.commandedOn !== Boolean(cmd.desired) ||
        relay.version !== result.appliedVersion
      )
        fail("ESP32 neposlalo odpovídající GPIO potvrzení.");
      const confirmed = {
        commandedOn: relay.commandedOn,
        version: relay.version,
        controlAvailable: relay.controlAvailable === true,
        feedbackAvailable: false,
        physicalOn: null,
      };
      canonical = {
        apiVersion: 1,
        channel: cmd.channel,
        applied: true,
        requestId: cmd.id,
        bootId: cmd.boot,
        requestedState: Boolean(cmd.desired),
        appliedVersion: result.appliedVersion,
        relays: { [cmd.channel]: confirmed },
        ...(cmd.channel === 1 ? { lighting: { kitchenLed: confirmed } } : {}),
      };
      this.event(
        "relay",
        `ESP32 potvrdilo GPIO relé ${cmd.channel}: ${cmd.desired ? "zapnuto" : "vypnuto"}`,
        now,
        cmd.boot,
        Number(state.uptimeSeconds),
      );
    } else
      canonical = errorResult(
        String(object(result.error).message || "ESP32 odmítlo povel.").slice(
          0,
          200,
        ),
      );
    this.db
      .prepare("UPDATE commands SET status=?,result=? WHERE id=?")
      .run(Number(ack.status), JSON.stringify(canonical), cmd.id);
  }
  state(now = Date.now()): Record<string, unknown> {
    const row = this.row();
    if (!row || now - row.received > 15000 || row.received > now + 1000)
      fail("ESP32 neposílá data. Ověřte Wi-Fi, cloudový klíč a napájení.", 503);
    const value = JSON.parse(row.payload) as Record<string, unknown>;
    const transit =
      typeof value.timestamp === "string"
        ? Math.max(0, row.received - Date.parse(value.timestamp))
        : 0;
    for (const sensor of [
      object(object(value.climate).indoor),
      object(object(value.climate).outdoor),
      object(value.solar),
    ]) {
      if (typeof sensor.ageMs === "number")
        sensor.ageMs += Math.max(0, now - row.received) + transit;
      if (typeof sensor.ageMs !== "number" || sensor.ageMs > 15000) {
        sensor.available = false;
        sensor.stale = true;
        for (const name of [
          "temperatureC",
          "humidityPct",
          "voltageV",
          "shuntVoltageMv",
          "currentMa",
          "rawCurrentMa",
          "currentA",
          "powerW",
        ])
          if (name in sensor) sensor[name] = null;
      }
    }
    value.receivedAt = new Date(row.received).toISOString();
    value.transport = "cloud";
    return value;
  }
  history(limit: number) {
    const records = this.db
      .prepare("SELECT payload FROM history ORDER BY bucket DESC LIMIT ?")
      .all(limit)
      .reverse()
      .map((r) => JSON.parse(String(r.payload)));
    const events = this.db
      .prepare("SELECT payload FROM events ORDER BY id DESC LIMIT 48")
      .all()
      .reverse()
      .map((r) => JSON.parse(String(r.payload)));
    return {
      apiVersion: 1,
      records,
      events,
      capacity: 288,
      intervalSeconds: 300,
      clockSource: "device_measurement",
      storage: "railway_volume",
    };
  }
  enqueue(channel: number, value: unknown, now = Date.now()) {
    const body = object(value);
    if (
      ![1, 2].includes(channel) ||
      typeof body.state !== "boolean" ||
      Object.keys(body).some(
        (k) => !["state", "requestId", "expectedVersion", "bootId"].includes(k),
      ) ||
      (body.requestId !== undefined && !identifier(body.requestId, 40)) ||
      (body.bootId !== undefined && !identifier(body.bootId, 40)) ||
      (body.expectedVersion !== undefined &&
        (!Number.isInteger(body.expectedVersion) ||
          Number(body.expectedVersion) < 0))
    )
      fail("Neplatný příkaz relé.");
    return this.transaction(() => {
      this.expire(now);
      const state = this.state(now),
        relay = parseRelay(
          object(state.relays)[String(channel)] ||
            (channel === 1 ? object(state.lighting).kitchenLed : null),
        );
      const id = String(body.requestId ?? randomUUID());
      const existing = this.db
        .prepare("SELECT * FROM commands WHERE id=?")
        .get(id) as CommandRow | undefined;
      if (existing) {
        if (
          existing.channel !== channel ||
          Boolean(existing.desired) !== body.state ||
          (body.bootId && existing.boot !== body.bootId)
        )
          fail("requestId již patří jinému příkazu.", 409);
        return id;
      }
      if (!relay.controlAvailable) fail("Ovládání relé není dostupné.", 503);
      if (
        (body.bootId !== undefined && body.bootId !== state.bootId) ||
        (body.expectedVersion !== undefined &&
          body.expectedVersion !== relay.version)
      )
        fail("Stav relé nebo relace se změnily. Načtěte nový stav.", 409);
      if (
        this.db
          .prepare("SELECT id FROM commands WHERE channel=? AND status=0")
          .get(channel)
      )
        fail("Relé ještě zpracovává předchozí povel.", 429);
      this.db
        .prepare(
          "INSERT INTO commands(id,channel,desired,version,boot,expires) VALUES(?,?,?,?,?,?)",
        )
        .run(
          id,
          channel,
          Number(body.state),
          Number(relay.version),
          String(state.bootId),
          now + 10000,
        );
      return id;
    });
  }
  result(id: string, now = Date.now()) {
    this.expire(now);
    const cmd = this.db
      .prepare("SELECT status,result FROM commands WHERE id=?")
      .get(id) as CommandRow | undefined;
    return cmd?.status
      ? { status: cmd.status, body: JSON.parse(cmd.result!) }
      : null;
  }
}
let singleton: CloudStore | undefined;
export function cloudStore() {
  singleton ??= new CloudStore(
    resolve(process.env.CLOUD_DATA_DIR || ".data", "home.sqlite"),
  );
  return singleton;
}
