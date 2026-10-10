import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HouseholdStore } from "../src/lib/household-store";
import { GET, PATCH } from "../src/app/api/household/route";
import { makeSession } from "../src/lib/server-auth";
test("Zápisky přežijí restart, řeší konflikt a import neopakují", () => {
  const dir = mkdtempSync(join(tmpdir(), "domacnost-")),
    file = join(dir, "test.sqlite");
  let db = new HouseholdStore(file);
  const first = db.patch({
    revision: 0,
    notes: "Večeře je v lednici",
    tasks: [{ id: "one", text: "Koupit mléko", done: false }],
  });
  assert.equal(first.revision, 1);
  assert.throws(
    () => db.patch({ revision: 0, notes: "ztracená změna" }),
    /mezitím/,
  );
  db.close();
  db = new HouseholdStore(file);
  assert.equal(db.get().notes, first.notes);
  const input = {
    importId: "tablet-1",
    notes: "Původní vzkaz",
    tasks: [{ id: "two", text: "Zalít", done: true }],
  };
  const imported = db.import(input);
  assert.equal(imported.tasks.length, 2);
  assert.match(imported.notes, /Večeře[\s\S]*lednici/);
  assert.match(imported.notes, /Původní/);
  assert.deepEqual(db.import(input), imported);
  assert.equal(db.get().tasks.length, 2);
  assert.throws(
    () => db.patch({ revision: 2, relayNames: ["", "ok"] }),
    /názvy/,
  );
  assert.throws(
    () =>
      db.patch({ revision: 2, tasks: [{ id: "bad", text: "x", done: "yes" }] }),
    /položka/,
  );
  assert.throws(
    () => db.patch({ revision: 2, notes: "x".repeat(6001) }),
    /6000/,
  );
  assert.equal(db.get().revision, 2);
  db.close();
  rmSync(dir, { recursive: true });
});
test("Domácnost vyžaduje přihlášení a stejný původ zápisu", async () => {
  assert.equal(
    (await GET(new Request("https://home.test/api/household"))).status,
    401,
  );
  const previous = { ...process.env };
  try {
    process.env.DASHBOARD_PASSWORD = "test-password-123456";
    process.env.SESSION_SECRET = "s".repeat(40);
    process.env.DASHBOARD_ORIGIN = "https://home.test";
    const headers = {
      cookie: `home-session=${makeSession()}`,
      origin: "https://evil.test",
      "content-type": "application/json",
    };
    assert.equal(
      (
        await PATCH(
          new Request("https://home.test/api/household", {
            method: "PATCH",
            headers,
            body: "{}",
          }),
        )
      ).status,
      403,
    );
  } finally {
    process.env = previous;
  }
});
