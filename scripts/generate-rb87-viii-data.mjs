import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const path = "docs/source-material/rb87-companion/Chapter_VIII/trajectory_results.csv";
const expected = "e711c5217e9c89146ce162cff5842e330bb0ae61894d07348e90d86429ac4f4d";
const bytes = await readFile(path);
if (createHash("sha256").update(bytes).digest("hex") !== expected) throw new Error("Chapter VIII CSV source changed");
const [header, ...lines] = bytes.toString("utf8").trim().split(/\r?\n/);
const keys = header.split(",");
const rows = lines.map(line => Object.fromEntries(line.split(",").map((value, index) => [keys[index], Number(value)])));
if (rows.length !== 15 || rows.some(row => Object.values(row).some(value => !Number.isFinite(value))))
  throw new Error("Invalid Chapter VIII table");
await writeFile("packages/companion/monitoring-viii.json", JSON.stringify(rows, null, 2) + "\n");
