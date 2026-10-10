import { CZECH_NAMEDAYS } from "./czech-namedays";
export function pragueParts(date: Date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Prague",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
}
export type ClockMode = "" | "manual" | "night" | "idle";
export function nextClockMode(
  mode: ClockMode,
  enabled: boolean,
  date: Date,
  wakeUntil: number,
): ClockMode {
  const p = pragueParts(date),
    minute = Number(p.hour) * 60 + Number(p.minute);
  const night = enabled && (minute >= 1320 || minute < 300);
  if (mode === "night" && !night) return "";
  if (!mode && night && date.getTime() >= wakeUntil) return "night";
  return mode;
}
export function nameDay(date: Date, tomorrow = false) {
  let p = pragueParts(date);
  if (tomorrow)
    p = pragueParts(
      new Date(
        Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + 1, 12),
      ),
    );
  const name = CZECH_NAMEDAYS[p.day + p.month];
  return Array.isArray(name)
    ? name.join(" a ")
    : name || "Bez uvedeného svátku";
}
export interface KitchenTimer {
  mode: "idle" | "running" | "paused" | "done";
  remaining: number;
  deadline?: number;
}
export function kitchenTimerView(timer: KitchenTimer, now: number) {
  const remaining =
    timer.mode === "running"
      ? Math.min(timer.remaining, Math.max(0, (timer.deadline || 0) - now))
      : Math.max(0, timer.remaining);
  return {
    remaining,
    finished:
      timer.mode === "done" || (timer.mode === "running" && remaining === 0),
  };
}
export function validTimer(value: unknown, now: number): KitchenTimer {
  const v = value as KitchenTimer | null;
  if (
    !v ||
    !["idle", "running", "paused", "done"].includes(v.mode) ||
    !Number.isFinite(v.remaining) ||
    v.remaining < 0 ||
    v.remaining > 86459000 ||
    (v.mode === "running" &&
      (!Number.isFinite(v.deadline) || v.deadline! > now + 86460000))
  )
    return { mode: "idle", remaining: 600000 };
  return v;
}
export function durationLabel(ms: number) {
  const s = Math.ceil(ms / 1000);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
