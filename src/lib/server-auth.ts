import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
export const sessionCookie = "home-session";
const lifetime = 12 * 60 * 60;
export function authConfigured() {
  return (
    (process.env.DASHBOARD_PASSWORD?.length || 0) >= 16 &&
    (process.env.SESSION_SECRET?.length || 0) >= 32
  );
}
export function sameOrigin(request: Request) {
  const expected = process.env.DASHBOARD_ORIGIN || new URL(request.url).origin;
  return request.headers.get("origin") === expected;
}
export function equalSecret(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function makeSession(now = Date.now()) {
  if (!authConfigured()) throw new Error("Přihlášení není nakonfigurováno.");
  const payload = Buffer.from(
    JSON.stringify({
      expires: now + lifetime * 1000,
      nonce: randomBytes(24).toString("hex"),
    }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", process.env.SESSION_SECRET!).update(payload).digest("base64url")}`;
}
export function validSession(request: Request, now = Date.now()) {
  if (!authConfigured()) return false;
  const token =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(sessionCookie + "="))
      ?.slice(sessionCookie.length + 1) || "";
  const parts = token.split(".");
  if (parts.length !== 2 || token.length > 512) return false;
  const signature = createHmac("sha256", process.env.SESSION_SECRET!)
    .update(parts[0])
    .digest("base64url");
  if (!equalSecret(signature, parts[1])) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    return (
      typeof payload.expires === "number" &&
      payload.expires > now &&
      payload.expires <= now + lifetime * 1000
    );
  } catch {
    return false;
  }
}
export function cookieHeader(request: Request, token: string) {
  const secure = (process.env.DASHBOARD_ORIGIN || request.url).startsWith(
    "https:",
  );
  return `${sessionCookie}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? lifetime : 0}${secure ? "; Secure" : ""}`;
}
export async function readJson(request: Request, max = 4096): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("Použijte application/json.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Chybí tělo požadavku.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new Error("Požadavek je příliš velký.");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export const jsonResponse = (
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
