import type { Preferences } from "@/types";
export const tabletDefaults = {
  safeMargin: 16,
  uiScale: 100,
  touchSize: 52,
  flipped: false,
  landscape: true,
  nightEnabled: true,
  nightStart: "22:00",
  nightEnd: "05:00",
  autoDim: false,
  dimAfter: 60,
  saverAfter: 120,
  reducedMotion: false,
};
export function parseTabletPreferences(
  value: Record<string, unknown>,
): Pick<Preferences, keyof typeof tabletDefaults> {
  const bounded = (key: string, min: number, max: number, fallback: number) =>
    typeof value[key] === "number" && Number.isFinite(value[key])
      ? Math.max(min, Math.min(max, value[key]))
      : fallback;
  const clock = (key: string, fallback: string) =>
    typeof value[key] === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value[key])
      ? value[key]
      : fallback;
  return {
    safeMargin: bounded("safeMargin", 0, 40, 16),
    uiScale: bounded("uiScale", 90, 115, 100),
    touchSize: [48, 52, 56].includes(Number(value.touchSize))
      ? Number(value.touchSize)
      : 52,
    flipped: value.flipped === true,
    landscape: value.landscape !== false,
    nightEnabled: value.nightEnabled !== false,
    nightStart: clock("nightStart", "22:00"),
    nightEnd: clock("nightEnd", "05:00"),
    autoDim: value.autoDim === true,
    dimAfter: [30, 60, 120, 300].includes(Number(value.dimAfter))
      ? Number(value.dimAfter)
      : 60,
    saverAfter: [120, 300, 600].includes(Number(value.saverAfter))
      ? Number(value.saverAfter)
      : 120,
    reducedMotion: value.reducedMotion === true,
  };
}
export function isQuietTime(date: Date, start: string, end: string) {
  const current = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  if (start === end) return false;
  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
}
export function isMeasurementFresh(timestamp: string | null, now: number) {
  return (
    !!timestamp &&
    Number.isFinite(Date.parse(timestamp)) &&
    Math.abs(now - Date.parse(timestamp)) <= 120000
  );
}
