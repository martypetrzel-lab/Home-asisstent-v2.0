import {
  authConfigured,
  cookieHeader,
  equalSecret,
  jsonResponse,
  makeSession,
  readJson,
  sameOrigin,
  validSession,
} from "@/lib/server-auth";
export const runtime = "nodejs";
let failures = 0,
  windowStart = 0;
export async function GET(request: Request) {
  return jsonResponse({
    configured: authConfigured(),
    authenticated: validSession(request),
  });
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return jsonResponse({ error: "Nepovolený původ požadavku." }, 403);
  if (!authConfigured())
    return jsonResponse(
      {
        error:
          "Správce musí nastavit DASHBOARD_PASSWORD a SESSION_SECRET na serveru.",
      },
      503,
    );
  if (Date.now() - windowStart > 60000) {
    windowStart = Date.now();
    failures = 0;
  }
  if (failures >= 8)
    return jsonResponse(
      { error: "Příliš mnoho pokusů. Počkejte minutu." },
      429,
      { "Retry-After": "60" },
    );
  let input: unknown;
  try {
    input = await readJson(request);
  } catch {
    return jsonResponse({ error: "Neplatný požadavek přihlášení." }, 400);
  }
  const password =
    input && typeof input === "object" && "password" in input
      ? input.password
      : undefined;
  if (
    typeof password !== "string" ||
    !equalSecret(password, process.env.DASHBOARD_PASSWORD!)
  ) {
    failures++;
    return jsonResponse({ error: "Nesprávné heslo." }, 401);
  }
  failures = 0;
  return jsonResponse({ authenticated: true }, 200, {
    "Set-Cookie": cookieHeader(request, makeSession()),
  });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request) || !validSession(request))
    return jsonResponse({ error: "Přístup byl odmítnut." }, 403);
  return jsonResponse({ authenticated: false }, 200, {
    "Set-Cookie": cookieHeader(request, ""),
  });
}
