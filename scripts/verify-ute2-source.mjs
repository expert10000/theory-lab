import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/verify-ute2-source.mjs <local-chapter-pdf>");
  process.exit(2);
}

const record = JSON.parse(await readFile("docs/source-material/ute2/CHAPTER_SOURCE.json", "utf8"));
const info = await lstat(source);
if (!info.isFile() || info.isSymbolicLink() || info.size !== record.bytes)
  throw new Error("UTe2 chapter file is missing, linked, or has changed size");
const bytes = await readFile(source);
const actual = createHash("sha256").update(bytes).digest("hex");
if (actual !== record.sha256) throw new Error("UTe2 chapter SHA-256 differs from the reviewed source");

// These are the chapter's worked examples, not a UTe2 material fit.
const xi = 0.6, delta = 0.8, energy = Math.hypot(xi, delta);
const u2 = (1 + xi / energy) / 2, v2 = (1 - xi / energy) / 2;
const a1 = -0.7, a2 = -0.5, b1 = 1, b2 = 1, g = 0.4;
const determinant = b1 * b2 - g * g;
const x = (-b2 * a1 + g * a2) / determinant;
const y = (g * a1 - b1 * a2) / determinant;
const close = (value, expected, tolerance) => Math.abs(value - expected) <= tolerance;
if (!(determinant > 0 && x > 0 && y > 0 &&
  close(energy, 1, 1e-12) && close(u2, 0.8, 1e-12) && close(v2, 0.2, 1e-12) &&
  close(x, 0.5952, 5e-5) && close(y, 0.2619, 5e-5)))
  throw new Error("UTe2 chapter worked-example baseline differs from the pinned equations");

console.log(JSON.stringify({ sourceId: record.id, sha256: actual, bytes: bytes.length,
  workedExamples: { bdgPositiveEnergy: energy, electronWeight: u2, holeWeight: v2,
    landauDeterminant: determinant, sc1AmplitudeSquared: x, sc2AmplitudeSquared: y },
  claim: "source identity and pedagogical examples only; no material-specific UTe2 fit" }, null, 2));
