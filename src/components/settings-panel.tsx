"use client";
import { useState } from "react";
import {
  Check,
  Monitor,
  Radio,
  Settings,
  ShieldCheck,
  Wifi,
  Wrench,
} from "lucide-react";
import { useHome, usePreferences } from "@/hooks/use-home";
import { Card, CardHeading } from "@/components/dashboard/cards";
import { PageIntro } from "@/components/pages";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { TabletSettings } from "@/components/tablet/tablet-settings";
import { validateEndpoint } from "@/services/data";
import { LiveAccess } from "@/components/live-access";
function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="setting-row">
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`switch ${checked ? "on" : ""}`}
      >
        <i />
      </button>
    </div>
  );
}
export function SettingsPanel() {
  const { preferences, update } = usePreferences();
  const { data } = useHome();
  const [confirm, setConfirm] = useState(false);
  const [endpoint, setEndpoint] = useState(preferences.endpoint);
  const [location, setLocation] = useState(preferences.location);
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState(false);
  function saveEndpoint() {
    try {
      const value = endpoint.trim() ? validateEndpoint(endpoint.trim()) : "";
      update({ endpoint: value });
      setInvalid(false);
      setMessage("Adresa API byla uložena.");
    } catch (error) {
      setInvalid(true);
      setMessage((error as Error).message);
    }
  }
  return (
    <>
      <PageIntro
        eyebrow="VŠE PODLE VÁS"
        title="Nastavení"
        description="Přizpůsobte si domov, displej a připojení zařízení."
      />
      <div className="settings-grid">
        <TabletSettings />
        <Card>
          <CardHeading icon={<Monitor size={19} />} title="Displej a vzhled" />
          <Toggle
            label="Světlý vzhled"
            description="Přepínejte mezi tmavým a světlým rozhraním."
            checked={preferences.theme === "light"}
            onChange={(value) => update({ theme: value ? "light" : "dark" })}
          />
          <label className="field-label">
            Jednotky teploty
            <select
              value={preferences.unit}
              onChange={(e) =>
                update({ unit: e.target.value as "celsius" | "fahrenheit" })
              }
            >
              <option value="celsius">Stupně Celsia · °C</option>
              <option value="fahrenheit">Stupně Fahrenheita · °F</option>
            </select>
          </label>
          <p className="note">
            Prohlížeč nemůže zaručit nepřetržité svícení displeje. Systémový jas
            a uspávání nastavte přímo v Androidu. Šetřič používá pohybující se
            obsah.
          </p>
        </Card>
        <Card>
          <CardHeading icon={<Wifi size={19} />} title="Data a připojení" />
          <div className="mode-options">
            <button
              className={preferences.mode === "demo" ? "active" : ""}
              onClick={() => update({ mode: "demo" })}
            >
              <span className="status-dot" />
              <strong>Demo režim</strong>
              <small>Simulovaná data a ovládání</small>
            </button>
            <button
              className={preferences.mode === "live" ? "active" : ""}
              onClick={() => {
                if (preferences.mode !== "live") setConfirm(true);
              }}
            >
              <Radio size={16} />
              <strong>Živý režim</strong>
              <small>Skutečná měření ESP32</small>
            </button>
          </div>
          <label className="field-label">
            Adresa ESP32 API
            <input
              type="url"
              value={endpoint}
              placeholder="Prázdné = přihlášená místní brána"
              onChange={(e) => setEndpoint(e.target.value)}
              aria-invalid={invalid}
            />
          </label>
          <Button variant="outline" onClick={saveEndpoint}>
            Uložit připojení
          </Button>
          <p className="note">
            Pro ovládání ponechte adresu prázdnou. Přímá HTTP(S) adresa slouží
            jen ke čtení a vyžaduje vlastní CORS; firmware ve výchozím stavu
            přímý prohlížeč odmítá. Živý stav se kvůli synchronizaci relé načítá
            nejméně každých 5 sekund.
          </p>
          <LiveAccess />
          <label className="field-label">
            Interval aktualizace
            <select
              value={preferences.refresh}
              onChange={(e) => update({ refresh: Number(e.target.value) })}
            >
              <option value={5}>Každých 5 sekund</option>
              <option value={15}>Každých 15 sekund</option>
              <option value={30}>Každých 30 sekund</option>
              <option value={60}>Každou minutu</option>
            </select>
          </label>
          <div className="security-note">
            <ShieldCheck size={19} />
            <p>
              Ovládání používá přihlášenou místní bránu a klíč ESP32 uložený na
              serveru. Heslo se neukládá do místního úložiště. Relé musí mít
              předem ověřenou polaritu.
            </p>
          </div>
        </Card>
        <Card>
          <CardHeading
            icon={<Settings size={19} />}
            title="Poloha pro počasí"
          />
          <label className="field-label">
            Město nebo obec
            <input
              value={location}
              maxLength={100}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Praha"
            />
          </label>
          <Button
            variant="outline"
            onClick={() => {
              if (!location.trim()) {
                setInvalid(true);
                setMessage("Zadejte název města nebo obce.");
                return;
              }
              update({ location: location.trim() });
              setInvalid(false);
              setMessage(
                "Poloha byla uložena. Internetová předpověď zatím není připojena.",
              );
            }}
          >
            Uložit polohu
          </Button>
          <p className="note">
            Poloha se vyhledá přes Open-Meteo. Předpověď je oddělená od
            lokálního venkovního DHT22.
          </p>
        </Card>
        <Card>
          <CardHeading
            icon={<Wrench size={19} />}
            title="Diagnostika zařízení"
          />
          <div className="metric-row">
            <span>Zařízení</span>
            <strong>ESP32-WROOM</strong>
          </div>
          <div className="metric-row">
            <span>Připojení</span>
            <strong>
              {preferences.mode === "demo"
                ? "Simulované"
                : data.device.connected
                  ? "Připojeno"
                  : "Nepřipojeno"}
            </strong>
          </div>
          <div className="metric-row">
            <span>Doba provozu</span>
            <strong>
              {data.diagnostics.uptime === null
                ? "Nedostupné"
                : `${Math.floor(data.diagnostics.uptime / 3600)} h ${Math.floor((data.diagnostics.uptime % 3600) / 60)} min${preferences.mode === "demo" ? " · simulace" : ""}`}
            </strong>
          </div>
          <div className="metric-row">
            <span>Firmware</span>
            <strong>{data.diagnostics.firmware || "Nedostupné"}</strong>
          </div>
          {[
            ["IP adresa", data.diagnostics.ip],
            [
              "Wi-Fi RSSI",
              data.diagnostics.signal === null
                ? null
                : `${data.diagnostics.signal} dBm`,
            ],
            [
              "Volná paměť",
              data.diagnostics.freeHeap === undefined ||
              data.diagnostics.freeHeap === null
                ? null
                : `${data.diagnostics.freeHeap} B`,
            ],
            ["Sestavení firmwaru", data.diagnostics.build],
            ["Důvod restartu (ESP-IDF)", data.diagnostics.rebootReason],
            [
              "Synchronizovaný čas",
              preferences.mode === "demo"
                ? "Simulace"
                : data.device.connected
                  ? data.diagnostics.timeSynchronized
                    ? "Ano"
                    : "Ne · místní ovládání funguje dál"
                  : "Nedostupné",
            ],
            [
              "Úložiště historie",
              preferences.mode === "demo"
                ? "Simulace"
                : data.device.connected
                  ? data.diagnostics.storageReady
                    ? "LittleFS připraveno"
                    : "Jen paměť RAM · ověřte LittleFS"
                  : "Nedostupné",
            ],
          ].map(([name, value]) => (
            <div className="metric-row" key={String(name)}>
              <span>{name}</span>
              <strong>{value ?? "Nedostupné"}</strong>
            </div>
          ))}
          <div className="metric-row">
            <span>Aktualizace firmwaru</span>
            <strong>Heslem chráněné ArduinoOTA · podle konfigurace</strong>
          </div>
          <div className="metric-row">
            <span>Verze aplikace</span>
            <strong>2.2.0 · Živé ESP32</strong>
          </div>
        </Card>
      </div>
      {message && (
        <div
          role={invalid ? "alert" : "status"}
          className={`toast ${invalid ? "error-text" : ""}`}
        >
          <Check size={18} />
          {message}
          <button onClick={() => setMessage("")} aria-label="Zavřít oznámení">
            ×
          </button>
        </div>
      )}
      <ConfirmationDialog
        open={confirm}
        onOpenChange={setConfirm}
        onConfirm={() => {
          update({ mode: "live" });
          setConfirm(false);
        }}
      />
    </>
  );
}
