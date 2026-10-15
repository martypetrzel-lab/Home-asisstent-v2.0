import { cloudStore, CloudError } from "./cloud-store";
import { jsonResponse, readJson } from "./server-auth";

export async function cloudForward(request: Request, route: string) {
  try {
    const store = cloudStore();
    const query = new URL(request.url).searchParams;
    for (const [key, value] of query) {
      if (
        route !== "history" ||
        !(
          (key === "limit" &&
            /^\d{1,3}$/.test(value) &&
            Number(value) >= 1 &&
            Number(value) <= 288) ||
          (key === "range" && ["1h", "24h", "7d", "30d"].includes(value))
        )
      )
        throw new CloudError("Neplatný parametr API.");
    }
    if (request.method === "POST") {
      let input: unknown;
      try {
        input = await readJson(request, 512);
      } catch {
        throw new CloudError("Neplatný příkaz relé.");
      }
      const id = store.enqueue(route === "relays/2" ? 2 : 1, input);
      const deadline = Date.now() + 6000;
      while (Date.now() < deadline) {
        const result = store.result(id);
        if (result) return jsonResponse(result.body, result.status);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return jsonResponse(
        {
          error: {
            message: "ESP32 zatím nepotvrdilo povel. Načtěte aktuální stav.",
          },
        },
        504,
      );
    }
    if (route === "history")
      return jsonResponse(
        store.history(
          Number(query.get("limit") || 288),
          query.get("range") || "24h",
        ),
      );
    const state = store.state();
    if (route === "state") return jsonResponse(state);
    if (route === "health")
      return jsonResponse({
        apiVersion: 1,
        connected: true,
        receivedAt: state.receivedAt,
      });
    if (route === "version")
      return jsonResponse({ apiVersion: 1, transport: "cloud" });
    const section =
      route === "relay"
        ? { lighting: state.lighting, relays: state.relays }
        : { [route]: state[route] };
    return jsonResponse({ apiVersion: 1, ...section });
  } catch (error) {
    return jsonResponse(
      {
        error: {
          message:
            error instanceof CloudError
              ? error.message
              : "Cloudové úložiště není dostupné.",
        },
      },
      error instanceof CloudError ? error.status : 503,
    );
  }
}
