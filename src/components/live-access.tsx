"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
export function LiveAccess() {
  const client = useQueryClient();
  const [password, setPassword] = useState(""),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const session = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const response = await fetch("/api/session", {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error("Přihlášení není dostupné.");
      return response.json() as Promise<{
        configured: boolean;
        authenticated: boolean;
      }>;
    },
    refetchInterval: 60000,
  });
  async function authenticate(logout = false) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/session", {
        method: logout ? "DELETE" : "POST",
        signal: AbortSignal.timeout(8000),
        headers: { "Content-Type": "application/json" },
        ...(logout ? {} : { body: JSON.stringify({ password }) }),
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "Přihlášení selhalo.");
      setPassword("");
      if (logout) {
        window.dispatchEvent(new Event("home-session-expired"));
        return;
      }
      await client.invalidateQueries({ queryKey: ["session"] });
      await client.invalidateQueries({ queryKey: ["home", "live"] });
      await client.invalidateQueries({ queryKey: ["esp32-history"] });
      setMessage(logout ? "Odhlášeno." : "Přihlášeno k serverové bráně.");
    } catch (error) {
      setMessage(
        error instanceof Error &&
          ["TypeError", "AbortError", "TimeoutError"].includes(error.name)
          ? "Přihlášení není dostupné. Zkontrolujte spojení."
          : (error as Error).message,
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="live-access">
      <strong>Přihlášení do domácnosti</strong>
      <p className="note">
        {session.data?.authenticated
          ? "Jste přihlášení. Váš domov máte pod kontrolou."
          : session.data?.configured
            ? "Zadejte heslo a otevřete svůj domov."
            : "Správce musí nastavit server podle dokumentace. Přístup zůstává zamčený."}
      </p>
      {session.data?.authenticated ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => void authenticate(true)}
        >
          Odhlásit se
        </Button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void authenticate();
          }}
        >
          <label className="field-label">
            Heslo dashboardu
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={256}
            />
          </label>
          <Button
            type="submit"
            disabled={pending || !password || !session.data?.configured}
          >
            {pending ? "Přihlašuji…" : "Otevřít domov"}
          </Button>
        </form>
      )}
      {message && (
        <p role="status" className="note">
          {message}
        </p>
      )}
    </div>
  );
}
