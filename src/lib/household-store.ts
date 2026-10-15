import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { CloudError } from "./cloud-store";
export interface HouseholdItem {
  id: string;
  text: string;
  done: boolean;
}
export interface Household {
  revision: number;
  notes: string;
  tasks: HouseholdItem[];
  shopping: HouseholdItem[];
  relayNames: [string, string];
}
const initial: Household = {
  revision: 0,
  notes: "",
  tasks: [],
  shopping: [],
  relayNames: ["Světlo pod troubou", "Volné relé"],
};
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new CloudError("Neplatný obsah domácnosti.");
  return value as Record<string, unknown>;
}
function items(value: unknown): HouseholdItem[] {
  if (!Array.isArray(value) || value.length > 100)
    throw new CloudError("Seznam může mít nejvýše 100 položek.");
  const ids = new Set<string>();
  return value.map((v) => {
    const t = object(v);
    if (
      typeof t.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(t.id) ||
      ids.has(t.id) ||
      typeof t.text !== "string" ||
      !t.text.trim() ||
      t.text.length > 200 ||
      typeof t.done !== "boolean"
    )
      throw new CloudError("Neplatná položka seznamu.");
    ids.add(t.id);
    return { id: t.id, text: t.text.trim(), done: t.done };
  });
}
function notes(value: unknown): string {
  if (typeof value !== "string" || value.length > 6000)
    throw new CloudError("Vzkaz může mít nejvýše 6000 znaků.");
  return value;
}
export class HouseholdStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(
      `PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS household(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS household_imports(id TEXT PRIMARY KEY);`,
    );
    this.db
      .prepare("INSERT OR IGNORE INTO household VALUES(1,?)")
      .run(JSON.stringify(initial));
  }
  close() {
    this.db.close();
  }
  get(): Household {
    return JSON.parse(
      String(
        this.db.prepare("SELECT payload FROM household WHERE id=1").get()!
          .payload,
      ),
    );
  }
  private transaction(work: () => Household) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  private write(value: Household) {
    this.db
      .prepare("UPDATE household SET payload=? WHERE id=1")
      .run(JSON.stringify(value));
    return value;
  }
  patch(value: unknown) {
    const input = object(value);
    return this.transaction(() => {
      const old = this.get();
      if (
        !Number.isSafeInteger(input.revision) ||
        input.revision !== old.revision
      )
        throw new CloudError(
          "Zápisky mezitím upravil jiný člen domácnosti. Obnovte je před uložením.",
          409,
        );
      if (
        Object.keys(input).some(
          (k) =>
            !["revision", "notes", "tasks", "shopping", "relayNames"].includes(
              k,
            ),
        )
      )
        throw new CloudError("Neznámá položka nastavení.");
      const next = { ...old, revision: old.revision + 1 };
      if ("notes" in input) next.notes = notes(input.notes);
      if ("tasks" in input) next.tasks = items(input.tasks);
      if ("shopping" in input) next.shopping = items(input.shopping);
      if ("relayNames" in input) {
        if (
          !Array.isArray(input.relayNames) ||
          input.relayNames.length !== 2 ||
          input.relayNames.some(
            (n) => typeof n !== "string" || !n.trim() || n.length > 40,
          )
        )
          throw new CloudError(
            "Zadejte dva názvy relé, každý nejvýše 40 znaků.",
          );
        next.relayNames = input.relayNames.map((n) => n.trim()) as [
          string,
          string,
        ];
      }
      return this.write(next);
    });
  }
  import(value: unknown) {
    const input = object(value);
    if (
      typeof input.importId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(input.importId)
    )
      throw new CloudError("Chybí identifikátor importu.");
    const id = input.importId,
      n = notes(input.notes ?? ""),
      t = items(input.tasks ?? []),
      s = items(input.shopping ?? []);
    return this.transaction(() => {
      const old = this.get();
      if (
        this.db.prepare("SELECT id FROM household_imports WHERE id=?").get(id)
      )
        return old;
      const merge = (a: HouseholdItem[], b: HouseholdItem[]) =>
        items([
          ...a,
          ...b
            .filter((x) => !a.some((y) => y.id === x.id && y.text === x.text))
            .map((x, i) => ({
              ...x,
              id: a.some((y) => y.id === x.id)
                ? `import-${Date.now()}-${i}`
                : x.id,
            })),
        ]);
      const next = {
        ...old,
        revision: old.revision + 1,
        notes: notes(
          old.notes && n && old.notes !== n
            ? old.notes + "\n\n— Importovaný vzkaz —\n" + n
            : old.notes || n,
        ),
        tasks: merge(old.tasks, t),
        shopping: merge(old.shopping, s),
      };
      this.db.prepare("INSERT INTO household_imports VALUES(?)").run(id);
      return this.write(next);
    });
  }
}
let singleton: HouseholdStore | undefined;
export function householdStore() {
  return (singleton ??= new HouseholdStore(
    resolve(process.env.CLOUD_DATA_DIR || ".data", "home.sqlite"),
  ));
}
