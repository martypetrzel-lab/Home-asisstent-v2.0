"use client";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { HistoryRecord, HistoryRange } from "@/types";
import { usePreferences } from "@/hooks/use-home";
import { ChartNoAxesCombined } from "lucide-react";
import { number, time } from "@/lib/utils";
type Metric = "temperature" | "humidity" | "solar" | "production" | "battery";
export function HistoryChart({
  data,
  metric = "temperature",
  range = "24h",
  compact = false,
}: {
  data: HistoryRecord[];
  metric?: Metric;
  range?: HistoryRange;
  compact?: boolean;
}) {
  const { preferences } = usePreferences();
  if (!data.length || metric === "battery")
    return (
      <div className="empty-chart">
        <ChartNoAxesCombined size={30} />
        <strong>Historie zatím není k dispozici</strong>
        <span>
          {metric === "battery"
            ? "Měření baterie bude dostupné po instalaci senzoru."
            : "Připojte zdroj dat nebo zapněte demo režim."}
        </span>
      </div>
    );
  const temperature = metric === "temperature";
  const dailyData =
    metric === "production"
      ? Array.from(
          new Map(
            data.map((d) => [
              new Date(d.timestamp).toLocaleDateString("cs-CZ", {
                timeZone: "Europe/Prague",
              }),
              d,
            ]),
          ).values(),
        )
      : data;
  const chartData =
    temperature && preferences.unit === "fahrenheit"
      ? data.map((d) => ({
          ...d,
          indoorTemperature:
            d.indoorTemperature === null
              ? null
              : (d.indoorTemperature * 9) / 5 + 32,
          outdoorTemperature:
            d.outdoorTemperature === null
              ? null
              : (d.outdoorTemperature * 9) / 5 + 32,
        }))
      : dailyData;
  const keys = temperature
    ? ["indoorTemperature", "outdoorTemperature"]
    : metric === "humidity"
      ? ["indoorHumidity", "outdoorHumidity"]
      : metric === "production"
        ? ["solarEnergy"]
        : ["solarPower"];
  const unit = temperature
    ? preferences.unit === "fahrenheit"
      ? "°F"
      : "°C"
    : metric === "humidity"
      ? "%"
      : metric === "production"
        ? "Wh"
        : "W";
  const labels: Record<string, string> = {
    indoorTemperature: "Uvnitř",
    outdoorTemperature: "Venku",
    indoorHumidity: "Uvnitř",
    outdoorHumidity: "Venku",
    solarPower: "Solární výkon",
    solarEnergy:
      preferences.mode === "demo"
        ? "Denní výroba (simulace)"
        : "Naměřená denní energie · může být neúplná",
  };
  const colors = ["#e8b66a", "#7caaa4"];
  return (
    <div
      className={compact ? "chart compact-chart" : "chart"}
      role="img"
      aria-label={`Graf ${temperature ? "teploty" : metric === "humidity" ? "vlhkosti" : "solární energie"}; ${preferences.mode === "demo" ? "simulovaná data" : "měřená data"}`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={chartData}
          margin={{ top: 12, right: 8, left: -16, bottom: 0 }}
        >
          <defs>
            {keys.map((key, i) => (
              <linearGradient
                id={`fill-${key}-${compact}`}
                key={key}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={colors[i]} stopOpacity={0.18} />
                <stop offset="100%" stopColor={colors[i]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 6"
          />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(v) =>
              range === "1h" || range === "24h"
                ? time(v)
                : new Date(v).toLocaleDateString("cs-CZ", {
                    day: "numeric",
                    month: "numeric",
                  })
            }
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            minTickGap={45}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            unit={unit}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={62}
          />
          <Tooltip
            labelFormatter={(v) =>
              new Date(String(v)).toLocaleString("cs-CZ", {
                timeZone: "Europe/Prague",
              })
            }
            formatter={(v, name) => [
              `${number(Number(v))} ${unit}`,
              labels[String(name)] || name,
            ]}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--text)",
            }}
          />
          {!compact && <Legend formatter={(value) => labels[value] || value} />}{" "}
          {keys.map((key, i) => (
            <Area
              key={key}
              dataKey={key}
              type="monotone"
              stroke={colors[i]}
              fill={`url(#fill-${key}-${compact})`}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
