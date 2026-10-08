"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BatteryMedium,
  Check,
  ChevronRight,
  CloudSun,
  Droplets,
  ExternalLink,
  House,
  Lightbulb,
  LoaderCircle,
  PlugZap,
  Power,
  Radio,
  Sun,
  Sunrise,
  Sunset,
  Trees,
  Wind,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import {
  useHome,
  usePreferences,
  useRelay,
  useTemperature,
} from "@/hooks/use-home";
import type { HomeSnapshot } from "@/types";
import { number, time } from "@/lib/utils";
import { setDemoTimer } from "@/services/data";
export function Card({
  children,
  className = "",
  ...props
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={`card ${className}`} {...props}>
      {children}
    </section>
  );
}
export function CardHeading({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail?: ReactNode;
}) {
  return (
    <div className="card-heading">
      <span className="icon-label">
        {icon}
        <h2>{title}</h2>
      </span>
      {detail}
    </div>
  );
}
export function SensorUnavailableState({
  text = "Čeká na připojení senzoru",
}: {
  text?: string;
}) {
  return (
    <div className="unavailable">
      <span>—</span>
      <p>Nedostupné</p>
      <small>{text}</small>
    </div>
  );
}
export function DeviceStatusBadge({ connected }: { connected: boolean }) {
  return (
    <span className={`status ${connected ? "healthy" : "neutral"}`}>
      <span className="status-dot" />
      {connected ? "V provozu" : "Nepřipojeno"}
    </span>
  );
}
export function ConnectionStatus() {
  const { data, mode, isFetching, isError } = useHome();
  return (
    <span
      className={`connection ${data.device.connected ? "healthy" : "neutral"}`}
    >
      {isFetching ? (
        <LoaderCircle className="spin" size={14} />
      ) : isError ? (
        <WifiOff size={14} />
      ) : (
        <Wifi size={14} />
      )}{" "}
      {mode === "demo"
        ? "Simulované připojení"
        : data.device.connected
          ? "ESP32 připojeno"
          : "ESP32 nepřipojeno"}
    </span>
  );
}
export function ClimateCard({
  outdoor = false,
  data,
}: {
  outdoor?: boolean;
  data: HomeSnapshot;
}) {
  const climate = outdoor ? data.outdoor : data.indoor;
  const temp = useTemperature();
  const { preferences } = usePreferences();
  const comfortable =
    climate.temperature !== null &&
    climate.temperature >= 20 &&
    climate.temperature <= 24 &&
    climate.humidity !== null &&
    climate.humidity >= 30 &&
    climate.humidity <= 60;
  return (
    <Card className="climate-card">
      <CardHeading
        icon={outdoor ? <Trees size={19} /> : <House size={19} />}
        title={outdoor ? "Venkovní klima" : "Vnitřní klima"}
        detail={<span className="sensor-tag">DHT22</span>}
      />
      {climate.temperature === null ? (
        <SensorUnavailableState />
      ) : (
        <>
          <div className="temperature">
            {temp(climate.temperature).replace(/°[CF]$/, "")}
            <span>{temp(climate.temperature).slice(-2)}</span>
          </div>
          <div className="climate-bottom">
            <span>
              <Droplets size={15} />
              {climate.humidity === null
                ? "Nedostupné"
                : `${number(climate.humidity, 0)} %`}{" "}
              <small>vlhkost</small>
            </span>
            <span
              className={
                outdoor ? "muted" : comfortable ? "healthy" : "warning"
              }
            >
              {outdoor ? (
                <ArrowUpRight size={14} />
              ) : (
                <span className="status-dot" />
              )}
              {outdoor
                ? data.outdoor.trend === null
                  ? "Trend nedostupný"
                  : `${number(preferences.unit === "fahrenheit" ? data.outdoor.trend * 1.8 : data.outdoor.trend)} °${preferences.unit === "fahrenheit" ? "F" : "C"}`
                : comfortable
                  ? "Příjemné klima"
                  : "Mimo komfort"}
            </span>
          </div>
          <div className="climate-track">
            <i
              style={{
                width: `${Math.max(0, Math.min(100, ((climate.temperature + 10) / 50) * 100))}%`,
                background: outdoor ? "var(--teal)" : "var(--amber)",
              }}
            />
          </div>
        </>
      )}
      <div className="card-caption">
        {outdoor
          ? "Venkovní senzor · vlastní měření"
          : "Kuchyň · vlastní měření"}
        {!outdoor && (
          <span>
            {temp(20)}–{temp(24)} optimálně
          </span>
        )}
      </div>
    </Card>
  );
}
export function LightingControl() {
  const { data, mode } = useHome();
  const mutation = useRelay();
  const timer = data.relay.timerMinutes || 0;
  const deadline = data.relay.turnOffAt;
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline || mode !== "demo") return;
    const id = setInterval(() => {
      const now = Date.now();
      setClock(now);
    }, 1000);
    return () => clearInterval(id);
  }, [deadline, mode]);
  const on = data.relay.on === true;
  const pending = mutation.isPending;
  return (
    <Card
      className={`lighting-card ${on && mode === "demo" ? "light-on" : ""}`}
    >
      <CardHeading
        icon={<Lightbulb size={19} />}
        title="Kuchyňské osvětlení"
        detail={<span className="sensor-tag">LED</span>}
      />
      <div className="lighting-body">
        <div className="bulb-orbit">
          <Lightbulb size={32} strokeWidth={1.4} />
        </div>
        <div>
          <h3>Nad kuchyňskou linkou</h3>
          <p>LED osvětlení nad troubou</p>
          <span className={on ? "healthy" : "muted"}>
            {pending
              ? "Čekám na potvrzení…"
              : data.relay.on === null
                ? "Stav nedostupný"
                : on
                  ? "Světlo je zapnuté"
                  : "Světlo je vypnuté"}
          </span>
        </div>
        <button
          className={`power-button ${on ? "active" : ""}`}
          aria-label={
            on ? "Vypnout kuchyňské světlo" : "Zapnout kuchyňské světlo"
          }
          aria-pressed={on}
          disabled={mode === "live" || pending}
          onClick={() => mutation.mutate(!on)}
        >
          {pending ? <LoaderCircle className="spin" /> : <Power />}
        </button>
      </div>
      <div className="lighting-footer">
        <label>
          Automatické vypnutí{" "}
          <select
            aria-label="Časovač osvětlení"
            value={timer}
            disabled={mode === "live" || pending}
            onChange={(e) => {
              const minutes = Number(e.target.value);
              setDemoTimer(minutes);
              setClock(Date.now());
            }}
          >
            <option value={0}>Bez časovače</option>
            <option value={1}>Za 1 minutu</option>
            <option value={5}>Za 5 minut</option>
            <option value={15}>Za 15 minut</option>
            <option value={30}>Za 30 minut</option>
          </select>
        </label>
        <small>
          {mode === "demo"
            ? deadline
              ? `Vypnutí za ${Math.max(0, Math.ceil((deadline - clock) / 1000))} s`
              : "Simulované ovládání"
            : "Vyžaduje zabezpečené API"}
        </small>
      </div>
      {mutation.isError && (
        <p role="alert" className="error-text">
          {mutation.error.message}{" "}
          <button onClick={() => mutation.reset()}>Zavřít</button>
        </p>
      )}
    </Card>
  );
}
export function WeatherCard({ data }: { data: HomeSnapshot }) {
  const temp = useTemperature();
  const { preferences } = usePreferences();
  const weather = data.weather;
  return (
    <Card className="weather-card">
      <CardHeading
        icon={<CloudSun size={19} />}
        title="Počasí"
        detail={<span className="sensor-tag">{preferences.location}</span>}
      />
      {weather.temperature === null ? (
        <SensorUnavailableState text="Internetová předpověď zatím není připojena" />
      ) : (
        <>
          <div className="weather-now">
            <div>
              <div className="weather-temperature">
                {temp(weather.temperature)}
              </div>
              <p>
                Polojasno <span>· Pocitově {temp(weather.feelsLike)}</span>
              </p>
            </div>
            <CloudSun
              size={66}
              strokeWidth={1.2}
              className="weather-hero-icon"
            />
          </div>
          <div className="weather-details">
            <span>
              <Wind size={16} />
              {number(weather.wind, 0)} km/h
            </span>
            <span>
              <Droplets size={16} />
              {number(weather.rain, 0)} %
            </span>
          </div>
          <div className="forecast-strip">
            {data.forecast.slice(0, 5).map((day, i) => (
              <div key={day.date}>
                <small>
                  {i === 0
                    ? "Dnes"
                    : new Date(day.date).toLocaleDateString("cs-CZ", {
                        weekday: "short",
                      })}
                </small>
                {day.condition === "rain" ? (
                  <Droplets size={21} />
                ) : day.condition === "sunny" ? (
                  <Sun size={21} />
                ) : (
                  <CloudSun size={21} />
                )}
                <strong>{temp(day.max)}</strong>
                <span>{temp(day.min)}</span>
              </div>
            ))}
          </div>
          <div className="sun-times">
            <span>
              <Sunrise size={17} />
              {weather.sunrise}
            </span>
            <span>
              <Sunset size={17} />
              {weather.sunset}
            </span>
          </div>
        </>
      )}
      <Link href="/pocasi" className="card-link">
        Internetová předpověď ·{" "}
        {preferences.mode === "demo" ? "simulace" : "nepřipojeno"}{" "}
        <ChevronRight size={16} />
      </Link>
    </Card>
  );
}
export function PowerSourceIndicator({ data }: { data: HomeSnapshot }) {
  return (
    <span className="source-tag">
      <PlugZap size={14} />
      {data.powerSource === "mains"
        ? "Napájeno ze sítě"
        : data.powerSource === "battery"
          ? "Napájeno z baterie"
          : "Zdroj nedostupný"}
    </span>
  );
}
export function SolarCard({ data }: { data: HomeSnapshot }) {
  return (
    <Card className="solar-card">
      <CardHeading
        icon={<Sun size={19} />}
        title="Solární energie"
        detail={
          <Link
            href="/energie"
            aria-label="Otevřít energii"
            className="icon-button"
          >
            <ArrowUpRight size={19} />
          </Link>
        }
      />
      <div className="solar-main">
        <div>
          <span className="eyebrow">AKTUÁLNÍ VÝKON</span>
          <div
            className={`solar-value ${data.solar.power === null ? "value-unavailable" : ""}`}
          >
            {data.solar.power === null
              ? "Nedostupné"
              : number(data.solar.power)}
            {data.solar.power !== null && <span> W</span>}
          </div>
        </div>
        <div className="solar-day">
          <span>Dnešní výroba</span>
          <strong>
            {data.solar.dailyEnergy === null
              ? "Nedostupné"
              : `${number(data.solar.dailyEnergy)} Wh`}
          </strong>
        </div>
      </div>
      <div className="solar-details">
        <div>
          <span>Napětí panelu</span>
          <strong>
            {data.solar.voltage === null
              ? "Nedostupné"
              : `${number(data.solar.voltage)} V`}
          </strong>
        </div>
        <div>
          <span>Proud panelu</span>
          <strong>
            {data.solar.current === null
              ? "Nedostupné"
              : `${number(data.solar.current, 3)} A`}
          </strong>
        </div>
        <div>
          <span>Výkon panelu</span>
          <strong>
            10 W <small>jmenovitý</small>
          </strong>
        </div>
      </div>
      <div className="solar-footer">
        <PowerSourceIndicator data={data} />
        <span className="muted">INA219</span>
      </div>
    </Card>
  );
}
export function BatteryCard({ data }: { data: HomeSnapshot }) {
  return (
    <Card>
      <CardHeading
        icon={<BatteryMedium size={19} />}
        title="Akumulátor"
        detail={<span className="sensor-tag">AGM</span>}
      />
      <h3 className="battery-name">EMOS 12 V / 7 Ah</h3>
      <div
        className={`battery-value ${data.battery.voltage === null ? "value-unavailable" : ""}`}
      >
        {data.battery.voltage === null
          ? "Nedostupné"
          : number(data.battery.voltage)}
        {data.battery.voltage !== null && <span> V</span>}
      </div>
      <div className="metric-row">
        <span>Stav nabití</span>
        <strong>
          {data.battery.charge === null
            ? "Nedostupné"
            : `${number(data.battery.charge, 0)} %`}
        </strong>
      </div>
      <p className="note">
        Samotné napětí neurčuje procento nabití. Senzor proudu baterie zatím
        není instalován.
      </p>
    </Card>
  );
}
export function DeviceCard({ data }: { data: HomeSnapshot }) {
  return (
    <Card className="device-card">
      <CardHeading
        icon={<Radio size={19} />}
        title="Řídicí jednotka"
        detail={<DeviceStatusBadge connected={data.device.connected} />}
      />
      <div className="device-main">
        <div className="chip-art">
          <Radio size={25} />
        </div>
        <div>
          <h3>ESP32-WROOM</h3>
          <p>
            2× DHT22 <span>·</span> INA219 <span>·</span> 1× relé
          </p>
        </div>
        <Link
          href="/nastaveni"
          className="icon-button"
          aria-label="Diagnostika zařízení"
        >
          <ChevronRight size={19} />
        </Link>
      </div>
      <div className="device-footer">
        <span>
          <Wifi size={14} />
          {data.diagnostics.signal === null
            ? "Signál nedostupný"
            : `${data.diagnostics.signal} dBm`}
        </span>
        <span>
          <Check size={14} />
          {data.device.lastUpdate
            ? `Aktualizace ${time(data.device.lastUpdate)}`
            : "Čeká na připojení"}
        </span>
      </div>
    </Card>
  );
}
export function EnergyFlowDiagram() {
  const { mode } = useHome();
  return (
    <Card className="flow-card">
      <CardHeading
        icon={<Zap size={19} />}
        title="Tok energie"
        detail={<span className="sensor-tag">Plánovaná architektura</span>}
      />
      <p className="note">
        Schéma budoucího zapojení. TPS2116 je objednaný, sledování zdrojů zatím
        není instalováno.
      </p>
      <div className="energy-flow">
        <div className="flow-node">
          <Sun />
          <strong>Solární panel</strong>
          <span>10 W</span>
        </div>
        <span className="flow-arrow">→</span>
        <div className="flow-node">
          <Zap />
          <strong>PWM regulátor</strong>
          <span>Nabíjení</span>
        </div>
        <span className="flow-arrow">→</span>
        <div className="flow-node">
          <BatteryMedium />
          <strong>AGM baterie</strong>
          <span>12 V / 7 Ah</span>
        </div>
        <span className="flow-arrow">→</span>
        <div className="flow-node planned">
          <PlugZap />
          <strong>Hybridní systém</strong>
          <span>TPS2116 · plánováno</span>
        </div>
        <span className="flow-arrow">→</span>
        <div className="flow-branches">
          <div className="flow-node">
            <Radio />
            <strong>ESP32</strong>
          </div>
          <div className="flow-node planned">
            <ExternalLink />
            <strong>Android tablet</strong>
            <span>Samostatná větev</span>
          </div>
        </div>
      </div>
      <p className="flow-caption">
        <PlugZap size={16} /> Síťový adaptér 5 V / 3 A → hybridní systém{" "}
        <span>
          {mode === "demo"
            ? "Demo neověřuje skutečné zapojení."
            : "Provozní stav nedostupný."}
        </span>
      </p>
    </Card>
  );
}
