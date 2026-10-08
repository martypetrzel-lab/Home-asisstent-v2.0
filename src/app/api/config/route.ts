import { jsonResponse } from "@/lib/server-auth";
export const runtime = "nodejs";
export function GET() {
  const cloud = process.env.ESP32_TRANSPORT === "cloud";
  return jsonResponse({
    transport: cloud ? "cloud" : "local",
    defaultMode: cloud ? "live" : "demo",
  });
}
