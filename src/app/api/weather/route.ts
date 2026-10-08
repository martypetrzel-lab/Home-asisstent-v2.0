import { serverWeather } from "@/lib/server-weather";
import { jsonResponse } from "@/lib/server-auth";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const location = params.get("location")?.trim() || "Nehvizdy";
  if (
    location.length > 80 ||
    !/^[\p{L}\p{N} .,'()\-]+$/u.test(location) ||
    [...params.keys()].some((key) => key !== "location")
  )
    return jsonResponse({ error: "Neplatná poloha pro počasí." }, 400);
  try {
    return jsonResponse(await serverWeather(location));
  } catch {
    return jsonResponse(
      {
        error:
          "Internetová předpověď není dostupná. Lokální měření a ovládání fungují samostatně.",
      },
      503,
    );
  }
}
