"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useState,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  CloudSun,
  House,
  LayoutDashboard,
  Maximize,
  Minimize,
  Moon,
  Settings,
  ShieldCheck,
  WifiOff,
  Zap,
} from "lucide-react";
import { useHome, usePreferences } from "@/hooks/use-home";
import { useClock } from "@/hooks/use-display";
import { ConnectionStatus } from "@/components/dashboard/cards";
import { time } from "@/lib/utils";
import { isQuietTime } from "@/lib/tablet";
import { Button } from "@/components/ui/button";
import { PwaRegistration } from "@/components/tablet/pwa-registration";
const nav = [
  { href: "/", label: "Přehled", icon: LayoutDashboard },
  { href: "/domacnost", label: "Domácnost", icon: House },
  { href: "/pocasi", label: "Počasí", icon: CloudSun },
  { href: "/energie", label: "Energie", icon: Zap },
  { href: "/historie", label: "Historie", icon: ChartNoAxesCombined },
  { href: "/nastaveni", label: "Nastavení", icon: Settings },
];
export function Navigation() {
  const path = usePathname();
  return (
    <nav aria-label="Hlavní navigace">
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={path === item.href ? "nav-item selected" : "nav-item"}
          aria-current={path === item.href ? "page" : undefined}
        >
          <item.icon size={20} />
          <span>{item.label}</span>
          {path === item.href && <span className="nav-selected-dot" />}
        </Link>
      ))}
    </nav>
  );
}
async function enterFullscreen(landscape: boolean) {
  if (!document.fullscreenElement) {
    if (!document.documentElement.requestFullscreen)
      throw new Error("Celá obrazovka není podporována.");
    await document.documentElement.requestFullscreen();
  }
  if (landscape) {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (value: string) => Promise<void>;
    };
    try {
      await orientation.lock?.("landscape");
    } catch {
      /* Device may not support orientation lock. */
    }
  }
}
export function FullscreenButton() {
  const { preferences } = usePreferences();
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(false);
  useEffect(() => {
    const change = () => setActive(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  return (
    <div className="fullscreen-control">
      <Button
        variant="outline"
        onClick={async () => {
          try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await enterFullscreen(preferences.landscape);
            setMessage("");
          } catch {
            setMessage(
              "Celá obrazovka není dostupná. Rozhraní zůstává funkční; použijte PWA nebo kiosk prohlížeč.",
            );
          }
        }}
      >
        {active ? <Minimize size={18} /> : <Maximize size={18} />}{" "}
        {active ? "Ukončit celou obrazovku" : "Celá obrazovka"}
      </Button>
      {message && (
        <p className="note" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
export function KioskModeToggle() {
  const { preferences, update } = usePreferences();
  const [message, setMessage] = useState("");
  return (
    <>
      <button
        className="kiosk-toggle"
        aria-label={
          preferences.kiosk ? "Ukončit režim tabletu" : "Spustit režim tabletu"
        }
        onClick={async () => {
          const next = !preferences.kiosk;
          update({ kiosk: next });
          try {
            if (next) await enterFullscreen(preferences.landscape);
            else if (document.fullscreenElement)
              await document.exitFullscreen();
            setMessage("");
          } catch {
            setMessage(
              "Prohlížeč nepovolil celou obrazovku. Rozložení tabletu je aktivní.",
            );
          }
        }}
      >
        {preferences.kiosk ? <Minimize size={18} /> : <Maximize size={18} />}
        <span>
          {preferences.kiosk ? "Ukončit režim tabletu" : "Režim tabletu"}
        </span>
      </button>
      {message && (
        <p className="note" role="status">
          {message}
        </p>
      )}
    </>
  );
}
export function DashboardHeader() {
  const path = usePathname();
  const { data, mode, lastSuccessfulUpdate, online } = useHome();
  const now = useClock();
  return (
    <header className="dashboard-header">
      <div className="breadcrumb">
        <House size={19} />
        <div>
          <strong>
            home<span>assistant</span>
          </strong>
          <small>{nav.find((n) => n.href === path)?.label} · ESP32</small>
        </div>
      </div>
      <div className="header-clock">
        <strong>{time(now)}</strong>
        <span>
          {now.toLocaleDateString("cs-CZ", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Europe/Prague",
          })}
        </span>
      </div>
      <div className="header-right">
        <div className="header-connection">
          <ConnectionStatus />
          <small>
            {!online
              ? "Prohlížeč je offline"
              : lastSuccessfulUpdate
                ? `${data.device.connected ? "Aktualizace" : "Naposledy"} ${time(lastSuccessfulUpdate)}`
                : "Bez úspěšné aktualizace"}
          </small>
        </div>
        <span className={`mode-badge ${mode === "live" ? "live" : ""}`}>
          <span className="status-dot" />
          {mode === "demo" ? "DEMO REŽIM" : "ŽIVÝ REŽIM"}
        </span>
        <Link
          href="/nastaveni"
          className="icon-button"
          aria-label="Otevřít nastavení"
        >
          <Settings size={21} />
        </Link>
      </div>
    </header>
  );
}
function ScreenPreservation() {
  const { preferences } = usePreferences();
  const now = useClock();
  const [idle, setIdle] = useState<"active" | "dim" | "saver">("active");
  const idleRef = useRef(idle);
  useEffect(() => {
    let dimTimer: ReturnType<typeof setTimeout>;
    let saverTimer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(dimTimer);
      clearTimeout(saverTimer);
      if (preferences.autoDim)
        dimTimer = setTimeout(() => {
          if (idleRef.current === "saver") return;
          idleRef.current = "dim";
          setIdle("dim");
        }, preferences.dimAfter * 1000);
      if (preferences.screensaver)
        saverTimer = setTimeout(() => {
          idleRef.current = "saver";
          setIdle("saver");
        }, preferences.saverAfter * 1000);
    };
    const activity = (event: Event) => {
      if (idleRef.current !== "active") {
        event.preventDefault();
        event.stopPropagation();
      }
      idleRef.current = "active";
      setIdle("active");
      schedule();
    };
    schedule();
    const events = ["pointerdown", "keydown"];
    events.forEach((e) => window.addEventListener(e, activity, true));
    return () => {
      clearTimeout(dimTimer);
      clearTimeout(saverTimer);
      events.forEach((e) => window.removeEventListener(e, activity, true));
    };
  }, [
    preferences.autoDim,
    preferences.dimAfter,
    preferences.screensaver,
    preferences.saverAfter,
  ]);
  const saver = idle === "saver" && preferences.screensaver;
  const dim = idle === "dim" && preferences.autoDim;
  if (!saver && !dim) return null;
  return (
    <div
      className={saver ? "screensaver clock-screensaver" : "idle-dim-overlay"}
    >
      <button
        autoFocus
        aria-label="Probudit ovládací panel"
        onClick={() => setIdle("active")}
      >
        {saver ? (
          <>
            <Moon size={28} />
            <strong>{time(now)}</strong>
            <span>
              {now.toLocaleDateString("cs-CZ", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "Europe/Prague",
              })}
            </span>
          </>
        ) : null}
        <small>Klepnutím probudíte panel</small>
      </button>
    </div>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences();
  const path = usePathname();
  const now = useClock(30000);
  const {
    isError,
    error,
    isLoading,
    refetch,
    online,
    stale,
    lastSuccessfulUpdate,
    mode,
  } = useHome();
  const night =
    preferences.nightEnabled &&
    isQuietTime(now, preferences.nightStart, preferences.nightEnd);
  const overview = path === "/";
  const variables = {
    "--bezel": `${preferences.safeMargin}px`,
    "--ui-scale": preferences.uiScale / 100,
    "--touch-size": `${preferences.touchSize}px`,
  } as CSSProperties;
  return (
    <div
      style={variables}
      className={`app-shell ${overview ? "overview-route" : ""} ${preferences.kiosk ? "kiosk" : ""} ${preferences.dim ? "manual-dim" : ""} ${night ? "night-mode" : ""} ${preferences.reducedMotion ? "reduced-motion" : ""} ${preferences.flipped ? "flipped" : ""}`}
    >
      <PwaRegistration />
      <a className="skip-link" href="#main">
        Přejít k obsahu
      </a>
      <aside className="sidebar">
        <Link
          href="/"
          className="brand"
          aria-label="Home Assistant ESP32 — Přehled"
        >
          <span className="brand-symbol">
            <House size={25} />
          </span>
          <div>
            <strong>
              home<span>assistant</span>
            </strong>
            <small>ESP32 / V2.2</small>
          </div>
        </Link>
        <div className="nav-group-label">VAŠE DOMÁCNOST</div>
        <Navigation />
        <div className="sidebar-bottom">
          <div className="system-preview">
            <div>
              <ShieldCheck size={16} />
              <strong>
                {mode === "demo" ? "Bezpečný demo režim" : "Živá data"}
              </strong>
            </div>
            <p>
              {mode === "demo"
                ? "Všechna měření jsou simulovaná."
                : "Měření z připojeného zařízení."}
            </p>
            <Link href="/nastaveni">
              Nastavení tabletu <ArrowUpRight size={14} />
            </Link>
          </div>
          <KioskModeToggle />
        </div>
      </aside>
      <div className="workspace">
        <DashboardHeader />
        <main id="main">
          {(isError || !online || stale) && (
            <div role="alert" className="error-banner">
              <WifiOff size={20} />
              <div>
                <strong>
                  {!online
                    ? "Síť není dostupná"
                    : stale
                      ? "Měření není aktuální"
                      : "ESP32 není připojeno"}
                </strong>
                <p>
                  {!online
                    ? mode === "demo"
                      ? "Offline rozhraní · demo data jsou simulovaná."
                      : "Živá měření jsou skryta. Připojení se obnoví automaticky."
                    : stale
                      ? "Čekám na čerstvá data z ESP32."
                      : error?.message}
                </p>
              </div>
              <Button variant="outline" onClick={() => void refetch()}>
                Zkusit znovu
              </Button>
            </div>
          )}
          {isLoading && (
            <div role="status" className="loading-bar">
              Načítání měření…
            </div>
          )}
          {children}
        </main>
        <footer className="panel-footer">
          <Navigation />
          <div className="panel-status">
            <span className="status-dot" />
            {!online
              ? "Offline"
              : mode === "demo"
                ? "Simulovaná domácnost"
                : isError || stale
                  ? "Čeká na spojení"
                  : "ESP32 připojeno"}
            <small>
              {lastSuccessfulUpdate
                ? `Poslední spojení ${time(lastSuccessfulUpdate)}`
                : "Bez měření"}
            </small>
          </div>
          {preferences.kiosk && <KioskModeToggle />}
        </footer>
      </div>
      <ScreenPreservation />
    </div>
  );
}
