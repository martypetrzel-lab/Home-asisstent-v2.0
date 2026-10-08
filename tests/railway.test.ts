import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  railwayEnvironment,
  configurationErrors,
} from "../scripts/railway-config.mjs";
import { GET as health } from "../src/app/api/health/route";

const credentials = {
  DEVICE_TOKEN: "railway-test-device-0000000000000000000000",
  DASHBOARD_PASSWORD: "railway-test-password-000000",
  SESSION_SECRET: "railway-test-session-000000000000000000000",
};

test("Railway startup requires credentials, distinct keys and the attached volume", () => {
  const values = railwayEnvironment(credentials);
  assert.equal(values.ESP32_TRANSPORT, "cloud");
  assert.deepEqual(configurationErrors(values), []);
  assert.ok(
    configurationErrors(railwayEnvironment({})).some((v) =>
      v.includes("DEVICE_TOKEN"),
    ),
  );
  assert.ok(
    configurationErrors({
      ...values,
      SESSION_SECRET: values.DEVICE_TOKEN,
    }).some((v) => v.includes("odlišné")),
  );
  assert.ok(
    configurationErrors({
      ...values,
      NEXT_PUBLIC_ESP32_API_URL: "http://192.168.1.20/api",
    }).length,
  );
  const check = (extra: Record<string, string>) =>
    spawnSync(process.execPath, ["scripts/start-railway.mjs", "--check"], {
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        NODE_ENV: "test",
        SystemRoot: process.env.SystemRoot,
        ...values,
        RAILWAY_ENVIRONMENT_ID: "test-environment",
        ...extra,
      },
    });
  const missing = check({});
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Volume/);
  const ready = check({ RAILWAY_VOLUME_MOUNT_PATH: "/data" });
  assert.equal(ready.status, 0, ready.stderr);
  assert.ok(!ready.stdout.includes(credentials.DEVICE_TOKEN));
});

test("Railway readiness checks configuration and storage independently of physical ESP32", async () => {
  const previous = { ...process.env };
  const directory = mkdtempSync(join(tmpdir(), "railway-health-"));
  try {
    process.env.ESP32_TRANSPORT = "cloud";
    delete process.env.DEVICE_TOKEN;
    assert.equal(health().status, 503);
    Object.assign(process.env, railwayEnvironment(credentials), {
      CLOUD_DATA_DIR: directory,
    });
    const response = health();
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).checks, {
      configuration: true,
      storage: true,
    });
  } finally {
    const { cloudStore } = await import("../src/lib/cloud-store");
    cloudStore().close();
    rmSync(directory, { recursive: true });
    for (const key of Object.keys(process.env))
      if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});
