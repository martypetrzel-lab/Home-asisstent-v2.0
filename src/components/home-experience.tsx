"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BellRing, Moon, TimerReset } from "lucide-react";
import { useClock } from "@/hooks/use-display";
import { usePreferences } from "@/hooks/use-home";
import {
  durationLabel,
  kitchenTimerView,
  nextClockMode,
  validTimer,
  type ClockMode,
  type KitchenTimer,
} from "@/lib/home-experience";
import { time } from "@/lib/utils";
const Experience = createContext({
  showClock: () => {},
  timer: { mode: "idle", remaining: 600000 } as KitchenTimer,
  start: (ms: number) => {
    void ms;
  },
  pause: () => {},
  cancel: () => {},
  remaining: 600000,
  storageError: false,
});
export function useExperience() {
  return useContext(Experience);
}
export function ExperienceProvider({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences();
  const now = useClock();
  const [mode, setMode] = useState<ClockMode>("");
  const [timer, setTimer] = useState<KitchenTimer>({
    mode: "idle",
    remaining: 600000,
  });
  const [storageError, setStorageError] = useState(false);
  const wakeUntil = useRef(0),
    activityAt = useRef(0),
    clockRef = useRef<ClockMode>(""),
    audio = useRef<AudioContext | null>(null);
  const modeUpdate = (value: ClockMode) => {
    clockRef.current = value;
    setMode(value);
  };
  useEffect(() => {
    try {
      const saved = validTimer(
        JSON.parse(localStorage.getItem("esp32-kitchen-timer") || "null"),
        Date.now(),
      );
      // Browser-only timer restoration happens after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimer(saved);
      if (sessionStorage.getItem("home-clock-manual") === "1")
        modeUpdate("manual");
    } catch {
      setStorageError(true);
    }
  }, []);
  const persist = (value: KitchenTimer) => {
    setTimer(value);
    try {
      localStorage.setItem("esp32-kitchen-timer", JSON.stringify(value));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  };
  useEffect(() => {
    activityAt.current = Date.now();
    let consumeClick = false;
    const clickGuard = (event: Event) => {
      if (!consumeClick) return;
      consumeClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const activity = (event: Event) => {
      if ((event.target as Element)?.closest?.(".timer-alarm")) return;
      consumeClick = false;
      activityAt.current = Date.now();
      wakeUntil.current = Date.now() + 60000;
      if (clockRef.current) {
        consumeClick =
          event.type === "pointerdown" ||
          (event instanceof KeyboardEvent &&
            (event.key === "Enter" || event.key === " "));
        event.preventDefault();
        event.stopPropagation();
        modeUpdate("");
        try {
          sessionStorage.removeItem("home-clock-manual");
        } catch {}
      }
    };
    window.addEventListener("pointerdown", activity, true);
    window.addEventListener("click", clickGuard, true);
    window.addEventListener("keydown", activity, true);
    const tick = () => {
      let next = nextClockMode(
        clockRef.current,
        preferences.nightEnabled,
        new Date(),
        wakeUntil.current,
      );
      if (
        !next &&
        preferences.screensaver &&
        activityAt.current &&
        Date.now() - activityAt.current >= preferences.saverAfter * 1000
      )
        next = "idle";
      if (next !== clockRef.current) modeUpdate(next);
    };
    tick();
    const id = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      window.removeEventListener("pointerdown", activity, true);
      window.removeEventListener("click", clickGuard, true);
      window.removeEventListener("keydown", activity, true);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [
    preferences.nightEnabled,
    preferences.screensaver,
    preferences.saverAfter,
  ]);
  useEffect(() => {
    if (timer.mode !== "running") return;
    const tick = () => {
      if (kitchenTimerView(timer, Date.now()).finished) {
        const done: KitchenTimer = { mode: "done", remaining: 0 };
        setTimer(done);
        try {
          localStorage.setItem("esp32-kitchen-timer", JSON.stringify(done));
        } catch {
          setStorageError(true);
        }
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timer]);
  useEffect(() => {
    if (timer.mode !== "done") return;
    const beep = () => {
      const ctx = audio.current;
      if (!ctx || ctx.state !== "running") return;
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 780;
      gain.gain.setValueAtTime(0.13, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.6);
    };
    beep();
    const id = setInterval(beep, 4000);
    return () => clearInterval(id);
  }, [timer.mode]);
  const remaining = kitchenTimerView(timer, now.getTime()).remaining;
  const cancel = () => persist({ mode: "idle", remaining: 600000 });
  function pauseTimer() {
    if (timer.mode !== "running") return;
    // This context action is invoked by a button, never during render.
    // eslint-disable-next-line react-hooks/purity
    const view = kitchenTimerView(timer, Date.now());
    persist({
      mode: view.finished ? "done" : "paused",
      remaining: view.remaining,
    });
  }
  function startTimer(ms: number) {
    const duration = timer.mode === "paused" ? timer.remaining : ms;
    if (!Number.isFinite(duration) || duration <= 0 || duration > 86459000)
      return;
    try {
      audio.current ||= new AudioContext();
      void audio.current.resume().catch(() => {});
    } catch {}
    // User action needs the exact click time rather than the last display tick.
    // eslint-disable-next-line react-hooks/purity
    const deadline = Date.now() + duration;
    persist({
      mode: "running",
      remaining: duration,
      deadline,
    });
  }
  return (
    <Experience.Provider
      value={{
        timer,
        remaining,
        storageError,
        cancel,
        pause: pauseTimer,
        start: startTimer,
        showClock: () => {
          modeUpdate("manual");
          try {
            sessionStorage.setItem("home-clock-manual", "1");
          } catch {}
        },
      }}
    >
      {children}
      {mode && (
        <div
          className="clock-screensaver"
          role="button"
          tabIndex={0}
          aria-label="Dotykem se vrátíte k panelu"
        >
          <div className="clock-label">
            <Moon size={18} />
            {mode === "night"
              ? "NOČNÍ KLID · 22:00–05:00"
              : "VÁŠ DOMOV. VÁŠ ČAS."}
          </div>
          <div className="clock-face">
            <strong suppressHydrationWarning>{time(now)}</strong>
            <p suppressHydrationWarning>
              {now.toLocaleDateString("cs-CZ", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "Europe/Prague",
              })}
            </p>
            {timer.mode === "running" && (
              <span className="clock-timer">
                <TimerReset size={17} />
                {durationLabel(remaining)}
              </span>
            )}
          </div>
          <small>Dotykem se vrátíte domů</small>
        </div>
      )}
      {timer.mode === "done" && (
        <div
          className="timer-alarm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="timer-finished"
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
            if (e.key === "Tab") e.preventDefault();
          }}
        >
          <div>
            <BellRing size={44} />
            <span className="eyebrow">ČAS NA DOBRÉ JÍDLO</span>
            <h2 id="timer-finished">Čas vaření uplynul.</h2>
            <p>Váš kuchyňský časovač dokončil odpočet.</p>
            <button
              className="button button-primary"
              autoFocus
              onClick={cancel}
            >
              Zastavit upozornění
            </button>
          </div>
        </div>
      )}
    </Experience.Provider>
  );
}
