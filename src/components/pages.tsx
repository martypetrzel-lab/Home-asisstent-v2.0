"use client";
import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CloudSun,
  Radio,
  Wind,
  Droplets,
  Sun,
} from "lucide-react";
import { useHome, useTemperature } from "@/hooks/use-home";
import { HistoryChart } from "@/components/charts/history-chart";
import { ForecastChart } from "@/components/weather/forecast-chart";
import { HouseholdContent } from "@/components/household";
import { WeatherSymbol } from "@/components/dashboard/tablet-dashboard";
import { number as formatNumber, time } from "@/lib/utils";
const number = (value: number | null | undefined, digits = 1) =>
  value == null ? "—" : formatNumber(value, digits);
import type { HistoryRange, HomeSnapshot } from "@/types";
export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>
          {title}
          <span className="title-dot">.</span>
        </h1>
      </div>
      <span className="heading-note">{description}</span>
    </div>
  );
}
export function RangeFilter({
  value,
  onChange,
}: {
  value: HistoryRange;
  onChange: (value: HistoryRange) => void;
}) {
  return (
    <div className="range-filter" aria-label="Období historie">
      {(["1h", "24h", "7d", "30d"] as const).map((r, i) => (
        <button
          key={r}
          aria-pressed={value === r}
          className={value === r ? "active" : ""}
          onClick={() => onChange(r)}
        >
          {["1 hodina", "24 hodin", "7 dní", "30 dní"][i]}
        </button>
      ))}
    </div>
  );
}
function Events({
  events,
  error,
}: {
  events: HomeSnapshot["events"];
  error?: Error | null;
}) {
  return (
    <div className="event-list">
      {error ? (
        <p className="error-text">{error.message}</p>
      ) : events?.length ? (
        events
          .slice(-30)
          .reverse()
          .map((e, i) => (
            <div key={i}>
              <span className="event-dot" />
              <p>
                {e.detail || e.kind}
                <small>
                  {e.timestamp
                    ? new Date(e.timestamp).toLocaleString("cs-CZ", {
                        timeZone: "Europe/Prague",
                      })
                    : `Po startu ${e.uptime} s · čas nesynchronizován`}
                </small>
              </p>
              <ArrowUpRight size={15} />
            </div>
          ))
      ) : (
        <div className="empty-events">
          <Radio size={25} />
          <p>Zatím žádné události.</p>
          <small>Potvrzené změny relé se objeví zde.</small>
        </div>
      )}
    </div>
  );
}
export function HouseholdPage() {
  return (
    <div className="tab-page">
      <PageIntro
        eyebrow="KAŽDODENNÍ MALÉ RITUÁLY"
        title="Všechno má své místo"
        description="Společný prostor pro celou domácnost"
      />
      <HouseholdContent />
    </div>
  );
}
export function EnergyPage() {
  const [range, setRange] = useState<HistoryRange>("24h"),
    { data, historyError, lastSuccessfulUpdate } = useHome(range),
    s = data.solar;
  return (
    <div className="tab-page">
      <PageIntro
        eyebrow="ENERGIE V SOUVISLOSTECH"
        title="Každý watt se počítá"
        description="Živé měření INA219"
      />
      <div className="energy-layout">
        <section className="energy-main panel">
          <div className="panel-heading">
            <span className="eyebrow">AKTUÁLNÍ VÝKON</span>
            <Sun size={22} />
          </div>
          <div className="power-reading">
            {number(s.power)}
            <span>W</span>
          </div>
          <p className="energy-subtitle">Měřená větev · INA219</p>
          <svg
            className="energy-lines"
            viewBox="0 0 500 90"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M0 60H160L184 28L210 75L241 10L270 62H500"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M0 73H155L185 42L210 84L242 34L271 74H500"
              stroke="currentColor"
              strokeOpacity=".2"
            />
          </svg>
          <div className="electrical-readings">
            <div>
              <span>Napětí</span>
              <strong>
                {number(s.voltage, 2)} <small>V</small>
              </strong>
            </div>
            <div>
              <span>Proud se znaménkem</span>
              <strong>
                {number(s.current, 3)} <small>A</small>
              </strong>
            </div>
          </div>
          <div className="energy-validity">
            <Activity size={15} />
            <span>
              {s.power == null ? "Měření není dostupné" : "Aktuální měření"}
              <small>
                {lastSuccessfulUpdate
                  ? `Poslední aktualizace ${time(lastSuccessfulUpdate)}`
                  : "Čekáme na zařízení"}
              </small>
            </span>
          </div>
        </section>
        <section className="energy-chart panel">
          <div className="panel-heading">
            <h2>Průběh výkonu</h2>
            <RangeFilter value={range} onChange={setRange} />
          </div>
          <HistoryChart data={data.history} metric="solar" range={range} />
          <p className="note">
            {historyError
              ? historyError.message
              : "Graf obsahuje pouze dostupná měření. Mezery znamenají chybějící data."}
          </p>
        </section>
        <section className="energy-totals panel">
          <div>
            <span className="eyebrow">DNES</span>
            <strong>
              {number(s.dailyEnergy)} <small>Wh</small>
            </strong>
          </div>
          <div>
            <span className="eyebrow">CELKEM SLEDOVÁNO</span>
            <strong>
              {number(s.totalEnergy ?? null)} <small>Wh</small>
            </strong>
          </div>
          <p className={s.directionConfirmed ? "note" : "validation-note"}>
            {s.directionConfirmed
              ? s.energyPartial
                ? "Energie může být neúplná kvůli výpadkům měření."
                : "Směr proudu je potvrzený."
              : "Směr INA219 není potvrzen. Odvozená energie je neověřená."}
          </p>
        </section>
        <section className="energy-meta panel">
          <span className="eyebrow">KVALITA MĚŘENÍ</span>
          <p>
            {s.power == null
              ? "Senzor se zatím neozval."
              : s.directionConfirmed
                ? "Měření je dostupné a směr ověřený."
                : "Záporný proud zachováváme tak, jak jej senzor naměřil."}
          </p>
          <span className="note">Chybějící hodnoty se nedopočítávají.</span>
        </section>
      </div>
    </div>
  );
}
export function HistoryPage() {
  const [range, setRange] = useState<HistoryRange>("24h"),
    [metric, setMetric] = useState<
      "temperature" | "humidity" | "solar" | "production"
    >("temperature"),
    { data, historyError, mode } = useHome(range);
  return (
    <div className="tab-page">
      <PageIntro
        eyebrow="PŘÍBĚH VAŠEHO DOMOVA"
        title="Ohlédnutí v čase"
        description="Měření, která dávají souvislosti"
      />
      <div className="history-layout">
        <section className="history-panel panel">
          <div className="history-toolbar">
            <div className="metric-tabs">
              {(
                ["temperature", "humidity", "solar", "production"] as const
              ).map((m, i) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={m === metric ? "active" : ""}
                >
                  {["Teplota", "Vlhkost", "Výkon", "Energie"][i]}
                </button>
              ))}
            </div>
            <RangeFilter value={range} onChange={setRange} />
          </div>
          <div className="history-chart-heading">
            <h2>
              {
                {
                  temperature: "Teplota doma a venku",
                  humidity: "Vlhkost doma a venku",
                  solar: "Solární výkon",
                  production: "Denní naměřená energie",
                }[metric]
              }
            </h2>
            <span className="small-tag">
              {mode === "demo" ? "SIMULACE" : "SKUTEČNÁ MĚŘENÍ"}
            </span>
          </div>
          <HistoryChart data={data.history} metric={metric} range={range} />
          <p className="note">
            {metric === "production" && !data.solar.directionConfirmed
              ? "Odvozená energie je neověřená, dokud není potvrzen směr INA219. "
              : ""}
            Chybějící měření se nedoplňují. Časy v zóně Europe/Prague.
          </p>
          {historyError && <p className="error-text">{historyError.message}</p>}
        </section>
        <section className="events-panel panel">
          <div className="panel-heading">
            <h2>Události domova</h2>
            <Radio size={18} />
          </div>
          <Events events={data.events} error={historyError} />
        </section>
      </div>
    </div>
  );
}
export function WeatherPage() {
  const { data } = useHome(),
    temp = useTemperature();
  return (
    <div className="tab-page">
      <PageIntro
        eyebrow="ZA OKNY VAŠEHO DOMOVA"
        title={data.weather.location || "Nehvizdy"}
        description="Internetová předpověď · Open-Meteo"
      />
      <div className="weather-detail-layout">
        <section className="panel weather-detail">
          <CloudSun size={24} />
          <strong>
            {data.weather.temperature == null
              ? "—"
              : temp(data.weather.temperature)}
          </strong>
          <h2>{data.weather.description || "Počasí není dostupné"}</h2>
          <p>Pocitově {temp(data.weather.feelsLike)}</p>
          <div>
            <Wind size={16} />
            {number(data.weather.wind)} km/h <Droplets size={16} />
            {number(data.weather.rain)} %
          </div>
          <p className="note">
            {data.weather.stale
              ? "Zobrazuje se starší předpověď."
              : "Předpověď a vlastní venkovní senzor jsou nezávislé zdroje."}
          </p>
        </section>
        <section className="panel weather-hourly">
          <h2>V průběhu dne</h2>
          <ForecastChart data={data.hourly} />
        </section>
        <section className="forecast-band weather-week">
          <div className="seven-days">
            {data.forecast.slice(0, 7).map((d) => (
              <div className="forecast-day" key={d.date}>
                <span>
                  {new Date(d.date).toLocaleDateString("cs-CZ", {
                    weekday: "short",
                    timeZone: "Europe/Prague",
                  })}
                </span>
                <WeatherSymbol condition={d.condition} />
                <strong>
                  {temp(d.max)} <small>{temp(d.min)}</small>
                </strong>
                <small>{d.rain} %</small>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
