import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "docs/source-material/rb87-companion";
const chapters = JSON.parse(await readFile("packages/companion/chapters.json","utf8"));
const manifest = await readFile(join(root,"SHA256_MANIFEST.txt"),"utf8");
if (chapters.length !== 8 || new Set(chapters.map(row=>row.id)).size !== 8)
  throw new Error("Companion chapter catalog must contain eight unique IDs");
for (const chapter of chapters) {
  const sourceName = chapter.id === "rb87-viii" ? `Chapter_VIII/${chapter.file}` : `Chapters/${chapter.file}`;
  if (!/^rb87-(i|ii|iii|iv|v|vi|vii|viii)$/.test(chapter.id) ||
      !/^Chapter_[1-8]_[A-Za-z0-9_]+\.pdf$/.test(chapter.file) ||
      !/^[a-f0-9]{64}$/.test(chapter.sha256) ||
      !manifest.includes(`${chapter.sha256}  ${sourceName}`))
    throw new Error(`Invalid Companion catalog entry ${chapter.id}`);
  const bytes = await readFile(join(root,"Chapters",chapter.file));
  if (createHash("sha256").update(bytes).digest("hex") !== chapter.sha256)
    throw new Error(`Companion source changed: ${chapter.id}`);
}
let checked = 0;
for (const line of manifest.split(/\r?\n/)) {
  const match = /^([a-f0-9]{64})  ((?:Chapters|Chapter_VIII)\/[A-Za-z0-9_.-]+)$/.exec(line);
  if (!match) continue;
  const bytes = await readFile(join(root,match[2]));
  if (createHash("sha256").update(bytes).digest("hex") !== match[1])
    throw new Error(`Companion manifest source changed: ${match[2]}`);
  checked++;
}
if (checked !== 23) throw new Error(`Expected 23 source manifest rows, found ${checked}`);
const csv = await readFile(join(root,"Chapter_VIII","trajectory_results.csv"));
const csvHash = "e711c5217e9c89146ce162cff5842e330bb0ae61894d07348e90d86429ac4f4d";
if (createHash("sha256").update(csv).digest("hex") !== csvHash) throw new Error("Chapter VIII CSV source changed");
const [header,...lines] = csv.toString("utf8").trim().split(/\r?\n/);
const keys = header.split(",");
const sourceRows = lines.map(line => Object.fromEntries(line.split(",").map((value,index) => [keys[index],Number(value)])));
const snapshot = JSON.parse(await readFile("packages/companion/monitoring-viii.json","utf8"));
if (sourceRows.length !== 15 || JSON.stringify(sourceRows) !== JSON.stringify(snapshot))
  throw new Error("Chapter VIII visual data differs from pinned CSV");
const preparation = await readFile(join(root,"Chapter_VIII","dissipative_preparation.csv"));
const preparationHash = "f42b578f78a5a38f36476f8f4e6e3c0d1b003ad6014beb8877ff44d854367cb9";
if (createHash("sha256").update(preparation).digest("hex") !== preparationHash)
  throw new Error("Chapter VIII preparation CSV source changed");
const [preparationHeader,...preparationLines] = preparation.toString("utf8").trim().split(/\r?\n/);
const preparationKeys = preparationHeader.split(",");
const preparationRows = preparationLines.map(line => Object.fromEntries(line.split(",").map((value,index) => [preparationKeys[index],Number(value)])));
const preparationSnapshot = JSON.parse(await readFile("packages/companion/preparation-viii.json","utf8"));
if (preparationRows.length !== 21 || JSON.stringify(preparationRows) !== JSON.stringify(preparationSnapshot) ||
    preparationRows.some(row => Math.abs(row.exact_target_fidelity - (1 - .75 * Math.exp(-row.kappa_t))) > 1e-12))
  throw new Error("Chapter VIII preparation visual data differs from pinned CSV or exact formula");
