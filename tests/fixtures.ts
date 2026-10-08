export function liveFixture() {
  return {
    apiVersion: 1,
    deviceId: "homeassistant-esp32",
    bootId: "test-boot",
    timestamp: new Date().toISOString() as string | null,
    uptimeSeconds: 100,
    climate: {
      indoor: {
        temperatureC: 23,
        humidityPct: 49,
        available: true,
        stale: false,
        ageMs: 1000,
      },
      outdoor: {
        temperatureC: 16,
        humidityPct: null,
        available: false,
        stale: true,
        ageMs: 20000,
      },
    },
    solar: {
      voltageV: 18,
      currentA: 0.4,
      powerW: 7.2,
      energyTodayWh: 4.5,
      energyTotalWh: 123.4,
      minPowerW: -0.2,
      maxPowerW: 9.1,
      rawCurrentMa: 400,
      available: true,
      stale: false,
      ageMs: 1000,
      directionConfirmed: true,
    },
    lighting: {
      kitchenLed: {
        commandedOn: false,
        version: 2,
        controlAvailable: true,
        feedbackAvailable: false,
        physicalOn: null,
      },
    },
    power: {
      activeSource: "UNKNOWN",
      statusInstalled: false,
      batteryVoltageV: 13,
      batterySocPct: 90,
    },
    system: { firmwareVersion: "test", timeSynchronized: true },
  };
}
