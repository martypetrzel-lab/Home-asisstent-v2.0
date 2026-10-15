"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  House,
  LayoutDashboard,
  Zap,
  ChartNoAxesCombined,
  Settings,
  Clock3,
  Maximize,
  ShieldCheck,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useHome, usePreferences } from "@/hooks/use-home";
import { useClock } from "@/hooks/use-display";
import { time } from "@/lib/utils";
import { LiveAccess } from "@/components/live-access";
import {
  ExperienceProvider,
  useExperience,
} from "@/components/home-experience";
import { PwaRegistration } from "@/components/tablet/pwa-registration";
const nav = [
  { href: "/", label: "Přehled", icon: LayoutDashboard },
  { href: "/domacnost", label: "Domácnost", icon: House },
  { href: "/energie", label: "Energie", icon: Zap },
  { href: "/historie", label: "Historie", icon: ChartNoAxesCombined },
  { href: "/nastaveni", label: "Nastavení", icon: Settings },
];
export function Navigation() {
  const path = usePathname();
  return (
    <nav aria-label="Hlavní navigace">
      {nav.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`nav-item ${path === n.href ? "selected" : ""}`}
          aria-current={path === n.href ? "page" : undefined}
        >
          <n.icon size={20} />
          <span>{n.label}</span>
        </Link>
      ))}
    </nav>
  );
}
export function FullscreenButton() {
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className="button button-outline"
        onClick={async () => {
          try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await document.documentElement.requestFullscreen();
            setError("");
          } catch {
            setError(
              "Prohlížeč nepovolil celou obrazovku. Použijte režim kiosku.",
            );
          }
        }}
      >
        <Maximize size={17} />
        Celá obrazovka
      </button>
      {error && (
        <p role="status" className="note">
          {error}
        </p>
      )}
    </div>
  );
}
export const KioskModeToggle = FullscreenButton;
export function DashboardHeader() {
  const now = useClock(),
    { data, mode } = useHome(),
    { showClock } = useExperience();
  return (
    <header className="dashboard-header">
      <Link href="/" className="brand">
        <span className="brand-symbol">
          <House size={24} strokeWidth={1.5} />
        </span>
        <div>
          <strong>
            domov<span> / 3.0</span>
          </strong>
          <small>NEHVIZDY · HOME ASSISTANT</small>
        </div>
      </Link>
      <div className="header-clock">
        <strong suppressHydrationWarning>{time(now)}</strong>
        <span suppressHydrationWarning>
          {now.toLocaleDateString("cs-CZ", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Europe/Prague",
          })}
        </span>
      </div>
      <div className="header-right">
        <span
          className={`connection ${data.device.connected ? "healthy" : "neutral"}`}
        >
          {data.device.connected ? <Wifi size={15} /> : <WifiOff size={15} />}
          {mode === "demo"
            ? "Ukázková data"
            : data.device.connected
              ? "Domov je připojen"
              : "ESP32 offline"}
        </span>
        <button
          className="button button-outline clock-button"
          onClick={showClock}
        >
          <Clock3 size={17} />
          Hodiny
        </button>
      </div>
    </header>
  );
}
function Interior({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences(),
    { isError, error, online, stale, refetch } = useHome();
  const variables = {
    "--safe-margin": `${Math.min(preferences.safeMargin, 24)}px`,
    "--ui-scale": preferences.uiScale / 100,
  } as CSSProperties;
  return (
    <ExperienceProvider>
      <div
        style={variables}
        className={`app-shell ${preferences.dim ? "manual-dim" : ""} ${preferences.reducedMotion ? "reduced-motion" : ""} ${preferences.flipped ? "flipped" : ""}`}
      >
        <PwaRegistration />
        <a className="skip-link" href="#main">
          Přejít k obsahu
        </a>
        <DashboardHeader />
        {(isError || !online || stale) && (
          <div className="connection-banner" role="status">
            <WifiOff size={16} />
            <span>
              {!online
                ? "Internet není dostupný. Připojení obnovíme automaticky."
                : stale
                  ? "Čekáme na čerstvá měření z ESP32."
                  : error?.message || "ESP32 se zatím neozvalo."}
            </span>
            <button aria-label="Obnovit měření" onClick={() => void refetch()}>
              <RefreshCw size={16} />
            </button>
          </div>
        )}
        <main id="main">{children}</main>
        <footer className="navigation-dock">
          <span className="dock-caption">
            VÁŠ DOMOV
            <br />
            <b>V ROVNOVÁZE.</b>
          </span>
          <Navigation />
          <span className="dock-signature">
            <span className="status-dot" /> HOME / 03
          </span>
        </footer>
      </div>
    </ExperienceProvider>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  useEffect(() => {
    const expired = () => {
      client.setQueryData(["session"], {
        authenticated: false,
        configured: true,
      });
      void client.cancelQueries({
        predicate: (q) => q.queryKey[0] !== "session",
      });
      client.removeQueries({ predicate: (q) => q.queryKey[0] !== "session" });
    };
    window.addEventListener("home-session-expired", expired);
    return () => window.removeEventListener("home-session-expired", expired);
  }, [client]);
  const session = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const r = await fetch("/api/session", {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error("Připojení k domovu není dostupné.");
      return r.json() as Promise<{
        authenticated: boolean;
        configured: boolean;
      }>;
    },
    refetchInterval: 60000,
  });
  if (!session.data?.authenticated)
    return (
      <div className="login-screen">
        <div className="login-orbit" aria-hidden="true" />
        <section className="login-panel">
          <House size={38} strokeWidth={1.2} />
          <span className="eyebrow">HOME ASSISTANT / 3.0</span>
          <h1>Vítejte doma.</h1>
          <p>Váš klid. Vaše světlo. Váš prostor.</p>
          {session.isLoading ? (
            <p role="status">Připojujeme váš domov…</p>
          ) : (
            <LiveAccess />
          )}
          {session.isError && (
            <p className="error-text" role="alert">
              {session.error.message}
            </p>
          )}
          <small>
            <ShieldCheck size={14} /> Soukromý přístup k vaší domácnosti
          </small>
        </section>
      </div>
    );
  return <Interior>{children}</Interior>;
}
