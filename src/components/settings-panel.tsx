"use client";
import { useState, type ReactNode } from "react";
import {
  Monitor,
  Moon,
  SlidersHorizontal,
  Radio,
  ShieldCheck,
  Download,
  Check,
  Clock3,
  Sun,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { useHome, usePreferences } from "@/hooks/use-home";
import { useHousehold } from "@/hooks/use-household";
import { useExperience } from "@/components/home-experience";
import { FullscreenButton } from "@/components/app-shell";
import { LiveAccess } from "@/components/live-access";
import { PageIntro } from "@/components/pages";
import { time } from "@/lib/utils";
function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="setting-row">
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`switch ${checked ? "on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <i />
      </button>
    </div>
  );
}
function Setting({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export function SettingsPanel() {
  const { preferences: p, update } = usePreferences(),
    { data, lastSuccessfulUpdate, refetch } = useHome(),
    household = useHousehold(),
    { showClock } = useExperience();
  const [tab, setTab] = useState("display"),
    [names, setNames] = useState<[string, string] | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const sections = [
    { id: "display", label: "Vzhled a displej", icon: Monitor },
    { id: "clock", label: "Hodiny a noční klid", icon: Moon },
    { id: "home", label: "Moje domácnost", icon: SlidersHorizontal },
    { id: "device", label: "Připojení a zařízení", icon: Radio },
    { id: "security", label: "Soukromí a účet", icon: ShieldCheck },
  ];
  async function importData(source?: string) {
    setBusy(true);
    setMessage("");
    try {
      let payload: {
        notes?: unknown;
        tasks?: unknown;
        shopping?: unknown;
        importId?: string;
      };
      if (source) payload = JSON.parse(source);
      else
        payload = {
          notes: JSON.parse(localStorage.getItem("esp32-house-notes") || '""'),
          tasks: JSON.parse(localStorage.getItem("esp32-house-tasks") || "[]"),
        };
      if (typeof payload.notes !== "string" || !Array.isArray(payload.tasks))
        throw new Error(
          "Soubor musí obsahovat poznámky a seznam úkolů z původního panelu.",
        );
      const seed = JSON.stringify({
        notes: payload.notes,
        tasks: payload.tasks,
        shopping: payload.shopping || [],
      });
      const hash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)),
        ),
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const r = await fetch("/api/household/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, importId: `legacy-${hash}` }),
        signal: AbortSignal.timeout(10000),
      });
      if (r.status === 401)
        window.dispatchEvent(new Event("home-session-expired"));
      const result = await r.json();
      if (!r.ok)
        throw new Error(
          result.error?.message ||
            (typeof result.error === "string"
              ? result.error
              : "Import se nezdařil."),
        );
      await household.refetch();
      setMessage(
        "Import je hotový. Původní data zůstala zachována; opakovaný import je nepřidá znovu.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import se nepodařil.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="tab-page">
      <PageIntro
        eyebrow="VÁŠ DOMOV. VAŠE PRAVIDLA."
        title="Přesně podle vás"
        description="Nastavení panelu a domácnosti"
      />
      <div className="settings-layout">
        <aside className="settings-navigation">
          {sections.map((s) => (
            <button
              key={s.id}
              aria-pressed={tab === s.id}
              onClick={() => {
                setTab(s.id);
                setMessage("");
              }}
              className={tab === s.id ? "active" : ""}
            >
              <s.icon size={19} />
              <span>{s.label}</span>
              <ArrowUpRight size={15} />
            </button>
          ))}
          <div className="settings-brand">
            <span>domov / 3.0</span>
            <p>
              Technologie v pozadí.
              <br />
              Domov v popředí.
            </p>
          </div>
        </aside>
        <div className="settings-content panel" key={tab}>
          {tab === "display" && (
            <>
              <Setting title="Světlo, které vám sedí">
                <div className="theme-choices">
                  <button
                    className={
                      p.theme === "dark" ? "active theme-dark" : "theme-dark"
                    }
                    onClick={() => update({ theme: "dark" })}
                  >
                    <Moon size={24} />
                    <span>Večerní inkoust</span>
                    {p.theme === "dark" && <Check size={16} />}
                  </button>
                  <button
                    className={
                      p.theme === "light" ? "active theme-light" : "theme-light"
                    }
                    onClick={() => update({ theme: "light" })}
                  >
                    <Sun size={24} />
                    <span>Ranní porcelán</span>
                    {p.theme === "light" && <Check size={16} />}
                  </button>
                </div>
                <Toggle
                  label="Ztlumený vzhled"
                  description="Jemnější světlo stránky. Jas tabletu se nemění."
                  checked={p.dim}
                  onChange={(dim) => update({ dim })}
                />
                <Toggle
                  label="Omezit animace"
                  description="Klidné přechody bez pohybu."
                  checked={p.reducedMotion}
                  onChange={(reducedMotion) => update({ reducedMotion })}
                />
              </Setting>
              <Setting title="Váš displej">
                <div className="settings-fields">
                  <label>
                    Teplotní jednotky
                    <select
                      value={p.unit}
                      onChange={(e) =>
                        update({
                          unit: e.target.value as "celsius" | "fahrenheit",
                        })
                      }
                    >
                      <option value="celsius">Stupně Celsia · °C</option>
                      <option value="fahrenheit">
                        Stupně Fahrenheita · °F
                      </option>
                    </select>
                  </label>
                  <label>
                    Okraj panelu · {p.safeMargin} px
                    <input
                      type="range"
                      min={0}
                      max={24}
                      step={4}
                      value={p.safeMargin}
                      onChange={(e) =>
                        update({ safeMargin: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
                <FullscreenButton />
                <p className="note">
                  Uspávání a jas nastavte v Androidu. Webová stránka neumí
                  probudit tablet uspaný systémem.
                </p>
              </Setting>
            </>
          )}
          {tab === "clock" && (
            <>
              <Setting title="Domov přechází do klidu">
                <Toggle
                  label="Automatické noční hodiny"
                  description="Každý den 22:00–05:00, podle času v Praze včetně letního času."
                  checked={p.nightEnabled}
                  onChange={(nightEnabled) => update({ nightEnabled })}
                />
                <div className="night-schedule">
                  <span>
                    22:00<small>ZKLIDNIT DOMOV</small>
                  </span>
                  <Moon size={30} />
                  <span>
                    05:00<small>NOVÝ DEN</small>
                  </span>
                </div>
                <p className="note">
                  Dotyk vás vrátí k panelu. Po 60 sekundách nečinnosti se noční
                  hodiny znovu objeví. V 05:00 se automaticky zavřou.
                </p>
                <button className="button button-primary" onClick={showClock}>
                  <Clock3 size={17} />
                  Zobrazit hodiny
                </button>
                <p className="note">
                  Ručně spuštěné hodiny zůstanou zobrazené až do dotyku.
                </p>
              </Setting>
              <Setting title="Šetřič během dne">
                <Toggle
                  label="Hodiny při nečinnosti"
                  description="Volitelný denní šetřič. Časovač upozorní i přes hodiny."
                  checked={p.screensaver}
                  onChange={(screensaver) => update({ screensaver })}
                />
                <label className="field-label">
                  Spustit po
                  <select
                    value={p.saverAfter}
                    onChange={(e) =>
                      update({ saverAfter: Number(e.target.value) })
                    }
                  >
                    <option value={120}>2 minutách</option>
                    <option value={300}>5 minutách</option>
                    <option value={600}>10 minutách</option>
                  </select>
                </label>
              </Setting>
            </>
          )}
          {tab === "home" && (
            <>
              <Setting title="Pojmenujte si svůj prostor">
                <div className="settings-fields">
                  {[0, 1].map((i) => (
                    <label key={i}>
                      {i === 0
                        ? "Relé 1 · světlo pod troubou"
                        : "Relé 2 · rezervní výstup"}
                      <input
                        maxLength={40}
                        value={
                          (names ||
                            household.data?.relayNames || [
                              "Světlo pod troubou",
                              "Volné relé",
                            ])[i]
                        }
                        onChange={(e) => {
                          const value: [string, string] = [
                            ...(names ||
                              household.data?.relayNames || [
                                "Světlo pod troubou",
                                "Volné relé",
                              ]),
                          ];
                          value[i] = e.target.value;
                          setNames(value);
                        }}
                      />
                    </label>
                  ))}
                </div>
                <button
                  className="button button-primary"
                  disabled={
                    !names || household.saving || names.some((n) => !n.trim())
                  }
                  onClick={async () => {
                    try {
                      await household.save({ relayNames: names! });
                      setNames(null);
                      setMessage("Názvy jsou uložené pro celou domácnost.");
                    } catch (e) {
                      setMessage((e as Error).message);
                    }
                  }}
                >
                  Uložit názvy
                </button>
              </Setting>
              <Setting title="Přivezte si své poznámky">
                <p className="prose">
                  Přeneste vzkazy a úkoly z původního panelu. Existující sdílené
                  položky zůstanou zachované. Import stejného obsahu se provede
                  jen jednou.
                </p>
                <div className="import-actions">
                  <label className="button button-outline import-label">
                    <Download size={17} />
                    Vybrat export z původního panelu
                    <input
                      type="file"
                      accept=".json,application/json"
                      disabled={busy}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 200000)
                            setMessage(
                              "Soubor je příliš velký. Maximum je 200 kB.",
                            );
                          else await importData(await file.text());
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    className="button button-outline"
                    disabled={busy}
                    onClick={() => void importData()}
                  >
                    Importovat z tohoto prohlížeče
                  </button>
                </div>
                <p className="note">
                  Data uložená na adrese ESP32 nejsou z jiné adresy dostupná. V
                  původním panelu nejprve stáhněte export a zde jej vyberte.
                </p>
              </Setting>
            </>
          )}
          {tab === "device" && (
            <>
              <Setting title="Spojení s vaším domovem">
                <div className="device-path">
                  <span>
                    <Radio size={23} />
                    ESP32
                  </span>
                  <i />
                  <span>Railway</span>
                  <i />
                  <span>
                    <Monitor size={23} />
                    Váš panel
                  </span>
                </div>
                <div className="diagnostics-grid">
                  {[
                    [
                      "Stav zařízení",
                      data.device.connected ? "Připojeno" : "Offline",
                    ],
                    ["Firmware", data.diagnostics.firmware || "Nedostupné"],
                    [
                      "Poslední synchronizace",
                      lastSuccessfulUpdate
                        ? time(lastSuccessfulUpdate)
                        : "Dosud žádná",
                    ],
                    [
                      "Wi-Fi signál",
                      data.diagnostics.signal == null
                        ? "Nedostupné"
                        : `${data.diagnostics.signal} dBm`,
                    ],
                    [
                      "Doba provozu",
                      data.diagnostics.uptime == null
                        ? "Nedostupné"
                        : `${Math.floor(data.diagnostics.uptime / 3600)} h ${Math.floor((data.diagnostics.uptime % 3600) / 60)} min`,
                    ],
                    [
                      "Volná paměť",
                      data.diagnostics.freeHeap == null
                        ? "Nedostupné"
                        : `${Math.round(data.diagnostics.freeHeap / 1024)} kB`,
                    ],
                    ["Lokální IP", data.diagnostics.ip || "Nedostupné"],
                    [
                      "Synchronizace času",
                      !data.device.connected
                        ? "Nedostupné"
                        : data.diagnostics.timeSynchronized
                          ? "Synchronizováno"
                          : "Čeká na čas",
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <button
                  className="button button-outline"
                  onClick={() => void refetch()}
                >
                  <RefreshCw size={17} />
                  Obnovit měření
                </button>
              </Setting>
              <Setting title="Ovládání a měření">
                <p className="prose">
                  Relé 1 · GPIO26. Relé 2 · GPIO33. Výstupy se při startu
                  vypnou. Ovládání čeká na potvrzení ESP32; fyzický stav světla
                  není měřený.
                </p>
                <p className="note">
                  DHT22: uvnitř GPIO27, venku GPIO32. INA219: SDA GPIO21, SCL
                  GPIO22. OTA aktualizace zůstávají dostupné podle konfigurace
                  zařízení.
                </p>
              </Setting>
            </>
          )}
          {tab === "security" && (
            <>
              <Setting title="Váš domov je soukromý">
                <div className="security-illustration">
                  <ShieldCheck size={48} strokeWidth={1} />
                  <div>
                    <h3>Jen pro vás a vaše blízké.</h3>
                    <p>
                      Přístup chrání přihlášení. Přihlašovací klíče zařízení
                      zůstávají na serveru.
                    </p>
                  </div>
                </div>
                <LiveAccess />
              </Setting>
              <Setting title="Uložení dat">
                <p className="prose">
                  Poznámky, úkoly, nákupy a názvy relé sdílí celá domácnost přes
                  server. Vzhled panelu a kuchyňský časovač patří tomuto
                  prohlížeči.
                </p>
                <p className="note">
                  Změnu přístupového hesla provádí správce v zabezpečeném
                  nastavení serveru.
                </p>
              </Setting>
            </>
          )}
          {message && (
            <p className="settings-message" role="status">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
