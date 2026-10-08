import {
  jsonResponse,
  readJson,
  sameOrigin,
  validSession,
} from "@/lib/server-auth";
import { cloudEnabled } from "@/lib/cloud-store";
import { cloudForward } from "@/lib/cloud-api";
export const runtime = "nodejs";
const paths = new Set([
  "state",
  "climate",
  "solar",
  "relay",
  "relays",
  "power",
  "system",
  "health",
  "version",
  "history",
]);
type Context = { params: Promise<{ path: string[] }> };
async function forward(request: Request, context: Context) {
  if (!validSession(request))
    return jsonResponse(
      { error: { message: "Pro živé ovládání se přihlaste v Nastavení." } },
      401,
    );
  if (request.method === "POST" && !sameOrigin(request))
    return jsonResponse(
      { error: { message: "Nepovolený původ požadavku." } },
      403,
    );
  const { path } = await context.params;
  const route = path.join("/");
  const relayWrite = route === "relay" || /^relays\/[12]$/.test(route);
  const readAllowed = path.length === 1 && paths.has(route);
  if (request.method === "POST" ? !relayWrite : !readAllowed)
    return jsonResponse({ error: { message: "Endpoint neexistuje." } }, 404);
  if (cloudEnabled()) return cloudForward(request, route);
  const target = process.env.ESP32_API_URL,
    token = process.env.ESP32_API_TOKEN;
  if (!target || !token || token.length < 32)
    return jsonResponse(
      {
        error: {
          message:
            "Místní brána nemá nastavené ESP32_API_URL a ESP32_API_TOKEN.",
        },
      },
      503,
    );
  let base: URL;
  try {
    base = new URL(target);
    if (
      !["http:", "https:"].includes(base.protocol) ||
      base.username ||
      base.password ||
      base.search ||
      base.hash
    )
      throw new Error();
  } catch {
    return jsonResponse(
      { error: { message: "Neplatná serverová adresa ESP32." } },
      503,
    );
  }
  const url = new URL(base.toString().replace(/\/$/, "") + "/" + route);
  const query = new URL(request.url).searchParams;
  for (const [key, value] of query) {
    if (
      path[0] !== "history" ||
      key !== "limit" ||
      !/^\d{1,3}$/.test(value) ||
      Number(value) < 1 ||
      Number(value) > 288
    )
      return jsonResponse(
        { error: { message: "Neplatný parametr API." } },
        400,
      );
    url.searchParams.set(key, value);
  }
  let body: string | undefined;
  if (request.method === "POST") {
    try {
      const input = await readJson(request, 512);
      if (
        !input ||
        typeof input !== "object" ||
        !("state" in input) ||
        typeof input.state !== "boolean"
      )
        throw new Error();
      body = JSON.stringify(input);
    } catch {
      return jsonResponse({ error: { message: "Neplatný příkaz relé." } }, 400);
    }
  }
  try {
    const response = await fetch(url, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(6000),
    });
    const value: unknown = await response.json();
    return jsonResponse(value, response.status);
  } catch {
    return jsonResponse(
      {
        error: {
          message: "ESP32 není připojeno. Spojení s místní jednotkou selhalo.",
        },
      },
      502,
    );
  }
}
export const GET = forward;
export const POST = forward;
