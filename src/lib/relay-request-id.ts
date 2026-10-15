// getRandomValues works on LAN HTTP origins where randomUUID is unavailable.
export function relayRequestId(
  source: Pick<Crypto, "getRandomValues"> = globalThis.crypto,
): string {
  const bytes = source.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
