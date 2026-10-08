import { parseOpenMeteo, type WeatherResult } from "@/services/weather";
import { object } from "@/services/esp32";
const cache = new Map<string, WeatherResult>();
const active = new Map<string, Promise<WeatherResult>>();
const retryAt = new Map<string, number>();
const freshMs = 10 * 60000,
  maxAgeMs = 60 * 60000;
async function json(url: URL) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok) throw new Error("Internetové počasí není dostupné.");
  return response.json();
}
export async function serverWeather(
  location: string,
  now = Date.now(),
): Promise<WeatherResult> {
  const key = location.trim().toLocaleLowerCase("cs-CZ");
  const cached = cache.get(key),
    age = cached ? now - Date.parse(cached.fetchedAt) : Infinity;
  if (cached && age <= freshMs) return cached;
  if (active.has(key)) return active.get(key)!;
  if ((retryAt.get(key) || 0) > now) {
    if (cached && age <= maxAgeMs) return { ...cached, stale: true };
    throw new Error("Internetové počasí není dostupné. Zkusíme to později.");
  }
  if (active.size >= 8) throw new Error("Služba počasí je zaneprázdněná.");
  const request = (async () => {
    try {
      let latitude: number,
        longitude: number,
        resolved = location;
      // Preserve the original Nehvizdy location without needing geocoding online.
      if (key === "nehvizdy") {
        latitude = 50.13056;
        longitude = 14.72993;
      } else {
        const geocode = new URL(
          "https://geocoding-api.open-meteo.com/v1/search",
        );
        geocode.search = new URLSearchParams({
          name: location,
          count: "1",
          language: "cs",
          format: "json",
        }).toString();
        const result = object(await json(geocode));
        const place = object(
          Array.isArray(result.results) ? result.results[0] : null,
        );
        if (
          typeof place.latitude !== "number" ||
          typeof place.longitude !== "number" ||
          !Number.isFinite(place.latitude) ||
          !Number.isFinite(place.longitude) ||
          Math.abs(place.latitude) > 90 ||
          Math.abs(place.longitude) > 180
        )
          throw new Error("Místo pro počasí nebylo nalezeno.");
        latitude = place.latitude;
        longitude = place.longitude;
        resolved = typeof place.name === "string" ? place.name : location;
      }
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.search = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        timezone: "Europe/Prague",
        timeformat: "unixtime",
        forecast_days: "7",
        wind_speed_unit: "kmh",
        current:
          "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,surface_pressure,precipitation",
        hourly: "temperature_2m,precipitation_probability,weather_code",
        daily:
          "temperature_2m_min,temperature_2m_max,precipitation_probability_max,weather_code,sunrise,sunset",
      }).toString();
      const result = parseOpenMeteo(await json(url), resolved, now);
      if (cache.size >= 16 && !cache.has(key))
        cache.delete(cache.keys().next().value!);
      cache.set(key, result);
      retryAt.delete(key);
      return result;
    } catch (error) {
      if (retryAt.size >= 32) retryAt.delete(retryAt.keys().next().value!);
      retryAt.set(key, now + 60000);
      if (cached && age <= maxAgeMs) return { ...cached, stale: true };
      throw error;
    } finally {
      active.delete(key);
    }
  })();
  active.set(key, request);
  return request;
}
