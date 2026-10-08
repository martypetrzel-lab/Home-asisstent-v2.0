import { spawn } from "node:child_process";
import { resolve, sep } from "node:path";
import { railwayEnvironment, configurationErrors } from "./railway-config.mjs";

const environment = railwayEnvironment();
const errors = configurationErrors(environment);
if (environment.RAILWAY_ENVIRONMENT_ID) {
  const mount = environment.RAILWAY_VOLUME_MOUNT_PATH;
  const data = resolve(environment.CLOUD_DATA_DIR);
  if (
    !mount ||
    (data !== resolve(mount) && !data.startsWith(resolve(mount) + sep))
  )
    errors.push(
      "Připojte ke službě Railway Volume na /data pro CLOUD_DATA_DIR.",
    );
}
if (errors.length) {
  console.error(
    "Railway není připraveno:\n" + errors.map((v) => "- " + v).join("\n"),
  );
  process.exit(1);
}
console.log(
  "Railway: cloudová konfigurace připravena; přihlašovací údaje se nevypisují.",
);
if (!process.argv.includes("--check")) {
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"],
    {
      stdio: "inherit",
      env: environment,
    },
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => child.kill(signal));
  child.on("error", () => {
    console.error("Webový server se nepodařilo spustit.");
    process.exit(1);
  });
  child.on("exit", (code) => process.exit(code ?? 1));
}
