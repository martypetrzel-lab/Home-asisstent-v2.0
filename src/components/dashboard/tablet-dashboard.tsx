"use client";
import {
  ArrowDownRight,
  ArrowUpRight,
  BatteryMedium,
  CloudSun,
  CloudRain,
  Droplets,
  House,
  PlugZap,
  Sun,
  Sunrise,
  Sunset,
  Trees,
  Wind,
  Zap,
} from "lucide-react";
import { useHome, usePreferences, useTemperature } from "@/hooks/use-home";
import { number, time } from "@/lib/utils";
import {
  Card,
  CardHeading,
  LightingControl,
  PowerSourceIndicator,
} from "./cards";
export function TabletDashboard() {
  const { data, mode } = useHome();
  const WeatherIcon =
    data.weather.condition === "rain"
      ? CloudRain
      : data.weather.condition === "sunny"
        ? Sun
        : CloudSun;
  const temp = useTemperature();
  const { preferences } = usePreferences();
  const difference =
    data.indoor.temperature !== null && data.outdoor.temperature !== null
      ? data.indoor.temperature - data.outdoor.temperature
      : null;
  return (
    <div className="tablet-dashboard" aria-label="Přehled domácnosti">
      <h1 className="sr-only">Přehled domácnosti</h1>
      <div className="wall-climate" data-area="climate">
        {[
          {
            name: "Vnitřní klima",
            climate: data.indoor,
            Icon: House,
            caption: "Kuchyň · DHT22",
          },
          {
            name: "Venkovní klima",
            climate: data.outdoor,
            Icon: Trees,
            caption: "Venkovní senzor · DHT22",
          },
        ].map(({ name, climate, Icon, caption }, i) => (
          <Card key={name} className="wall-climate-card">
            <CardHeading
              icon={<Icon size={20} />}
              title={name}
              detail={
                <span
                  className={`wall-sensor-dot ${climate.temperature === null ? "sensor-unavailable" : ""}`}
                  aria-label={
                    climate.temperature === null
                      ? "Senzor nedostupný"
                      : "Data dostupná"
                  }
                />
              }
            />
            <div
              className={`wall-temperature ${climate.temperature === null ? "missing" : ""}`}
            >
              {climate.temperature === null ? (
                "Nedostupné"
              ) : (
                <>
                  {temp(climate.temperature).replace(/°[CF]$/, "")}
                  <span>{temp(climate.temperature).slice(-2)}</span>
                </>
              )}
            </div>
            <div className="wall-humidity">
              <Droplets size={18} />
              <strong>
                {climate.humidity === null
                  ? "Nedostupné"
                  : `${number(climate.humidity, 0)} %`}
              </strong>
              <span>vlhkost</span>
            </div>
            <div className="wall-climate-caption">
              <span>{caption}</span>
              <span>
                {i === 0 ? (
                  <>
                    <span className="wall-tiny-dot" />{" "}
                    {mode === "demo" ? "Simulace" : "Vlastní měření"}
                  </>
                ) : difference === null ? (
                  "Srovnání nedostupné"
                ) : (
                  <>
                    <ArrowDownRight size={14} />
                    {number(
                      Math.abs(difference) *
                        (preferences.unit === "fahrenheit" ? 1.8 : 1),
                    )}{" "}
                    °{preferences.unit === "fahrenheit" ? "F" : "C"}{" "}
                    {difference >= 0 ? "méně než uvnitř" : "více než uvnitř"}
                  </>
                )}
              </span>
            </div>
          </Card>
        ))}
      </div>
      <Card className="wall-weather" data-area="weather">
        <CardHeading
          icon={<CloudSun size={20} />}
          title="Počasí"
          detail={
            <span className="wall-location">
              {data.weather.location || preferences.location}
            </span>
          }
        />
        {data.weather.temperature === null ? (
          <div className="wall-weather-empty">
            <CloudSun size={55} strokeWidth={1} />
            <strong>Nedostupné</strong>
            <p>Internetová předpověď není dostupná.</p>
            <small>Venkovní DHT22 najdete v kartě klimatu.</small>
          </div>
        ) : (
          <>
            <div className="wall-weather-now">
              <div>
                <span className="wall-weather-temperature">
                  {temp(data.weather.temperature)}
                </span>
                <p>
                  {data.weather.description || "Polojasno"}{" "}
                  <span>· Pocitově {temp(data.weather.feelsLike)}</span>
                </p>
              </div>
              <WeatherIcon
                className="wall-weather-icon"
                size={74}
                strokeWidth={1.25}
              />
            </div>
            <div className="wall-weather-metrics">
              <span>
                <Wind size={17} />
                {number(data.weather.wind, 0)} km/h
              </span>
              <span>
                <Droplets size={17} />
                {number(data.weather.rain, 0)} % <small>déšť</small>
              </span>
            </div>
            <div className="wall-forecast">
              <div className="wall-label">DNES A DALŠÍ DNY</div>
              <div className="wall-daily">
                {data.forecast.slice(0, 4).map((day, i) => (
                  <div key={day.date}>
                    <span>
                      {i === 0
                        ? "Dnes"
                        : new Date(day.date).toLocaleDateString("cs-CZ", {
                            weekday: "short",
                            timeZone: "Europe/Prague",
                          })}
                    </span>
                    {day.condition === "sunny" ? (
                      <Sun size={23} />
                    ) : day.condition === "rain" ? (
                      <Droplets size={23} />
                    ) : (
                      <CloudSun size={23} />
                    )}
                    <strong>{temp(day.max)}</strong>
                    <small>{temp(day.min)}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="wall-hourly">
              <div className="wall-label">NEJBLIŽŠÍ HODINY</div>
              <div>
                {data.hourly.slice(0, 4).map((hour) => (
                  <div key={hour.timestamp}>
                    <span>{time(hour.timestamp)}</span>
                    <strong>{temp(hour.temperature)}</strong>
                    <small>
                      <Droplets size={12} />
                      {hour.rain} %
                    </small>
                  </div>
                ))}
              </div>
            </div>
            <div className="wall-sun">
              <span>
                <Sunrise size={20} />
                <span>
                  Východ<strong>{data.weather.sunrise}</strong>
                </span>
              </span>
              <span>
                <Sunset size={20} />
                <span>
                  Západ<strong>{data.weather.sunset}</strong>
                </span>
              </span>
            </div>
          </>
        )}
        <div className="wall-weather-source">
          {mode === "demo" ? (
            "Internetová předpověď · simulace"
          ) : data.weather.temperature === null ? (
            "Internetové počasí · nedostupné"
          ) : (
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo ·{" "}
              {data.weather.stale
                ? "starší předpověď"
                : data.weather.fetchedAt
                  ? `obnoveno ${time(data.weather.fetchedAt)}`
                  : "předpověď"}
            </a>
          )}
        </div>
      </Card>
      <div className="wall-controls" data-area="controls">
        <LightingControl />
        <Card className="wall-energy">
          <CardHeading
            icon={<Zap size={20} />}
            title="Energie"
            detail={
              <a
                href="/energie"
                className="wall-energy-link"
                aria-label="Podrobnosti energie"
              >
                <ArrowUpRight size={20} />
              </a>
            }
          />
          <div className="wall-energy-main">
            <div>
              <span>Solární výkon</span>
              <strong className={data.solar.power === null ? "missing" : ""}>
                {data.solar.power === null ? (
                  "Nedostupné"
                ) : (
                  <>
                    {number(data.solar.power)} <small>W</small>
                  </>
                )}
              </strong>
            </div>
            <div>
              <Sun size={17} />
              <span>Dnes</span>
              <strong>
                {data.solar.dailyEnergy === null
                  ? "Nedostupné"
                  : `${number(data.solar.dailyEnergy)} Wh`}
              </strong>
            </div>
          </div>
          <div className="wall-battery">
            <BatteryMedium size={19} />
            <div>
              <span>AGM · 12 V / 7 Ah</span>
              <strong>
                {data.battery.voltage === null
                  ? "Napětí nedostupné"
                  : `${number(data.battery.voltage)} V · simulace`}
              </strong>
            </div>
            <small>
              {data.battery.charge === null
                ? "Nabití nedostupné"
                : `${number(data.battery.charge, 0)} %`}
            </small>
          </div>
          <div className="wall-source">
            <PlugZap size={18} />
            <PowerSourceIndicator data={data} />
          </div>
        </Card>
      </div>
    </div>
  );
}
