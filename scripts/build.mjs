import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await mkdir("dist/web", { recursive: true });
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
  build({
    entryPoints: ["apps/gateway/launch.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: "dist/gateway.cjs",
  }),
  build({
    entryPoints: ["apps/web/index.tsx"],
    bundle: true,
    platform: "browser",
    format: "esm",
    outfile: "dist/web/web.js",
    minify: true,
  }),
  copyFile("apps/desktop/renderer/index.html", "dist/index.html"),
  copyFile("apps/web/index.html", "dist/web/index.html"),
  copyFile("apps/web/dashboard.css", "dist/web/dashboard.css"),
  copyFile("apps/web/atlas.css", "dist/web/atlas.css"),
  copyFile("apps/web/topology.css", "dist/web/topology.css"),
]);
