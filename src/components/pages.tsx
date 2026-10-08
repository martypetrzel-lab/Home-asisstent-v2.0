"use client";
import { useState } from "react";
import {
  BatteryMedium,
  ChartNoAxesCombined,
  CloudSun,
  Droplets,
  Gauge,
  Info,
  PlugZap,
  Radio,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
  Zap,
} from "lucide-react";
import {
  BatteryCard,
  Card,
  CardHeading,
  ClimateCard,
  DeviceCard,
  EnergyFlowDiagram,
  LightingControl,
  PowerSourceIndicator,
  SolarCard,
  WeatherCard,
} from "@/components/dashboard/cards";
import { HistoryChart } from "@/components/charts/history-chart";
import { ForecastChart } from "@/components/weather/forecast-chart";
import { useHome, usePreferences, useTemperature } from "@/hooks/use-home";
import { number, time } from "@/lib/utils";
import type { HomeSnapshot, HistoryRange } from "@/types";
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
    <div className="section-intro">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>
          {title}
          <span className="title-dot">.</span>
        </h1>
        <p>{description}</p>
      </div>
    </div>
  );
}
export function RangeFilter({
  value,
  onChange,
}: {
  value: HistoryRange;
  onChange: (range: HistoryRange) => void;
}) {
  return (
    <div className="range-filter" aria-label="Období historie">
      {(["1h", "24h", "7d", "30d"] as const).map((range, i) => (
        <button
          key={range}
          aria-pressed={value === range}
          className={range === value ? "active" : ""}
          onClick={() => onChange(range)}
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
  if (error)
    return (
      <p role="alert" className="note">
        Historii se nepodařilo načíst: {error.message}
      </p>
    );
  if (!events?.length)
    return (
      <p className="prose">
        Zatím bez zaznamenaných událostí. Sledování zdrojů vyžaduje zapojený a
        ověřený TPS2116.
      </p>
    );
  return (
    <div>
      {events
        .slice(-12)
        .reverse()
        .map((event, i) => (
          <div className="metric-row" key={i}>
            <span>{event.detail || event.kind}</span>
            <small>
              {event.timestamp
                ? new Date(event.timestamp).toLocaleString("cs-CZ", {
                    timeZone: "Europe/Prague",
                  })
                : `Po startu ${event.uptime} s · bez času`}
            </small>
          </div>
        ))}
    </div>
  );
}
export function HouseholdPage() {
  const { data } = useHome();
  const temp = useTemperature();
  const { preferences } = usePreferences();
  const delta =
    data.indoor.temperature !== null && data.outdoor.temperature !== null
      ? data.indoor.temperature - data.outdoor.temperature
      : null;
  const indoorValues = data.history
    .map((d) => d.indoorTemperature)
    .filter((v): v is number => v !== null);
  const outdoorValues = data.history
    .map((d) => d.outdoorTemperature)
    .filter((v): v is number => v !== null);
  const minimum = indoorValues.length ? Math.min(...indoorValues) : null;
  const maximum = indoorValues.length ? Math.max(...indoorValues) : null;
  return (
    <>
      <PageIntro
        eyebrow="PROSTOR PRO POHODU"
        title="Vaše domácnost"
        description="Klima uvnitř i venku a světlo přesně podle vás."
      />
      <div className="detail-grid">
        <ClimateCard data={data} />
        <ClimateCard data={data} outdoor />
        <Card>
          <CardHeading
            icon={<Thermometer size={19} />}
            title="Srovnání klimatu"
          />
          <div className="metric-row">
            <span>Uvnitř oproti venku</span>
            <strong>
              {delta === null
                ? "Nedostupné"
                : `${number(preferences.unit === "fahrenheit" ? delta * 1.8 : delta)} °${preferences.unit === "fahrenheit" ? "F" : "C"}`}
            </strong>
          </div>
          <div className="metric-row">
            <span>Rozdíl vlhkosti</span>
            <strong>
              {data.indoor.humidity !== null && data.outdoor.humidity !== null
                ? `${number(data.indoor.humidity - data.outdoor.humidity)} p. b.`
                : "Nedostupné"}
            </strong>
          </div>
          <div className="metric-row">
            <span>Minimum uvnitř · 24 h</span>
            <strong>{temp(minimum)}</strong>
          </div>
          <div className="metric-row">
            <span>Maximum uvnitř · 24 h</span>
            <strong>{temp(maximum)}</strong>
          </div>
          <div className="metric-row">
            <span>Minimum venku · 24 h</span>
            <strong>
              {temp(outdoorValues.length ? Math.min(...outdoorValues) : null)}
            </strong>
          </div>
          <div className="metric-row">
            <span>Maximum venku · 24 h</span>
            <strong>
              {temp(outdoorValues.length ? Math.max(...outdoorValues) : null)}
            </strong>
          </div>
        </Card>
        <Card className="span-2">
          <CardHeading
            icon={<Thermometer size={19} />}
            title="Historie teploty"
          />
          <HistoryChart data={data.history} />
        </Card>
        <LightingControl />
        <Card className="span-2">
          <CardHeading
            icon={<Droplets size={19} />}
            title="Historie vlhkosti"
          />
          <HistoryChart data={data.history} metric="humidity" />
        </Card>
        <DeviceCard data={data} />
      </div>
    </>
  );
}
export function WeatherPage() {
  const { data, mode, weatherError } = useHome();
  const { preferences } = usePreferences();
  const temp = useTemperature();
  return (
    <>
      <PageIntro
        eyebrow="POHLED ZA OKNO"
        title="Počasí"
        description={`${preferences.location} · Internetová předpověď oddělená od vašeho venkovního senzoru.`}
      />
      <div className="info-banner">
        <Info size={19} />
        {mode === "demo"
          ? "Předpověď je simulovaná. V živém režimu ji dodává Open-Meteo."
          : weatherError
            ? "Předpověď se nepodařilo obnovit. Lokální měření a světlo fungují samostatně."
            : "Open-Meteo: internetová předpověď. Venkovní DHT22 měří lokální teplotu a vlhkost."}
      </div>
      <div className="detail-grid">
        <WeatherCard data={data} />
        <p className="note span-2">
          Zdroj:{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{" "}
          · internetová modelová předpověď.{" "}
          {data.weather.fetchedAt
            ? `Obnoveno ${time(data.weather.fetchedAt)}. `
            : ""}
          {data.weather.stale
            ? "Zobrazená předpověď je starší; obnova selhala."
            : ""}{" "}
          Keš se obnovuje po 10 minutách, při výpadku nejvýše hodinu.
        </p>
        <Card className="span-2">
          <CardHeading
            icon={<CloudSun size={19} />}
            title="Hodinová předpověď"
            detail={
              <span className="sensor-tag">
                {mode === "demo"
                  ? "Simulace"
                  : data.weather.stale
                    ? "Starší předpověď"
                    : "Open-Meteo"}
              </span>
            }
          />
          {data.hourly.length ? (
            <>
              <div className="hourly-forecast">
                {data.hourly.slice(0, 8).map((hour) => (
                  <div key={hour.timestamp}>
                    <small>{time(hour.timestamp)}</small>
                    {hour.condition === "sunny" ? (
                      <Sun size={26} />
                    ) : (
                      <CloudSun size={26} />
                    )}
                    <strong>{temp(hour.temperature)}</strong>
                    <span>
                      <Droplets size={12} />
                      {hour.rain} %
                    </span>
                  </div>
                ))}
              </div>
              <ForecastChart data={data.hourly} />
            </>
          ) : (
            <div className="empty-chart">
              Hodinová předpověď není k dispozici.
            </div>
          )}
        </Card>
        <Card className="span-2">
          <CardHeading
            icon={<CloudSun size={19} />}
            title="Výhled na sedm dní"
          />
          {data.forecast.length ? (
            <div className="forecast-table">
              {data.forecast.map((day, i) => (
                <div key={day.date}>
                  <strong>
                    {i === 0
                      ? "Dnes"
                      : new Date(day.date).toLocaleDateString("cs-CZ", {
                          weekday: "long",
                        })}
                  </strong>
                  {day.condition === "rain" ? (
                    <Droplets size={20} />
                  ) : day.condition === "sunny" ? (
                    <Sun size={20} />
                  ) : (
                    <CloudSun size={20} />
                  )}
                  <span>
                    {day.condition === "rain"
                      ? "Déšť"
                      : day.condition === "sunny"
                        ? "Jasno"
                        : "Polojasno"}
                  </span>
                  <span>{day.rain} %</span>
                  <span className="muted">{temp(day.min)}</span>
                  <strong>{temp(day.max)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-chart">
              Sedmidenní předpověď není k dispozici.
            </div>
          )}
        </Card>
        <Card>
          <CardHeading icon={<Wind size={19} />} title="Podrobnosti počasí" />
          {[
            [Wind, "Vítr", data.weather.wind, "km/h"],
            [Wind, "Nárazy větru", data.weather.gusts, "km/h"],
            [Gauge, "Tlak", data.weather.pressure, "hPa"],
            [
              Droplets,
              "Vlhkost podle předpovědi",
              data.weather.humidity ?? null,
              "%",
            ],
            [CloudSun, "Oblačnost", data.weather.cloudCover ?? null, "%"],
            [Droplets, "Srážky", data.weather.precipitationMm ?? null, "mm"],
            [Sunrise, "Východ slunce", data.weather.sunrise, ""],
            [Sunset, "Západ slunce", data.weather.sunset, ""],
          ].map(([, label, value, unit]) => (
            <div className="metric-row" key={String(label)}>
              <span>{String(label)}</span>
              <strong>
                {value === null
                  ? "Nedostupné"
                  : `${typeof value === "number" ? number(value, 0) : value} ${unit}`}
              </strong>
            </div>
          ))}
        </Card>
        <ClimateCard data={data} outdoor />
        <Card className="span-2">
          <CardHeading icon={<Info size={19} />} title="Dva nezávislé zdroje" />
          <p className="prose">
            Venkovní senzor DHT22 poskytuje lokální teplotu a vlhkost u vašeho
            domu. Internetovou předpověď poskytuje Open-Meteo pro zvolené místo.
            Déšť, vítr ani tlak z DHT22 neodvozujeme.
          </p>
        </Card>
      </div>
    </>
  );
}
export function EnergyPage() {
  const [range, setRange] = useState<HistoryRange>("24h");
  const { data, mode, historyError } = useHome(range);
  return (
    <>
      <PageIntro
        eyebrow="KAŽDÝ WATT MÁ SVŮJ PŘÍBĚH"
        title="Energie v rovnováze"
        description="Solární výroba dnes. Připraveno na hybridní napájení zítra."
      />
      <div className="detail-grid">
        <SolarCard data={data} />
        {mode === "live" && (
          <Card>
            <CardHeading
              icon={<Info size={19} />}
              title="Místo solárního měření"
            />
            <p className="prose">
              {data.solar.location || "Místo nebylo ověřeno."}
            </p>
            <p className="note">
              {data.solar.directionConfirmed
                ? "Směr měření je v konfiguraci potvrzen. Denní energie může být neúplná."
                : "Směr proudu není potvrzen; denní Wh se nevypočítávají."}{" "}
              Napětí INA není automaticky napětím panelu naprázdno.
            </p>
            {[
              [
                "Celkem od instalace · měřené úseky",
                data.solar.totalEnergy,
                "Wh",
              ],
              ["Min. výkon od restartu", data.solar.minimum, "W"],
              ["Max. výkon od restartu", data.solar.maximum, "W"],
              ["Surový proud INA", data.solar.rawCurrentMa, "mA"],
            ].map(([label, value, unit]) => (
              <div className="metric-row" key={String(label)}>
                <span>{String(label)}</span>
                <strong>
                  {typeof value === "number"
                    ? `${number(value, 2)} ${unit}`
                    : "Nedostupné"}
                </strong>
              </div>
            ))}
            <p className="note">
              Součet je podepsaná energie platných měřených úseků, nikoli odhad
              celoživotní výroby.
            </p>
          </Card>
        )}
        <BatteryCard data={data} />
        <Card>
          <CardHeading icon={<PlugZap size={19} />} title="Napájení systému" />
          <div className="source-large">
            <PowerSourceIndicator data={data} />
          </div>
          <div className="metric-row">
            <span>Síťový adaptér</span>
            <strong>
              {data.mains === null
                ? "Nedostupné"
                : data.mains
                  ? "Dostupný · simulace"
                  : "Nedostupný"}
            </strong>
          </div>
          <div className="metric-row">
            <span>Spotřeba ESP32</span>
            <strong>Nedostupné</strong>
          </div>
          <p className="note">
            Spotřeba není měřena ani odhadována. Zdroj určuje pouze ověřené
            zapojení ST; dostupnost adaptéru se samostatně neměří.
          </p>
        </Card>
        <div className="span-3">
          <EnergyFlowDiagram />
        </div>
        <Card className="span-2">
          <CardHeading
            icon={<ChartNoAxesCombined size={19} />}
            title="Solární výroba"
            detail={
              <span className="sensor-tag">
                {mode === "demo" ? "Simulace" : "Měření"}
              </span>
            }
          />
          <RangeFilter value={range} onChange={setRange} />
          <HistoryChart
            data={data.history}
            metric={range === "7d" || range === "30d" ? "production" : "solar"}
            range={range}
          />
        </Card>
        <Card>
          <CardHeading
            icon={<BatteryMedium size={19} />}
            title="Přepínání zdrojů"
          />
          <Events
            events={data.events?.filter((e) => e.kind === "power")}
            error={historyError}
          />
        </Card>
      </div>
    </>
  );
}
export function HistoryPage() {
  const [range, setRange] = useState<HistoryRange>("24h");
  const [metric, setMetric] = useState<
    "temperature" | "humidity" | "solar" | "production" | "battery"
  >("temperature");
  const { data, mode, historyError } = useHome(range);
  return (
    <>
      <PageIntro
        eyebrow="SOUVISLOSTI V ČASE"
        title="Historie měření"
        description="Podívejte se, jak váš domov dýchá a jak slunce vyrábí energii."
      />
      <Card>
        <div className="history-toolbar">
          <label>
            Co zobrazit
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as typeof metric)}
            >
              <option value="temperature">Vnitřní a venkovní teplota</option>
              <option value="humidity">Vnitřní a venkovní vlhkost</option>
              <option value="solar">Výkon solárního panelu</option>
              <option value="production">Denní solární výroba</option>
              <option value="battery">Napětí baterie · budoucí</option>
            </select>
          </label>
          <RangeFilter value={range} onChange={setRange} />
        </div>
        <div className="history-title">
          <h2>
            {
              {
                temperature: "Teplota",
                humidity: "Vlhkost",
                solar: "Solární výkon",
                production: "Denní výroba",
                battery: "Napětí baterie",
              }[metric]
            }
          </h2>
          <span className="sensor-tag">
            {mode === "demo" ? "Simulovaná data" : "Živá data"}
          </span>
        </div>
        <HistoryChart data={data.history} metric={metric} range={range} />
        <p className="note">
          {mode === "demo"
            ? "Demo historie slouží k vyzkoušení grafů. Nejde o skutečná měření ani vypočtenou výrobu."
            : "ESP32 uchovává nejvýše 288 vzorků po 5 minutách (24 h). Časy bez synchronizace se neumisťují do časového grafu. Výpadek napájení může ztratit posledních 30 minut; denní energie může být neúplná."}
        </p>
      </Card>
      <div className="two-columns">
        <Card>
          <CardHeading icon={<Radio size={19} />} title="Dostupnost historie" />
          <p className="prose">
            Přehled teploty, vlhkosti a solárního výkonu podporuje období od
            jedné hodiny po třicet dní. Živý firmware zatím uchovává posledních
            24 hodin; delší filtr nevytváří chybějící data.
          </p>
        </Card>
        <Card>
          <CardHeading icon={<Zap size={19} />} title="Události zařízení" />
          <Events events={data.events} error={historyError} />
        </Card>
      </div>
    </>
  );
}
