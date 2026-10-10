import { householdStore } from "@/lib/household-store";
import { CloudError } from "@/lib/cloud-store";
import {
  jsonResponse,
  readJson,
  sameOrigin,
  validSession,
} from "@/lib/server-auth";
export const runtime = "nodejs";
async function householdRequest(request: Request, importing = false) {
  if (!validSession(request))
    return jsonResponse({ error: { message: "Nejprve se přihlaste." } }, 401);
  if (request.method !== "GET" && !sameOrigin(request))
    return jsonResponse(
      { error: { message: "Nepovolený původ požadavku." } },
      403,
    );
  try {
    const store = householdStore();
    if (request.method === "GET") return jsonResponse(store.get());
    let input: unknown;
    try {
      input = await readJson(request, 100000);
    } catch {
      return jsonResponse(
        { error: { message: "Neplatný obsah zápisků." } },
        400,
      );
    }
    return jsonResponse(importing ? store.import(input) : store.patch(input));
  } catch (e) {
    return jsonResponse(
      {
        error: {
          message:
            e instanceof CloudError
              ? e.message
              : "Zápisky nyní nelze uložit. Zkuste to znovu.",
        },
      },
      e instanceof CloudError ? e.status : 503,
    );
  }
}
export const GET = (request: Request) => householdRequest(request);
export const POST = (request: Request) => householdRequest(request, true);
export const PATCH = (request: Request) => householdRequest(request);
