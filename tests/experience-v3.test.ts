import test from "node:test";
import assert from "node:assert/strict";
import {
  nextClockMode,
  nameDay,
  kitchenTimerView,
  validTimer,
} from "../src/lib/home-experience";
test("Noční hodiny: česká půlnoc, léto/zima, 22–5 a minutové probuzení", () => {
  for (const [iso, night] of [
    ["2026-07-01T19:59:59Z", false],
    ["2026-07-01T20:00:00Z", true],
    ["2026-07-02T02:59:59Z", true],
    ["2026-07-02T03:00:00Z", false],
    ["2026-12-01T21:00:00Z", true],
    ["2026-12-02T04:00:00Z", false],
    ["2026-03-29T01:30:00Z", true],
    ["2026-10-25T01:30:00Z", true],
  ] as const) {
    const now = new Date(iso);
    assert.equal(nextClockMode("", true, now, 0), night ? "night" : "");
  }
  const now = new Date("2026-07-01T21:00:00Z");
  assert.equal(nextClockMode("", true, now, now.getTime() + 60000), "");
  assert.equal(
    nextClockMode(
      "",
      true,
      new Date(now.getTime() + 60000),
      now.getTime() + 60000,
    ),
    "night",
  );
  assert.equal(
    nextClockMode("manual", true, new Date("2026-07-02T03:00:00Z"), 0),
    "manual",
  );
  assert.equal(
    nextClockMode("night", true, new Date("2026-07-02T03:00:00Z"), 0),
    "",
  );
  assert.equal(nextClockMode("night", false, now, 0), "");
  assert.equal(nameDay(new Date("2026-10-10T22:01:00Z")), "Andrej");
});
test("Odpočet zachová deadline po obnovení a dokončí i při zpožděném volání", () => {
  const t = { mode: "running" as const, remaining: 10000, deadline: 11000 };
  assert.equal(
    kitchenTimerView(validTimer(JSON.parse(JSON.stringify(t)), 2000), 2000)
      .remaining,
    9000,
  );
  assert.equal(kitchenTimerView(t, 12000).finished, true);
  assert.equal(
    kitchenTimerView({ mode: "paused", remaining: 2500 }, 99999).remaining,
    2500,
  );
  assert.equal(
    validTimer({ mode: "running", remaining: -1 }, 1000).mode,
    "idle",
  );
});
