"use client";
import { Lightbulb, Power, LoaderCircle, PlugZap } from "lucide-react";
import { useHome, useRelay } from "@/hooks/use-home";
import { useHousehold } from "@/hooks/use-household";
export function RelayControl({
  channel = 1,
  compact = false,
}: {
  channel?: 1 | 2;
  compact?: boolean;
}) {
  const { data, mode } = useHome(),
    mutation = useRelay(channel),
    household = useHousehold();
  const relay = channel === 1 ? data.relay : data.relay2;
  const on = relay?.on === true,
    pending = mutation.isPending;
  const title =
    household.data?.relayNames[channel - 1] ||
    (channel === 1 ? "Světlo pod troubou" : "Volné relé");
  const Icon = channel === 1 ? Lightbulb : PlugZap;
  return (
    <section
      className={`relay-control ${on ? "relay-on" : ""} ${compact ? "compact-relay" : ""}`}
    >
      <div className="relay-top">
        <span className="eyebrow">
          {channel === 1 ? "KUCHYŇ / OSVĚTLENÍ" : "REZERVNÍ VÝSTUP"}
        </span>
        <span className="relay-number">0{channel}</span>
      </div>
      <div className="relay-main">
        <span className="relay-icon">
          <Icon size={30} strokeWidth={1.3} />
        </span>
        <div>
          <h2>{title}</h2>
          <p aria-live="polite">
            {pending
              ? "Čekám na potvrzení ESP32…"
              : relay?.on == null
                ? "Stav není dostupný"
                : on
                  ? "Zapnuto · GPIO potvrzeno"
                  : "Vypnuto · GPIO potvrzeno"}
          </p>
        </div>
        <button
          className={`power-button ${on ? "active" : ""}`}
          aria-pressed={on}
          aria-label={`${on ? "Vypnout" : "Zapnout"} ${title}`}
          disabled={
            pending ||
            (mode === "live" &&
              (!data.device.connected || !relay?.controlAvailable))
          }
          onClick={() => mutation.mutate(!on)}
        >
          {pending ? (
            <LoaderCircle className="spin" size={23} />
          ) : (
            <Power size={23} />
          )}
        </button>
      </div>
      <p className="relay-caption">
        {mode === "demo"
          ? "Simulované ovládání"
          : "Fyzický stav spotřebiče se neměří"}
      </p>
      {mutation.isError && (
        <p className="error-text" role="alert">
          {mutation.error.message}
        </p>
      )}
    </section>
  );
}
