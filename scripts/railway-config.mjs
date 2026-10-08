// Public defaults only. Credentials always come from Railway service variables.
/**
 * @param {Record<string, string | undefined>} values
 * @returns {Record<string, string | undefined> & {ESP32_TRANSPORT: string, DEVICE_ID: string, CLOUD_DATA_DIR: string, DASHBOARD_ORIGIN: string}}
 */
export function railwayEnvironment(values = process.env) {
  return {
    ...values,
    ESP32_TRANSPORT: values.ESP32_TRANSPORT || "cloud",
    DEVICE_ID: values.DEVICE_ID || "homeassistant-esp32",
    CLOUD_DATA_DIR: values.CLOUD_DATA_DIR || "/data",
    DASHBOARD_ORIGIN:
      values.DASHBOARD_ORIGIN ||
      "https://home-asisstent-v20-production.up.railway.app",
  };
}

/** @param {Record<string, string | undefined>} values */
export function configurationErrors(values) {
  const errors = [];
  if (values.ESP32_TRANSPORT !== "cloud")
    errors.push("ESP32_TRANSPORT musí být cloud.");
  for (const [key, length] of [
    ["DEVICE_TOKEN", 32],
    ["DASHBOARD_PASSWORD", 16],
    ["SESSION_SECRET", 32],
  ]) {
    if (typeof values[key] !== "string" || values[key].length < length)
      errors.push(`Chybí ${key} (nejméně ${length} znaků).`);
  }
  const keys = [
    values.DEVICE_TOKEN,
    values.DASHBOARD_PASSWORD,
    values.SESSION_SECRET,
  ];
  if (keys.filter(Boolean).length === 3 && new Set(keys).size !== 3)
    errors.push(
      "DEVICE_TOKEN, DASHBOARD_PASSWORD a SESSION_SECRET musí být odlišné.",
    );
  try {
    const url = new URL(values.DASHBOARD_ORIGIN);
    if (url.protocol !== "https:" || url.origin !== values.DASHBOARD_ORIGIN)
      throw new Error();
  } catch {
    errors.push(
      "DASHBOARD_ORIGIN musí být přesný HTTPS původ bez koncového lomítka.",
    );
  }
  if (values.NEXT_PUBLIC_ESP32_API_URL)
    errors.push(
      "NEXT_PUBLIC_ESP32_API_URL musí být prázdné pro cloudovou bránu.",
    );
  return errors;
}
