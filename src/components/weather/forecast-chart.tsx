"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WeatherHourly } from "@/types";
import { usePreferences, useTemperature } from "@/hooks/use-home";
import { time } from "@/lib/utils";
export function ForecastChart({ data }: { data: WeatherHourly[] }) {
  const { preferences } = usePreferences();
  const temp = useTemperature();
  const values = data.map((hour) => ({
    ...hour,
    displayTemperature:
      preferences.unit === "fahrenheit"
        ? hour.temperature * 1.8 + 32
        : hour.temperature,
  }));
  return (
    <div
      className="chart compact-chart"
      role="img"
      aria-label={`${preferences.mode === "demo" ? "Simulovaná předpověď" : "Předpověď Open-Meteo"} teploty na příštích 24 hodin`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart
          data={values}
          margin={{ top: 12, right: 10, left: -16, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 6"
          />
          <XAxis
            dataKey="timestamp"
            tickFormatter={time}
            minTickGap={35}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            unit={preferences.unit === "fahrenheit" ? "°F" : "°C"}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            labelFormatter={(value) => time(String(value))}
            formatter={(value) => [
              temp(
                preferences.unit === "fahrenheit"
                  ? (Number(value) - 32) / 1.8
                  : Number(value),
              ),
              "Předpověď",
            ]}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="displayTemperature"
            stroke="var(--amber)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
