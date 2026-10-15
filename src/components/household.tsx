"use client";
import { useState } from "react";
import {
  Check,
  Plus,
  Trash2,
  Timer,
  Play,
  Pause,
  RotateCcw,
  MessageSquare,
  ShoppingBasket,
  ListChecks,
  Save,
} from "lucide-react";
import { useHousehold, type HouseholdItem } from "@/hooks/use-household";
import { useExperience } from "@/components/home-experience";
import { durationLabel } from "@/lib/home-experience";
import { RelayControl } from "@/components/dashboard/relay-control";
export function HouseholdContent() {
  const house = useHousehold(),
    { timer, remaining, start, pause, cancel, storageError } = useExperience();
  const [minutes, setMinutes] = useState(10),
    [seconds, setSeconds] = useState(0),
    [draft, setDraft] = useState<string | null>(null),
    [text, setText] = useState(""),
    [list, setList] = useState<"tasks" | "shopping">("tasks"),
    [message, setMessage] = useState("");
  const locked = timer.mode !== "idle",
    items = house.data?.[list] || [];
  const save = async (value: Parameters<typeof house.save>[0]) => {
    try {
      await house.save(value);
      setMessage("Uloženo a sdíleno s domácností.");
      return true;
    } catch (e) {
      setMessage((e as Error).message);
      return false;
    }
  };
  const changeItems = (next: HouseholdItem[]) => void save({ [list]: next });
  return (
    <div className="household-layout">
      <div className="house-controls">
        <RelayControl />
        <RelayControl channel={2} />
        <div className="house-note">
          <span className="status-dot" />
          <span>
            Změny relé potvrzuje vaše ESP32.
            <br />
            Vzkazy a seznamy sdílí celá domácnost.
          </span>
        </div>
      </div>
      <section className="timer-panel panel">
        <div className="panel-heading">
          <span className="eyebrow">KUCHYŇSKÝ POMOCNÍK</span>
          <Timer size={20} />
        </div>
        <h2>Čas na vaření.</h2>
        <div
          className={`timer-dial ${timer.mode === "running" ? "running" : ""}`}
        >
          <div>
            <span>
              {timer.mode === "running"
                ? "ZBÝVÁ"
                : timer.mode === "paused"
                  ? "POZASTAVENO"
                  : "PŘIPRAVENO"}
            </span>
            <strong role="timer">
              {durationLabel(
                locked ? remaining : (minutes * 60 + seconds) * 1000,
              )}
            </strong>
            <small>
              {timer.mode === "running"
                ? "Můžete se věnovat ostatnímu."
                : "Každá dobrá věc má svůj čas."}
            </small>
          </div>
        </div>
        <div className="timer-presets">
          {[5, 10, 15, 30].map((m) => (
            <button
              key={m}
              disabled={locked}
              className={minutes === m && !seconds ? "active" : ""}
              onClick={() => {
                setMinutes(m);
                setSeconds(0);
              }}
            >
              {m}
              <small> min</small>
            </button>
          ))}
        </div>
        <div className="timer-inputs">
          <label>
            Minuty
            <input
              type="number"
              min={0}
              max={1440}
              value={minutes}
              disabled={locked}
              onChange={(e) =>
                setMinutes(
                  Math.max(
                    0,
                    Math.min(1440, Math.floor(Number(e.target.value))),
                  ),
                )
              }
            />
          </label>
          <span>:</span>
          <label>
            Sekundy
            <input
              type="number"
              min={0}
              max={59}
              value={seconds}
              disabled={locked}
              onChange={(e) =>
                setSeconds(
                  Math.max(0, Math.min(59, Math.floor(Number(e.target.value)))),
                )
              }
            />
          </label>
        </div>
        <div className="timer-actions">
          <button
            className="button button-primary"
            disabled={
              timer.mode === "done" ||
              (timer.mode === "idle" && minutes * 60 + seconds <= 0)
            }
            onClick={() =>
              timer.mode === "running"
                ? pause()
                : start((minutes * 60 + seconds) * 1000)
            }
          >
            {timer.mode === "running" ? (
              <Pause size={17} />
            ) : (
              <Play size={17} />
            )}
            {timer.mode === "running"
              ? "Pozastavit"
              : timer.mode === "paused"
                ? "Pokračovat"
                : "Spustit"}
          </button>
          <button
            className="button button-outline"
            aria-label="Zrušit časovač"
            onClick={cancel}
          >
            <RotateCcw size={17} />
            Zrušit
          </button>
        </div>
        {storageError && (
          <p className="error-text">
            Prohlížeč nepovolil uložení časovače pro obnovení stránky.
          </p>
        )}
      </section>
      <div className="house-shared">
        <section className="notes-panel panel">
          <div className="panel-heading">
            <h2>
              <MessageSquare size={18} />
              Naše nástěnka
            </h2>
            <span className="small-tag">SDÍLENÁ</span>
          </div>
          <textarea
            aria-label="Poznámky a vzkazy domácnosti"
            maxLength={6000}
            placeholder="Vzkaz pro ty, které máte rádi…"
            value={draft ?? house.data?.notes ?? ""}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="notes-actions">
            <small>
              {draft === null
                ? "Poznámky a vzkazy pro všechny doma"
                : "Máte neuložené změny"}
            </small>
            <button
              className="button button-outline"
              disabled={draft === null || house.saving || !house.data}
              onClick={async () => {
                if (await save({ notes: draft! })) setDraft(null);
              }}
            >
              <Save size={14} />
              Uložit
            </button>
          </div>
        </section>
        <section className="list-panel panel">
          <div className="list-tabs">
            <button
              className={list === "tasks" ? "active" : ""}
              onClick={() => setList("tasks")}
            >
              <ListChecks size={17} />
              Úkoly
            </button>
            <button
              className={list === "shopping" ? "active" : ""}
              onClick={() => setList("shopping")}
            >
              <ShoppingBasket size={17} />
              Nákup
            </button>
            <small>{items.filter((i) => !i.done).length} zbývá</small>
          </div>
          <form
            className="task-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!text.trim() || items.length >= 100) return;
              if (
                await save({
                  [list]: [
                    ...items,
                    { id: crypto.randomUUID(), text: text.trim(), done: false },
                  ],
                })
              )
                setText("");
            }}
          >
            <input
              aria-label={
                list === "tasks" ? "Nový úkol" : "Nová položka nákupu"
              }
              maxLength={200}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                list === "tasks" ? "Co je potřeba udělat?" : "Co doma chybí?"
              }
            />
            <button
              className="button button-primary"
              aria-label="Přidat položku"
              disabled={
                house.saving ||
                !house.data ||
                !text.trim() ||
                items.length >= 100
              }
            >
              <Plus size={20} />
            </button>
          </form>
          <ul className="task-list">
            {items.map((item) => (
              <li key={item.id} className={item.done ? "done" : ""}>
                <button
                  className="task-check"
                  role="checkbox"
                  aria-checked={item.done}
                  aria-label={`${item.done ? "Obnovit" : "Dokončit"}: ${item.text}`}
                  disabled={house.saving}
                  onClick={() =>
                    changeItems(
                      items.map((i) =>
                        i.id === item.id ? { ...i, done: !i.done } : i,
                      ),
                    )
                  }
                >
                  {item.done && <Check size={14} />}
                </button>
                <span>{item.text}</span>
                <button
                  className="task-remove"
                  aria-label={`Smazat: ${item.text}`}
                  disabled={house.saving}
                  onClick={() =>
                    changeItems(items.filter((i) => i.id !== item.id))
                  }
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
            {!items.length && (
              <li className="empty-list">
                {house.isLoading
                  ? "Načítám domácnost…"
                  : "Čistý stůl. Přidejte první položku."}
              </li>
            )}
          </ul>
        </section>
        {(message || house.isError) && (
          <p role="status" className="house-message">
            {message || house.error?.message}
          </p>
        )}
      </div>
    </div>
  );
}
