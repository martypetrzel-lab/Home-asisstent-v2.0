"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import {
  demoSnapshot,
  emptySnapshot,
  getLiveSnapshot,
  setDemoRelay,
  subscribeDemo,
} from "@/services/data";
import type { Preferences, HistoryRange } from "@/types";
import {
  isMeasurementFresh,
  parseTabletPreferences,
  tabletDefaults,
} from "@/lib/tablet";
import { useClock, useConnectivity } from "./use-display";
import { apiRequest, parseHistory, setLiveRelay } from "@/services/esp32";
import { getWeather, withWeather } from "@/services/weather";
const defaults: Preferences = {
  ...tabletDefaults,
  mode: "live",
  theme: "dark",
  kiosk: false,
  dim: false,
  screensaver: false,
  unit: "celsius",
  location: "Nehvizdy",
  refresh: 15,
  endpoint: "",
};
const PreferencesContext = createContext<{
  preferences: Preferences;
  update: (values: Partial<Preferences>) => void;
  ready: boolean;
}>({ preferences: defaults, update: () => {}, ready: false });
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: true },
        },
      }),
  );
  const [preferences, setPreferences] = useState(defaults);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let saved: Partial<Preferences> = {};
    try {
      const value = JSON.parse(
        localStorage.getItem("home-preferences") || "{}",
      );
      saved = {
        ...parseTabletPreferences(value),
        mode: "live",
        theme: value.theme === "light" ? "light" : "dark",
        unit: value.unit === "fahrenheit" ? "fahrenheit" : "celsius",
        kiosk: value.kiosk === true,
        dim: value.dim === true,
        screensaver: value.screensaver === true,
        location:
          typeof value.location === "string" ? value.location : "Nehvizdy",
        refresh: [5, 15, 30, 60].includes(value.refresh) ? value.refresh : 15,
        endpoint: "",
      };
    } catch {
      /* Storage may be blocked; the application remains usable. */
    }
    // Hydrate browser-only preferences after the first server-compatible render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferences({ ...defaults, ...saved });
    let active = true;
    void fetch("/api/config", {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((config) => {
        if (active && config.transport === "cloud") {
          setPreferences((p) => ({ ...p, mode: "live", endpoint: "" }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    const sync = (event: StorageEvent) => {
      if (event.key === "home-preferences") {
        try {
          const p = JSON.parse(event.newValue || "{}");
          setPreferences((prev) => ({
            ...prev,
            ...parseTabletPreferences(p),
            mode: "live",
            endpoint: "",
          }));
        } catch {}
      }
    };
    window.addEventListener("storage", sync);
    return () => {
      active = false;
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme]);
  const update = useCallback(
    (values: Partial<Preferences>) =>
      setPreferences((previous) => {
        const next: Preferences = {
          ...previous,
          ...values,
          mode: "live",
          endpoint: "",
        };
        try {
          localStorage.setItem("home-preferences", JSON.stringify(next));
        } catch {}
        return next;
      }),
    [],
  );
  return (
    <QueryClientProvider client={client}>
      <PreferencesContext.Provider value={{ preferences, update, ready }}>
        {ready ? (
          children
        ) : (
          <div className="initial-loading" role="status">
            Připravuji váš domov…
          </div>
        )}
      </PreferencesContext.Provider>
    </QueryClientProvider>
  );
}
export function usePreferences() {
  return useContext(PreferencesContext);
}
export function useHome(range: HistoryRange = "24h") {
  const { preferences, ready } = usePreferences();
  const client = useQueryClient();
  const online = useConnectivity();
  const now = useClock(10000);
  const stampKey = ["last-update", preferences.mode, preferences.endpoint];
  const stamp = useQuery({
    queryKey: stampKey,
    queryFn: () => {
      try {
        return localStorage.getItem(
          `home-last-update:${preferences.mode}:${preferences.endpoint}`,
        );
      } catch {
        return null;
      }
    },
    staleTime: Infinity,
    enabled: ready,
  });
  const query = useQuery({
    queryKey: ["home", preferences.mode, preferences.endpoint, range],
    queryFn: async ({ signal }) => {
      const result = await (preferences.mode === "demo"
        ? Promise.resolve(demoSnapshot(range))
        : getLiveSnapshot(preferences.endpoint, signal));
      if (result.device.lastUpdate) {
        client.setQueryData(
          stampKey,
          result.device.sourceLastUpdate || result.device.lastUpdate,
        );
        try {
          localStorage.setItem(
            `home-last-update:${preferences.mode}:${preferences.endpoint}`,
            result.device.sourceLastUpdate || result.device.lastUpdate,
          );
        } catch {}
      }
      return result;
    },
    enabled: ready,
    refetchInterval:
      (preferences.mode === "live"
        ? Math.min(preferences.refresh, 5)
        : preferences.refresh) * 1000,
    refetchOnReconnect: "always",
    refetchOnMount: "always",
  });
  const weatherQuery = useQuery({
    queryKey: ["weather", preferences.location],
    queryFn: ({ signal }) => getWeather(preferences.location, signal),
    enabled: ready && preferences.mode === "live",
    staleTime: 600000,
    refetchInterval: 600000,
    refetchOnReconnect: "always",
    retry: false,
  });
  const historyQuery = useQuery({
    queryKey: ["esp32-history", preferences.endpoint, range],
    queryFn: async ({ signal }) =>
      parseHistory(
        await apiRequest(
          preferences.endpoint,
          "history?range=" + range,
          {},
          signal,
        ),
      ),
    enabled: ready && preferences.mode === "live",
    staleTime: 60000,
    refetchInterval: 60000,
    retry: false,
  });
  useEffect(
    () =>
      subscribeDemo(() => {
        void client.invalidateQueries({ queryKey: ["home", "demo"] });
      }),
    [client],
  );
  useEffect(() => {
    if (preferences.mode !== "live" || typeof BroadcastChannel === "undefined")
      return;
    const channel = new BroadcastChannel("home-esp32-live");
    channel.onmessage = () =>
      void client.invalidateQueries({ queryKey: ["home", "live"] });
    return () => channel.close();
  }, [preferences.mode, client]);
  const stale =
    preferences.mode === "live" &&
    !!query.data &&
    (query.data.device.sourceLastUpdate
      ? now.getTime() - Date.parse(query.data.device.sourceLastUpdate) > 15000
      : !isMeasurementFresh(query.data.device.lastUpdate, now.getTime()));
  const available =
    query.isError || stale || (!online && preferences.mode === "live")
      ? emptySnapshot()
      : query.data || emptySnapshot();
  let data = available;
  if (preferences.mode === "live" && available.device.connected) {
    const elapsed = Math.max(
      0,
      now.getTime() - Date.parse(available.device.lastUpdate!),
    );
    const fresh = (age: number | null | undefined) =>
      typeof age === "number" && age + elapsed <= 15000;
    data = {
      ...available,
      indoor: fresh(available.indoor.ageMs)
        ? available.indoor
        : { ...available.indoor, temperature: null, humidity: null },
      outdoor: fresh(available.outdoor.ageMs)
        ? available.outdoor
        : { ...available.outdoor, temperature: null, humidity: null },
      solar: fresh(available.solar.ageMs)
        ? available.solar
        : {
            ...available.solar,
            power: null,
            voltage: null,
            current: null,
            rawCurrentMa: null,
            shuntMv: null,
          },
      history:
        historyQuery.data?.history.filter(
          (r) =>
            Date.parse(r.timestamp) >=
            now.getTime() -
              { "1h": 1, "24h": 24, "7d": 168, "30d": 720 }[range] * 3600000,
        ) || [],
      events: historyQuery.data?.events || [],
    };
  }
  if (preferences.mode === "live")
    data = {
      ...data,
      history: historyQuery.data?.history || [],
      events: historyQuery.data?.events || [],
    };
  if (preferences.mode === "live")
    data = withWeather(
      data,
      weatherQuery.data,
      weatherQuery.isError || !online,
    );
  return {
    ...query,
    weatherError: weatherQuery.error,
    data,
    historyError: historyQuery.error,
    lastSuccessfulUpdate:
      query.data?.device.sourceLastUpdate ||
      query.data?.device.lastUpdate ||
      stamp.data ||
      null,
    online,
    stale,
    mode: preferences.mode,
  };
}
export function useRelay(channel: 1 | 2 = 1) {
  const client = useQueryClient();
  const { preferences } = usePreferences();
  const { data } = useHome();
  return useMutation({
    mutationKey: ["relay", preferences.mode, channel],
    mutationFn: async (on: boolean) => {
      return preferences.mode === "demo"
        ? setDemoRelay(on)
        : setLiveRelay(
            preferences.endpoint,
            on,
            channel === 1
              ? data.relay
              : data.relay2 || {
                  on: null,
                  acknowledgedAt: null,
                  controlAvailable: false,
                },
            data.device.bootId,
            channel,
          );
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["home", preferences.mode] });
      if (
        preferences.mode === "live" &&
        typeof BroadcastChannel !== "undefined"
      ) {
        const channel = new BroadcastChannel("home-esp32-live");
        channel.postMessage("relay");
        channel.close();
      }
    },
    onSettled: () =>
      void client.invalidateQueries({ queryKey: ["home", preferences.mode] }),
  });
}
export function useTemperature() {
  const { preferences } = usePreferences();
  return (v: number | null) =>
    v === null
      ? "Nedostupné"
      : `${new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 }).format(preferences.unit === "fahrenheit" ? (v * 9) / 5 + 32 : v)}°${preferences.unit === "fahrenheit" ? "F" : "C"}`;
}
