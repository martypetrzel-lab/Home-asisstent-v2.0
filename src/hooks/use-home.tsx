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
const defaults: Preferences = {
  ...tabletDefaults,
  mode: "demo",
  theme: "dark",
  kiosk: false,
  dim: false,
  screensaver: false,
  unit: "celsius",
  location: "Praha",
  refresh: 15,
  endpoint: process.env.NEXT_PUBLIC_ESP32_API_URL || "",
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
        mode: value.mode === "live" ? "live" : "demo",
        theme: value.theme === "light" ? "light" : "dark",
        unit: value.unit === "fahrenheit" ? "fahrenheit" : "celsius",
        kiosk: value.kiosk === true,
        dim: value.dim === true,
        screensaver: value.screensaver === true,
        location: typeof value.location === "string" ? value.location : "Praha",
        refresh: [5, 15, 30, 60].includes(value.refresh) ? value.refresh : 15,
        endpoint:
          typeof value.endpoint === "string"
            ? value.endpoint
            : defaults.endpoint,
      };
    } catch {
      /* Storage may be blocked; the application remains usable. */
    }
    // Hydrate browser-only preferences after the first server-compatible render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferences({ ...defaults, ...saved });
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === "home-preferences") {
        try {
          const p = JSON.parse(event.newValue || "{}");
          if (p.mode === "live" || p.mode === "demo")
            setPreferences((prev) => ({ ...prev, mode: p.mode }));
        } catch {}
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme]);
  const update = useCallback(
    (values: Partial<Preferences>) =>
      setPreferences((previous) => {
        const next = { ...previous, ...values };
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
        client.setQueryData(stampKey, result.device.lastUpdate);
        try {
          localStorage.setItem(
            `home-last-update:${preferences.mode}:${preferences.endpoint}`,
            result.device.lastUpdate,
          );
        } catch {}
      }
      return result;
    },
    enabled: ready,
    refetchInterval: preferences.refresh * 1000,
    refetchOnReconnect: "always",
    refetchOnMount: "always",
  });
  useEffect(
    () =>
      subscribeDemo(() => {
        void client.invalidateQueries({ queryKey: ["home", "demo"] });
      }),
    [client],
  );
  const stale =
    preferences.mode === "live" &&
    !!query.data &&
    !isMeasurementFresh(query.data.device.lastUpdate, now.getTime());
  return {
    ...query,
    data:
      query.isError || stale || (!online && preferences.mode === "live")
        ? emptySnapshot()
        : query.data || emptySnapshot(),
    lastSuccessfulUpdate: query.data?.device.lastUpdate || stamp.data || null,
    online,
    stale,
    mode: preferences.mode,
  };
}
export function useRelay() {
  const client = useQueryClient();
  const { preferences } = usePreferences();
  return useMutation({
    mutationKey: ["relay", preferences.mode],
    mutationFn: async (on: boolean) => {
      if (preferences.mode !== "demo")
        throw new Error("Zabezpečené ovládání relé zatím není připojeno.");
      return setDemoRelay(on);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["home", "demo"] });
    },
  });
}
export function useTemperature() {
  const { preferences } = usePreferences();
  return (v: number | null) =>
    v === null
      ? "Nedostupné"
      : `${new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 }).format(preferences.unit === "fahrenheit" ? (v * 9) / 5 + 32 : v)}°${preferences.unit === "fahrenheit" ? "F" : "C"}`;
}
