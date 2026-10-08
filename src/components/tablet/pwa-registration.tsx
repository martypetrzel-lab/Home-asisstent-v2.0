"use client";
import { useEffect, useState } from "react";
export function PwaRegistration() {
  const [error, setError] = useState(false);
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;
    let stopped = false;
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => {
          if (stopped) return;
          setError(false);
          const watchInstallation = () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (
                !stopped &&
                worker.state === "redundant" &&
                !registration.active
              )
                setError(true);
            });
          };
          watchInstallation();
          registration.addEventListener("updatefound", watchInstallation);
          void registration.update().catch(() => {});
        })
        .catch((reason) => {
          console.warn("Offline shell registration failed:", String(reason));
          if (!stopped) setError(true);
        });
    };
    register();
    window.addEventListener("online", register);
    return () => {
      stopped = true;
      window.removeEventListener("online", register);
    };
  }, []);
  return error ? (
    <div className="pwa-error" role="status">
      Offline rozhraní se nepodařilo uložit. Při připojení se pokus zopakuje.
    </div>
  ) : null;
}
