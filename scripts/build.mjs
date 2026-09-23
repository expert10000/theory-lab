import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await Promise.all([
  build({
    entryPoints: ["apps/desktop/main/index.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    external: ["electron"],
    outfile: "dist/main.cjs",
  }),
  build({
    entryPoints: ["apps/desktop/preload/index.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    external: ["electron"],
    outfile: "dist/preload.cjs",
  }),
  build({
    entryPoints: ["apps/desktop/renderer/index.tsx"],
    bundle: true,
    platform: "browser",
    format: "esm",
    outfile: "dist/renderer.js",
    minify: true,
  }),
  copyFile("apps/desktop/renderer/index.html", "dist/index.html"),
]);
