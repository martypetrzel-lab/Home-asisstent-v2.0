import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
if (process.argv[2] === "icons") {
  const { default: sharp } = await import("sharp");
  const svg = (await readFile("src/app/icon.svg", "utf8")).replace(
    'width="64" height="64"',
    'width="512" height="512"',
  );
  await mkdir("public/icons", { recursive: true });
  for (const size of [192, 512])
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(`public/icons/icon-${size}.png`);
  await sharp(Buffer.from(svg.replace('rx="16"', 'rx="0"')))
    .png()
    .toFile("public/icons/icon-maskable-512.png");
} else {
  const build = (await readFile(".next/BUILD_ID", "utf8")).trim();
  async function list(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? list(join(dir, entry.name))
          : [join(dir, entry.name)],
      ),
    );
    return files.flat();
  }
  const files = (await list(".next/static"))
    .filter((file) => /\.(js|css|woff2?|svg|png)$/.test(file))
    .map(
      (file) => "/" + file.replaceAll("\\", "/").replace(/^\.next\//, "_next/"),
    );
  const routes = [
    "/",
    "/domacnost",
    "/pocasi",
    "/energie",
    "/historie",
    "/nastaveni",
  ];
  const template = await readFile("src/services/worker-template.js", "utf8");
  await writeFile(
    "public/sw.js",
    template
      .replace(/\/\* global[^*]*\*\//, "")
      .replace("__BUILD__", JSON.stringify(build))
      .replace(
        "__ASSETS__",
        JSON.stringify([
          ...routes,
          "/manifest.webmanifest",
          "/icons/icon-192.png",
          "/icons/icon-512.png",
          "/icons/icon-maskable-512.png",
          ...files,
        ]),
      )
      .replace("__ROUTES__", JSON.stringify(routes)),
  );
  console.log(
    `Offline rozhraní připraveno: ${routes.length} stránek, ${files.length} souborů.`,
  );
}
