export type DataMode = "demo" | "live";
export interface DeviceStatus {
  connected: boolean;
  name: string;
  lastUpdate: string | null;
}
export interface IndoorClimate {
  temperature: number | null;
  humidity: number | null;
}
export interface OutdoorClimate extends IndoorClimate {
  trend: number | null;
}
export interface SolarMeasurements {
  power: number | null;
  voltage: number | null;
  current: number | null;
  dailyEnergy: number | null;
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
}
export interface WeatherCurrent {
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
  indoorTemperature: number;
  outdoorTemperature: number;
  indoorHumidity: number;
  outdoorHumidity: number;
  solarPower: number;
  solarEnergy: number;
}
export interface SystemDiagnostics {
  uptime: number | null;
  signal: number | null;
  firmware: string | null;
  consumption: number | null;
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
}
