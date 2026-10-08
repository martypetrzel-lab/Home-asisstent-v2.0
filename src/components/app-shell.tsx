"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  ChartNoAxesCombined,
  ChevronRight,
  CloudSun,
  House,
  LayoutDashboard,
  Maximize,
  Minimize,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  WifiOff,
  Zap,
} from "lucide-react";
import { useHome, usePreferences } from "@/hooks/use-home";
import { ConnectionStatus } from "@/components/dashboard/cards";
import { time } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
export function KioskModeToggle() {
  const { preferences, update } = usePreferences();
  const [message, setMessage] = useState("");
  async function toggle() {
    const next = !preferences.kiosk;
    update({ kiosk: next });
    try {
      if (next && !document.fullscreenElement)
        await document.documentElement.requestFullscreen();
      else if (!next && document.fullscreenElement)
        await document.exitFullscreen();
    } catch {
      setMessage(
        "Prohlížeč nepovolil celou obrazovku. Rozložení tabletu je aktivní.",
      );
    }
  }
  return (
    <>
      <button
        onClick={toggle}
        className="kiosk-toggle"
        aria-label={
          preferences.kiosk ? "Ukončit režim tabletu" : "Spustit režim tabletu"
        }
      >
        {preferences.kiosk ? <Minimize size={17} /> : <Maximize size={17} />}
        <span>
          {preferences.kiosk ? "Ukončit režim tabletu" : "Režim tabletu"}
        </span>
      </button>
      {message && (
        <p role="status" className="note">
          {message}
        </p>
      )}
    </>
  );
}
export function DashboardHeader() {
  const path = usePathname();
  const { data, mode } = useHome();
  const { preferences, update } = usePreferences();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <header className="dashboard-header">
      <div className="breadcrumb">
        Domov <ChevronRight size={13} />
        <strong>{nav.find((n) => n.href === path)?.label || "Přehled"}</strong>
      </div>
      <div className="header-right">
        <div className="header-date">
          <strong>{now ? time(now) : "—:—"}</strong>
          <span>
            {now
              ? now.toLocaleDateString("cs-CZ", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: "Europe/Prague",
                })
              : "Načítání data"}
          </span>
        </div>
        <div className="header-divider" />
        <div className="header-connection">
          <ConnectionStatus />
          <small>
            {data.device.lastUpdate
              ? `Aktualizováno ${time(data.device.lastUpdate)}`
              : "Bez úspěšné aktualizace"}
          </small>
        </div>
        <span className={`mode-badge ${mode === "live" ? "live" : ""}`}>
          <span className="status-dot" />
          {mode === "demo" ? "DEMO REŽIM" : "ŽIVÝ REŽIM"}
        </span>
        <button
          className="icon-button theme-toggle"
          aria-label={
            preferences.theme === "dark" ? "Světlý vzhled" : "Tmavý vzhled"
          }
          onClick={() =>
            update({ theme: preferences.theme === "dark" ? "light" : "dark" })
          }
        >
          {preferences.theme === "dark" ? (
            <Sun size={18} />
          ) : (
            <Moon size={18} />
          )}
        </button>
        <Link
          href="/nastaveni"
          className="icon-button"
          aria-label="Otevřít nastavení"
        >
          <Settings size={19} />
        </Link>
      </div>
    </header>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences();
  const { isError, error, isLoading, refetch } = useHome();
  const [sleeping, setSleeping] = useState(false);
  useEffect(() => {
    if (!preferences.kiosk || !preferences.screensaver) return;
    let timeout: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setSleeping(true), 120000);
    };
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timeout);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [preferences.kiosk, preferences.screensaver]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSleeping(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  return (
    <div
      className={`app-shell ${preferences.kiosk ? "kiosk" : ""} ${preferences.dim && preferences.kiosk ? "dimmed" : ""}`}
    >
      <a href="#main" className="skip-link">
        Přejít k obsahu
      </a>
      <aside className="sidebar">
        <Link
          href="/"
          className="brand"
          aria-label="Home Assistant ESP32 — Přehled"
        >
          <span className="brand-symbol">
            <House size={25} strokeWidth={1.7} />
            <i />
          </span>
          <div>
            <strong>
              home<span>assistant</span>
            </strong>
            <small>
              ESP32 <span> / </span> V2.0
            </small>
          </div>
        </Link>
        <div className="nav-group-label">VAŠE DOMÁCNOST</div>
        <Navigation />
        <div className="sidebar-bottom">
          <div className="system-preview">
            <div>
              <ShieldCheck size={16} />
              <strong>
                {preferences.mode === "demo"
                  ? "Bezpečný demo režim"
                  : "Živá data"}
              </strong>
            </div>
            <p>
              {preferences.mode === "demo"
                ? "Prozkoumejte svůj nový domov. Všechna data jsou simulovaná."
                : "Bez připojeného zařízení nejsou měření dostupná."}
            </p>
            <Link href="/nastaveni">
              Nastavení připojení <ArrowUpRight size={14} />
            </Link>
          </div>
          <KioskModeToggle />
          <div className="sidebar-version">
            <span className="status-dot" /> Home Assistant ESP32{" "}
            <small>2.0.0</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <DashboardHeader />
        <main id="main">
          {preferences.kiosk && (
            <div className="kiosk-exit">
              <KioskModeToggle />
            </div>
          )}
          {isError && (
            <div role="alert" className="error-banner">
              <WifiOff size={20} />
              <div>
                <strong>Zařízení není dostupné</strong>
                <p>{error?.message}</p>
              </div>
              <Button variant="outline" onClick={() => void refetch()}>
                Zkusit znovu
              </Button>
            </div>
          )}
          {isLoading && (
            <div role="status" className="loading-bar">
              <Activity size={15} /> Načítání měření…
            </div>
          )}
          {children}
        </main>
      </div>
      {sleeping && preferences.kiosk && preferences.screensaver && (
        <div className="screensaver">
          <button onClick={() => setSleeping(false)}>
            <Moon size={38} />
            <strong>Váš domov odpočívá.</strong>
            <span>Klepněte pro návrat</span>
          </button>
        </div>
      )}
    </div>
  );
}
