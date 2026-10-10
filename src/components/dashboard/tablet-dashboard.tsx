"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  CloudRain,
  CloudSun,
  Droplets,
  Flower2,
  Sun,
  Sunrise,
  Sunset,
  Trees,
  Wind,
  House,
} from "lucide-react";
import { useHome, usePreferences, useTemperature } from "@/hooks/use-home";
import { useClock } from "@/hooks/use-display";
import { nameDay } from "@/lib/home-experience";
import { number as formatNumber } from "@/lib/utils";
const number = (value: number | null | undefined, digits = 1) =>
  value == null ? "—" : formatNumber(value, digits);
import { RelayControl } from "./relay-control";
export function WeatherSymbol({
  condition,
  size = 24,
}: {
  condition: string | null;
  size?: number;
}) {
  const Icon =
    condition === "sunny" ? Sun : condition === "rain" ? CloudRain : CloudSun;
  return <Icon size={size} strokeWidth={1.4} />;
}
export function TabletDashboard() {
  const { data, mode } = useHome(),
    { preferences } = usePreferences(),
    temp = useTemperature(),
    now = useClock(30000);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Europe/Prague",
    }).format(now),
  );
  return (
    <div className="overview-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MALÉ RADOSTI. VELKÝ KLID.</span>
          <h1>
            {hour < 11
              ? "Dobré ráno"
              : hour < 18
                ? "Krásný den"
                : "Dobrý večer"}
            <span className="title-dot">.</span>
          </h1>
        </div>
        <span className="heading-note">
          {mode === "demo" ? "Ukázková data · simulace" : "Váš domov právě teď"}
        </span>
      </div>
      <div className="overview-stage">
        <section className="climate-scene">
          <div className="scene-heading">
            <span className="eyebrow">TEPLO DOMOVA</span>
            <House size={19} />
          </div>
          <div className="scene-climates">
            <div className="indoor-reading">
              <span>Uvnitř</span>
              <strong>
                {data.indoor.temperature == null
                  ? "—"
                  : temp(data.indoor.temperature).replace(/°[CF]$/, "")}
                <sup>°{preferences.unit === "fahrenheit" ? "F" : "C"}</sup>
              </strong>
              <p>
                <Droplets size={16} />
                {number(data.indoor.humidity, 0)} % <span>vlhkost</span>
              </p>
            </div>
            <div className="outdoor-reading">
              <span>
                <Trees size={16} />
                Venku
              </span>
              <strong>
                {data.outdoor.temperature == null
                  ? "—"
                  : temp(data.outdoor.temperature)}
              </strong>
              <p>
                <Droplets size={14} />
                {number(data.outdoor.humidity, 0)} %
              </p>
            </div>
          </div>
          <svg
            className="home-landscape"
            viewBox="0 0 800 330"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#c8b38e" stopOpacity=".18" />
                <stop offset="1" stopColor="#c8b38e" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="window" x1="0" x2="1">
                <stop stopColor="#e6b974" stopOpacity=".8" />
                <stop offset="1" stopColor="#e6b974" stopOpacity=".15" />
              </linearGradient>
            </defs>
            <path
              d="M0 244C130 170 180 205 302 245S535 280 800 168V330H0Z"
              fill="url(#land)"
            />
            <path
              d="M0 289C150 230 244 255 385 271S660 238 800 260"
              stroke="#a4b4b6"
              strokeOpacity=".14"
            />
            <path
              d="M325 250V152L453 79L604 162V274M300 168L453 79L624 174M453 79V270M349 252V182L425 139V260M476 160L563 207V270"
              stroke="#d7c5a7"
              strokeOpacity=".45"
              strokeWidth="1.3"
            />
            <path d="M477 168L558 211V263L477 257Z" fill="url(#window)" />
            <path
              d="M512 188V260M477 216L558 236"
              stroke="#282925"
              strokeWidth="4"
            />
            <path
              d="M651 270V139M619 197L651 152L683 199M623 222L651 178L684 225M151 264V192M132 228L151 200L172 229"
              stroke="#8fa7a0"
              strokeOpacity=".32"
            />
            <path
              d="M251 285L456 267L659 294"
              stroke="#e5c69a"
              strokeOpacity=".28"
            />
            <circle cx="686" cy="71" r="43" fill="#e9c787" fillOpacity=".035" />
            <circle
              cx="686"
              cy="71"
              r="24"
              stroke="#e9c787"
              strokeOpacity=".14"
            />
          </svg>
          <div className="scene-footer">
            <span
              className={`status-dot ${data.indoor.temperature == null ? "offline-dot" : ""}`}
            />
            {data.indoor.temperature == null
              ? "Čekáme na čerstvá měření"
              : "Vlastní senzory · skutečné klima"}
            <span>2 × DHT22</span>
          </div>
        </section>
        <section className="weather-scene">
          <div className="scene-heading">
            <span className="eyebrow">
              {data.weather.location || preferences.location}
            </span>
            <Link href="/pocasi" aria-label="Podrobnosti počasí">
              <ArrowUpRight size={20} />
            </Link>
          </div>
          <div className="weather-main">
            <div>
              <strong>
                {data.weather.temperature == null
                  ? "—"
                  : temp(data.weather.temperature)}
              </strong>
              <p>
                {data.weather.description ||
                  (data.weather.temperature == null
                    ? "Počasí není dostupné"
                    : "Aktuální počasí")}
              </p>
            </div>
            <span className="weather-art">
              <WeatherSymbol condition={data.weather.condition} size={78} />
            </span>
          </div>
          <div className="weather-facts">
            <span>
              <Wind size={16} />
              {number(data.weather.wind, 0)} <small>km/h</small>
            </span>
            <span>
              <Droplets size={16} />
              {number(data.weather.rain, 0)} <small>% srážek</small>
            </span>
          </div>
          <div className="weather-sun">
            <span>
              <Sunrise size={17} />
              {data.weather.sunrise || "—"}
            </span>
            <span>
              <Sunset size={17} />
              {data.weather.sunset || "—"}
            </span>
            <small>
              {data.weather.stale ? "Starší předpověď" : "Open-Meteo"}
            </small>
          </div>
        </section>
        <RelayControl compact />
        <section className="nameday-scene">
          <Flower2 size={25} strokeWidth={1.3} />
          <div>
            <span className="eyebrow">DNES MÁ SVÁTEK</span>
            <h2 suppressHydrationWarning>{nameDay(now)}</h2>
          </div>
          <div className="tomorrow">
            <span>Zítra</span>
            <strong suppressHydrationWarning>{nameDay(now, true)}</strong>
          </div>
        </section>
      </div>
      <section className="forecast-band">
        <div className="forecast-heading">
          <span className="eyebrow">VÝHLED NA TÝDEN</span>
          <h2>Co přinesou další dny</h2>
        </div>
        <div className="seven-days">
          {data.forecast.length ? (
            data.forecast.slice(0, 7).map((d, i) => (
              <div className="forecast-day" key={d.date}>
                <span>
                  {i === 0
                    ? "Dnes"
                    : new Date(d.date).toLocaleDateString("cs-CZ", {
                        weekday: "short",
                        timeZone: "Europe/Prague",
                      })}
                </span>
                <WeatherSymbol condition={d.condition} />
                <strong>
                  {temp(d.max).replace("C", "").replace("F", "")}{" "}
                  <small>{temp(d.min).replace("C", "").replace("F", "")}</small>
                </strong>
                <small className="rain-probability">{d.rain} %</small>
              </div>
            ))
          ) : (
            <p className="forecast-empty">
              Předpověď se načte, jakmile bude dostupné připojení.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
