"use client";
import { Monitor, ShieldCheck } from "lucide-react";
import { Card, CardHeading } from "@/components/dashboard/cards";
import { usePreferences } from "@/hooks/use-home";
import { FullscreenButton, KioskModeToggle } from "@/components/app-shell";
function Switch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="setting-row">
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
      <button
        type="button"
        className={`switch ${checked ? "on" : ""}`}
        role="switch"
        aria-label={label}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <i />
      </button>
    </div>
  );
}
export function TabletSettings() {
  const { preferences: p, update } = usePreferences();
  return (
    <Card className="tablet-settings">
      <CardHeading
        icon={<Monitor size={20} />}
        title="Tabletový režim"
        detail={<span className="sensor-tag">Rámeček a displej</span>}
      />
      <div className="setting-row">
        <div>
          <strong>Kiosk rozložení</strong>
          <p>Spodní navigace a rozložení na celou plochu. Nezamyká Android.</p>
        </div>
        <KioskModeToggle />
      </div>
      <div className="tablet-fields">
        <label className="field-label">
          Bezpečný okraj rámečku <output>{p.safeMargin} px</output>
          <input
            aria-label="Bezpečný okraj rámečku"
            type="range"
            min={0}
            max={40}
            step={4}
            value={p.safeMargin}
            onChange={(e) => update({ safeMargin: Number(e.target.value) })}
          />
        </label>
        <label className="field-label">
          Měřítko rozhraní <output>{p.uiScale} %</output>
          <input
            aria-label="Měřítko rozhraní"
            type="range"
            min={90}
            max={115}
            step={5}
            value={p.uiScale}
            onChange={(e) => update({ uiScale: Number(e.target.value) })}
          />
        </label>
        <label className="field-label">
          Velikost dotykových tlačítek
          <select
            value={p.touchSize}
            onChange={(e) => update({ touchSize: Number(e.target.value) })}
          >
            <option value={48}>48 px</option>
            <option value={52}>52 px · doporučeno</option>
            <option value={56}>56 px</option>
          </select>
        </label>
        <label className="field-label">
          Orientace při celé obrazovce
          <select
            value={p.landscape ? "landscape" : "device"}
            onChange={(e) =>
              update({ landscape: e.target.value === "landscape" })
            }
          >
            <option value="landscape">Preferovat na šířku</option>
            <option value="device">Podle zařízení</option>
          </select>
        </label>
      </div>
      <Switch
        label="Prohodit levou a pravou stranu"
        description="Přesune ovládání světla doleva a klima doprava."
        checked={p.flipped}
        onChange={(flipped) => update({ flipped })}
      />
      <Switch
        label="Ztlumený vzhled"
        description="Softwarové ztlumení stránky. Hardwarový jas se nemění."
        checked={p.dim}
        onChange={(dim) => update({ dim })}
      />
      <Switch
        label="Noční plán"
        description="Klidnější vzhled během zadaných hodin v časové zóně Praha."
        checked={p.nightEnabled}
        onChange={(nightEnabled) => update({ nightEnabled })}
      />
      <div className="tablet-fields">
        <label className="field-label">
          Začátek nočního režimu
          <input
            type="time"
            value={p.nightStart}
            onChange={(e) => {
              if (e.target.value) update({ nightStart: e.target.value });
            }}
          />
        </label>
        <label className="field-label">
          Konec nočního režimu
          <input
            type="time"
            value={p.nightEnd}
            onChange={(e) => {
              if (e.target.value) update({ nightEnd: e.target.value });
            }}
          />
        </label>
      </div>
      <Switch
        label="Ztlumit při nečinnosti"
        description="Překryv zachytí první dotyk; probuzení nezapne světlo."
        checked={p.autoDim}
        onChange={(autoDim) => update({ autoDim })}
      />
      <label className="field-label">
        Ztlumení po
        <select
          value={p.dimAfter}
          onChange={(e) => update({ dimAfter: Number(e.target.value) })}
        >
          <option value={30}>30 sekundách</option>
          <option value={60}>1 minutě</option>
          <option value={120}>2 minutách</option>
          <option value={300}>5 minutách</option>
        </select>
      </label>
      <Switch
        label="Hodinový šetřič"
        description="Tmavá obrazovka s pohybujícími se hodinami. Klepnutím probudíte panel."
        checked={p.screensaver}
        onChange={(screensaver) => update({ screensaver })}
      />
      <label className="field-label">
        Šetřič po
        <select
          value={p.saverAfter}
          onChange={(e) => update({ saverAfter: Number(e.target.value) })}
        >
          <option value={120}>2 minutách</option>
          <option value={300}>5 minutách</option>
          <option value={600}>10 minutách</option>
        </select>
      </label>
      <Switch
        label="Omezit animace"
        description="Vypne pohyb a přechody včetně pohybu hodin šetřiče."
        checked={p.reducedMotion}
        onChange={(reducedMotion) => update({ reducedMotion })}
      />
      <FullscreenButton />
      <div className="security-note">
        <ShieldCheck size={20} />
        <p>
          <strong>Chování offline:</strong> uloží se pouze rozhraní, nikoli živá
          měření. Při výpadku se data skryjí, zůstane čas posledního úspěšného
          spojení a připojení se automaticky opakuje. Offline podpora vyžaduje
          první úspěšné načtení produkční verze přes HTTPS nebo localhost.
        </p>
      </div>
      <p className="note">
        Výchozí bezpečný okraj je 16 CSS px plus systémové výřezy. Začněte s
        výchozím měřítkem a ověřte dostupnost všech tlačítek v rámečku.
        Uspávání, hardwarový jas a uzamčení orientace nastavte v Androidu nebo
        kiosk aplikaci. Stejný začátek a konec nočního plánu plán vypne.
      </p>
    </Card>
  );
}
