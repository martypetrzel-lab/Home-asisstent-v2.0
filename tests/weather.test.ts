import test from "node:test";
import assert from "node:assert/strict";
import { parseOpenMeteo, withWeather } from "../src/services/weather";
import { serverWeather } from "../src/lib/server-weather";
import { emptySnapshot } from "../src/services/snapshot";
import { GET } from "../src/app/api/weather/route";
function weatherFixture(now: number) {
  const epoch = Math.floor(now / 1000);
  return {
    current: {
      time: epoch,
      temperature_2m: 19,
      apparent_temperature: 18,
      weather_code: 61,
      wind_speed_10m: 12,
      wind_gusts_10m: 22,
      surface_pressure: 1010,
      relative_humidity_2m: 70,
      cloud_cover: 90,
      precipitation: 1.2,
    },
    hourly: {
      time: [epoch, epoch + 3600],
      temperature_2m: [19, 20],
      weather_code: [61, 2],
      precipitation_probability: [80, 20],
    },
    daily: {
      time: [epoch],
      temperature_2m_min: [10],
      temperature_2m_max: [20],
      precipitation_probability_max: [80],
      weather_code: [61],
      sunrise: [epoch - 3600],
      sunset: [epoch + 3600],
    },
  };
}
test("weather validates units, forecast and missing fields without inventing values", () => {
  const now = Date.now(),
    fixture = weatherFixture(now);
  const result = parseOpenMeteo(fixture, "Nehvizdy", now);
  assert.equal(result.weather.wind, 12);
  assert.equal(result.weather.description, "Déšť");
  assert.equal(result.weather.rain, 80);
  assert.equal(result.forecast.length, 1);
  assert.equal(result.hourly.length, 2);
  assert.throws(() =>
    parseOpenMeteo(
      { ...fixture, current: { ...fixture.current, temperature_2m: null } },
      "Nehvizdy",
      now,
    ),
  );
  assert.throws(() => parseOpenMeteo(fixture, "Nehvizdy", now + 4 * 3600000));
  const snapshot = emptySnapshot();
  assert.equal(withWeather(snapshot, result, false).relay.on, null);
  assert.equal(
    withWeather(
      snapshot,
      { ...result, fetchedAt: new Date(now - 3600001).toISOString() },
      false,
    ).weather.temperature,
    null,
  );
});
test("weather cache deduplicates, marks old forecast and expires independently of local control", async () => {
  const previous = global.fetch,
    now = Date.now();
  let calls = 0;
  try {
    global.fetch = async (url) => {
      calls++;
      assert.equal(new URL(String(url)).hostname, "api.open-meteo.com");
      return Response.json(weatherFixture(now));
    };
    await Promise.all([
      serverWeather("Nehvizdy", now),
      serverWeather("Nehvizdy", now),
    ]);
    assert.equal(calls, 1);
    await serverWeather("Nehvizdy", now + 60000);
    assert.equal(calls, 1);
    global.fetch = async () => {
      throw new Error("WAN unavailable");
    };
    assert.equal((await serverWeather("Nehvizdy", now + 601000)).stale, true);
    await assert.rejects(serverWeather("Nehvizdy", now + 3600001));
    assert.equal(
      (
        await GET(
          new Request(
            "http://localhost:3000/api/weather?location=https://example.com",
          ),
        )
      ).status,
      400,
    );
  } finally {
    global.fetch = previous;
  }
});
