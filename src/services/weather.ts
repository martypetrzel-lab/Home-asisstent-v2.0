import type {
  HomeSnapshot,
  WeatherCurrent,
  WeatherForecast,
  WeatherHourly,
} from "@/types";
import { object } from "./esp32";
const numeric = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max
    ? v
    : null;
const series = (
  raw: Record<string, unknown>,
  key: string,
  index: number,
  min: number,
  max: number,
) => numeric(Array.isArray(raw[key]) ? raw[key][index] : null, min, max);
const iso = (v: unknown) => {
  const epoch = numeric(v, 1700000000, 4102444800);
  return epoch === null ? null : new Date(epoch * 1000).toISOString();
};
const condition = (code: number): "sunny" | "cloudy" | "rain" =>
  code <= 1 ? "sunny" : code <= 48 ? "cloudy" : "rain";
export function weatherDescription(code: number) {
  if (code === 0) return "Jasno";
  if (code === 1) return "Převážně jasno";
  if (code === 2) return "Polojasno";
  if (code === 3) return "Zataženo";
  if (code <= 48) return "Mlha";
  if (code <= 57) return "Mrholení";
  if (code <= 67) return "Déšť";
  if (code <= 77 || code === 85 || code === 86) return "Sněžení";
  if (code <= 82) return "Přeháňky";
  return "Bouřky";
}
export interface WeatherResult {
  weather: WeatherCurrent;
  forecast: WeatherForecast[];
  hourly: WeatherHourly[];
  fetchedAt: string;
  location: string;
  stale: boolean;
}
export function parseOpenMeteo(
  value: unknown,
  location: string,
  now = Date.now(),
): WeatherResult {
  const root = object(value),
    current = object(root.current),
    hours = object(root.hourly),
    days = object(root.daily);
  const temperature = numeric(current.temperature_2m, -90, 65),
    code = numeric(current.weather_code, 0, 99),
    observed = iso(current.time);
  if (
    temperature === null ||
    code === null ||
    !observed ||
    Math.abs(now - Date.parse(observed)) > 3 * 3600000
  )
    throw new Error("Internetová předpověď neposlala platná aktuální data.");
  const hourly: WeatherHourly[] = (Array.isArray(hours.time) ? hours.time : [])
    .flatMap((stamp, index) => {
      const timestamp = iso(stamp),
        t = series(hours, "temperature_2m", index, -90, 65),
        rain = series(hours, "precipitation_probability", index, 0, 100),
        c = series(hours, "weather_code", index, 0, 99);
      if (
        !timestamp ||
        Date.parse(timestamp) < now - 3600000 ||
        t === null ||
        rain === null ||
        c === null
      )
        return [];
      return [{ timestamp, temperature: t, rain, condition: condition(c) }];
    })
    .slice(0, 24);
  const forecast: WeatherForecast[] = (
    Array.isArray(days.time) ? days.time : []
  )
    .flatMap((stamp, index) => {
      const date = iso(stamp),
        min = series(days, "temperature_2m_min", index, -90, 65),
        max = series(days, "temperature_2m_max", index, -90, 65),
        rain = series(days, "precipitation_probability_max", index, 0, 100),
        c = series(days, "weather_code", index, 0, 99);
      return !date ||
        min === null ||
        max === null ||
        min > max ||
        rain === null ||
        c === null
        ? []
        : [{ date, min, max, rain, condition: condition(c) }];
    })
    .slice(0, 7);
  const sunTime = (key: string) => {
    const stamp = Array.isArray(days[key]) ? iso(days[key][0]) : null;
    return stamp
      ? new Date(stamp).toLocaleTimeString("cs-CZ", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Prague",
        })
      : null;
  };
  return {
    weather: {
      temperature,
      feelsLike: numeric(current.apparent_temperature, -100, 80),
      wind: numeric(current.wind_speed_10m, 0, 500),
      gusts: numeric(current.wind_gusts_10m, 0, 500),
      pressure: numeric(current.surface_pressure, 300, 1200),
      rain: hourly[0]?.rain ?? null,
      sunrise: sunTime("sunrise"),
      sunset: sunTime("sunset"),
      condition: condition(code),
      description: weatherDescription(code),
      humidity: numeric(current.relative_humidity_2m, 0, 100),
      cloudCover: numeric(current.cloud_cover, 0, 100),
      precipitationMm: numeric(current.precipitation, 0, 1000),
    },
    hourly,
    forecast,
    location,
    fetchedAt: new Date(now).toISOString(),
    stale: false,
  };
}
export async function getWeather(
  location: string,
  signal?: AbortSignal,
): Promise<WeatherResult> {
  const response = await fetch(
    `/api/weather?location=${encodeURIComponent(location)}`,
    {
      cache: "no-store",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
        : AbortSignal.timeout(12000),
    },
  );
  const result = await response.json();
  if (!response.ok) throw new Error("Internetové počasí není dostupné.");
  return result as WeatherResult;
}
export function withWeather(
  snapshot: HomeSnapshot,
  result: WeatherResult | undefined,
  stale: boolean,
) {
  if (!result || Date.now() - Date.parse(result.fetchedAt) > 3600000)
    return snapshot;
  return {
    ...snapshot,
    weather: {
      ...result.weather,
      stale: stale || result.stale,
      fetchedAt: result.fetchedAt,
      location: result.location,
    },
    forecast: result.forecast,
    hourly: result.hourly,
  };
}
