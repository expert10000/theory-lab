import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import {
  atlasLabFreezeManifest,
  PROTECTED_SCHEMA_PATHS,
} from "../packages/atlas/freeze-manifest";
import { assertAtlasLabFreeze } from "../packages/atlas/freeze-validation";
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const manifest = atlasLabFreezeManifest(
  digest,
  PROTECTED_SCHEMA_PATHS.map((path) => ({
    path,
    sha256: digest(JSON.parse(readFileSync(path, "utf8"))),
  })),
);
assertAtlasLabFreeze(manifest);
const path = "packages/atlas/atlas-lab-reconciliation.v1.json",
  bytes = JSON.stringify(manifest, null, 2) + "\n";
if (process.argv.includes("--write")) writeFileSync(path, bytes);
else {
  const saved = JSON.parse(readFileSync(path, "utf8"));
  assertAtlasLabFreeze(saved);
  if (readFileSync(path, "utf8").replaceAll("\r\n", "\n") !== bytes)
    throw new Error(
      "Frozen reconciliation drift: review additive changes explicitly before regeneration",
    );
  console.log(
    "Verified current Atlas/Lab metadata, review digest and reviewed protocol schema digests",
  );
}
