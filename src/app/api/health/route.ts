import { configurationErrors } from "../../../../scripts/railway-config.mjs";
import { cloudStore } from "@/lib/cloud-store";
import { jsonResponse } from "@/lib/server-auth";
export const runtime = "nodejs";
export function GET() {
  // Deployment readiness does not depend on whether the physical ESP32 is online.
  if (process.env.ESP32_TRANSPORT !== "cloud")
    return jsonResponse({ status: "ok", transport: "local" });
  const errors = configurationErrors(process.env);
  if (errors.length)
    return jsonResponse(
      { status: "not_ready", checks: { configuration: false }, errors },
      503,
    );
  try {
    cloudStore().checkStorage();
    return jsonResponse({
      status: "ok",
      transport: "cloud",
      checks: { configuration: true, storage: true },
    });
  } catch {
    return jsonResponse(
      {
        status: "not_ready",
        checks: { configuration: true, storage: false },
        errors: ["Úložiště historie není dostupné."],
      },
      503,
    );
  }
}
