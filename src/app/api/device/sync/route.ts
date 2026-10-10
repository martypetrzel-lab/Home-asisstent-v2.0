import { cloudEnabled, cloudStore, CloudError } from "@/lib/cloud-store";
import { equalSecret, jsonResponse, readJson } from "@/lib/server-auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!cloudEnabled())
    return jsonResponse(
      { error: { message: "Cloudový příjem je vypnutý." } },
      503,
    );
  const token = process.env.DEVICE_TOKEN || "";
  if (token.length < 32)
    return jsonResponse(
      { error: { message: "Chybí nastavení DEVICE_TOKEN." } },
      503,
    );
  if (
    !equalSecret(request.headers.get("authorization") || "", `Bearer ${token}`)
  )
    return jsonResponse({ error: { message: "Neplatný klíč zařízení." } }, 401);
  let body: unknown;
  try {
    body = await readJson(request, 24576);
  } catch {
    return jsonResponse({ error: { message: "Neplatná synchronizace." } }, 400);
  }
  try {
    return jsonResponse(
      cloudStore().sync(body, process.env.DEVICE_ID || "homeassistant-esp32"),
    );
  } catch (error) {
    return jsonResponse(
      {
        error: {
          message:
            error instanceof CloudError ? error.message : "Úložiště synchronizace není dostupné.",
        },
      },
      error instanceof CloudError ? error.status : 503,
    );
  }
}
