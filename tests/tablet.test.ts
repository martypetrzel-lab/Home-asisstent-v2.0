import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import {
  isQuietTime,
  isMeasurementFresh,
  parseTabletPreferences,
} from "../src/lib/tablet";

test("tablet preferences reject malformed storage and bound enclosure/touch settings", () => {
  const p = parseTabletPreferences({
    safeMargin: 100,
    uiScale: NaN,
    touchSize: 20,
    nightStart: "25:99",
    nightEnd: "08:30",
    dimAfter: 1,
  });
  assert.equal(p.safeMargin, 40);
  assert.equal(p.uiScale, 100);
  assert.equal(p.touchSize, 52);
  assert.equal(p.nightStart, "22:00");
  assert.equal(p.nightEnd, "08:30");
  assert.equal(p.dimAfter, 60);
  assert.equal(
    parseTabletPreferences({ safeMargin: -10, uiScale: 200 }).safeMargin,
    0,
  );
  assert.equal(parseTabletPreferences({ uiScale: 200 }).uiScale, 115);
});
test("quiet hours follow Prague time across midnight and winter/summer offsets", () => {
  for (const date of [
    "2026-10-08T21:00:00Z",
    "2026-10-09T03:00:00Z",
    "2026-01-08T21:00:00Z",
  ])
    assert.equal(isQuietTime(new Date(date), "22:00", "07:00"), true);
  assert.equal(
    isQuietTime(new Date("2026-10-09T05:00:00Z"), "22:00", "07:00"),
    false,
  );
  assert.equal(
    isQuietTime(new Date("2026-10-08T10:00:00Z"), "10:00", "14:00"),
    true,
  );
  assert.equal(isQuietTime(new Date(), "22:00", "22:00"), false);
});
test("stale, invalid and implausibly future timestamps cannot appear current", () => {
  const now = Date.parse("2026-10-08T10:00:00Z");
  assert.equal(isMeasurementFresh("2026-10-08T09:59:00Z", now), true);
  for (const stamp of [
    null,
    "invalid",
    "2026-10-08T09:57:59Z",
    "2026-10-08T10:03:00Z",
  ])
    assert.equal(isMeasurementFresh(stamp, now), false);
});

function workerHarness() {
  const listeners: Record<string, (event: Record<string, unknown>) => void> =
    {};
  const stored = new Map<string, Response>([
    ["/", new Response("cached shell")],
  ]);
  const deleted: string[] = [];
  let claimed = false;
  const cache = {
    match: async (key: Request | string) =>
      stored.get(typeof key === "string" ? key : new URL(key.url).pathname),
    put: async (key: string, response: Response) => {
      stored.set(key, response);
    },
    addAll: async () => {},
  };
  const template = readFileSync("src/services/worker-template.js", "utf8");
  runInNewContext(template, {
    __BUILD__: "test",
    __ASSETS__: ["/", "/_next/static/app.js"],
    __ROUTES__: ["/"],
    URL,
    Request,
    Response,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: async () => {
      throw new Error("network disconnected");
    },
    caches: {
      open: async () => cache,
      keys: async () => [
        "unrelated-cache",
        "home-esp32-shell-old",
        "home-esp32-shell-test",
      ],
      delete: async (key: string) => {
        deleted.push(key);
      },
    },
    self: {
      location: { origin: "https://panel.test" },
      clients: {
        claim: async () => {
          claimed = true;
        },
      },
      addEventListener: (name: string, fn: (typeof listeners)[string]) => {
        listeners[name] = fn;
      },
    },
  });
  return { listeners, deleted, claimed: () => claimed };
}
test("offline worker returns cached document and ignores API, writes and RSC requests", async () => {
  const { listeners } = workerHarness();
  let response: Promise<Response> | undefined;
  const respondWith = (value: Promise<Response>) => {
    response = value;
  };
  listeners.fetch({
    request: {
      url: "https://panel.test/",
      method: "GET",
      headers: new Headers(),
      mode: "navigate",
    },
    respondWith,
  });
  assert.equal(await (await response!)!.text(), "cached shell");
  for (const request of [
    new Request("https://panel.test/api/status"),
    new Request("https://esp32.test/status"),
    new Request("https://panel.test/", { method: "POST" }),
    new Request("https://panel.test/?_rsc=test"),
    new Request("https://panel.test/", { headers: { RSC: "1" } }),
  ]) {
    response = undefined;
    listeners.fetch({ request, respondWith });
    assert.equal(response, undefined);
  }
});
test("worker activation cleans only previous application caches", async () => {
  const harness = workerHarness();
  let pending: Promise<void> | undefined;
  harness.listeners.activate({
    waitUntil: (value: Promise<void>) => {
      pending = value;
    },
  });
  await pending;
  assert.deepEqual(harness.deleted, ["home-esp32-shell-old"]);
  assert.equal(harness.claimed(), true);
});

test("build generator produces an executable worker with all tokens resolved", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "home-shell-test-"));
  try {
    for (const dir of [".next/static/chunks", "public", "src/services"])
      await mkdir(join(fixture, dir), { recursive: true });
    await writeFile(join(fixture, ".next/BUILD_ID"), "fixture-build");
    await writeFile(join(fixture, ".next/static/chunks/app.js"), "");
    await writeFile(
      join(fixture, "src/services/worker-template.js"),
      readFileSync("src/services/worker-template.js"),
    );
    execFileSync(
      process.execPath,
      [resolve("scripts/build-pwa.mjs"), "worker"],
      { cwd: fixture },
    );
    const worker = await readFile(join(fixture, "public/sw.js"), "utf8");
    assert.doesNotMatch(worker, /__BUILD__|__ASSETS__|__ROUTES__/);
    const events: string[] = [];
    runInNewContext(worker, {
      self: { addEventListener: (name: string) => events.push(name) },
    });
    assert.deepEqual(events, ["install", "activate", "fetch"]);
    assert.match(worker, /_next\/static\/chunks\/app.js/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
