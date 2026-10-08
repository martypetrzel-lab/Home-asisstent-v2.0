export type DataMode = "demo" | "live";
export interface DeviceStatus {
  connected: boolean;
  name: string;
  lastUpdate: string | null;
  measurementTimestamp?: string | null;
  bootId?: string;
}
export interface IndoorClimate {
  temperature: number | null;
  humidity: number | null;
  ageMs?: number | null;
  available?: boolean;
  minimum?: number | null;
  maximum?: number | null;
}
export interface OutdoorClimate extends IndoorClimate {
  trend: number | null;
}
export interface SolarMeasurements {
  power: number | null;
  voltage: number | null;
  current: number | null;
  dailyEnergy: number | null;
  shuntMv?: number | null;
  ageMs?: number | null;
  location?: string;
  directionConfirmed?: boolean;
  energyPartial?: boolean;
  totalEnergy?: number | null;
  minimum?: number | null;
  maximum?: number | null;
  rawCurrentMa?: number | null;
}
export interface BatteryStatus {
  voltage: number | null;
  charge: number | null;
  measured: boolean;
}
export type PowerSource = "mains" | "battery" | "unknown";
export interface RelayStatus {
  on: boolean | null;
  acknowledgedAt: string | null;
  timerMinutes?: number;
  turnOffAt?: number | null;
  version?: number;
  controlAvailable?: boolean;
  feedbackAvailable?: boolean;
  physicalOn?: boolean | null;
}
export interface WeatherCurrent {
  description?: string;
  humidity?: number | null;
  cloudCover?: number | null;
  precipitationMm?: number | null;
  stale?: boolean;
  fetchedAt?: string;
  location?: string;
  temperature: number | null;
  feelsLike: number | null;
  wind: number | null;
  gusts: number | null;
  pressure: number | null;
  rain: number | null;
  sunrise: string | null;
  sunset: string | null;
  condition: "sunny" | "cloudy" | "rain" | null;
}
export interface WeatherForecast {
  date: string;
  min: number;
  max: number;
  rain: number;
  condition: "sunny" | "cloudy" | "rain";
}
export interface WeatherHourly {
  timestamp: string;
  temperature: number;
  rain: number;
  condition: "sunny" | "cloudy" | "rain";
}
export interface HistoryRecord {
  timestamp: string;
  indoorTemperature: number | null;
  outdoorTemperature: number | null;
  indoorHumidity: number | null;
  outdoorHumidity: number | null;
  solarPower: number | null;
  solarEnergy: number | null;
}
export interface SystemDiagnostics {
  uptime: number | null;
  signal: number | null;
  firmware: string | null;
  consumption: number | null;
  ip?: string | null;
  freeHeap?: number | null;
  build?: string | null;
  rebootReason?: number | null;
  timeSynchronized?: boolean;
  storageReady?: boolean;
}
export interface HomeSnapshot {
  device: DeviceStatus;
  indoor: IndoorClimate;
  outdoor: OutdoorClimate;
  solar: SolarMeasurements;
  battery: BatteryStatus;
  powerSource: PowerSource;
  mains: boolean | null;
  relay: RelayStatus;
  weather: WeatherCurrent;
  forecast: WeatherForecast[];
  hourly: WeatherHourly[];
  history: HistoryRecord[];
  diagnostics: SystemDiagnostics;
  events?: {
    timestamp: string | null;
    kind: string;
    detail: string;
    uptime: number;
  }[];
}
export type HistoryRange = "1h" | "24h" | "7d" | "30d";
export interface Preferences {
  mode: DataMode;
  theme: "dark" | "light";
  kiosk: boolean;
  dim: boolean;
  screensaver: boolean;
  unit: "celsius" | "fahrenheit";
  location: string;
  refresh: number;
  endpoint: string;
  safeMargin: number;
  uiScale: number;
  touchSize: number;
  flipped: boolean;
  landscape: boolean;
  nightEnabled: boolean;
  nightStart: string;
  nightEnd: string;
  autoDim: boolean;
  dimAfter: number;
  saverAfter: number;
  reducedMotion: boolean;
}
