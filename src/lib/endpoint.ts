export function validateEndpoint(endpoint: string) {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Zadejte platnou adresu API včetně http:// nebo https://.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "API musí používat HTTP(S), bez hesla, parametrů a fragmentu v adrese.",
    );
  return url.toString().replace(/\/$/, "");
}
