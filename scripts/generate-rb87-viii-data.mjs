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

const preparationPath = "docs/source-material/rb87-companion/Chapter_VIII/dissipative_preparation.csv";
const preparationHash = "f42b578f78a5a38f36476f8f4e6e3c0d1b003ad6014beb8877ff44d854367cb9";
const preparationBytes = await readFile(preparationPath);
if (createHash("sha256").update(preparationBytes).digest("hex") !== preparationHash)
  throw new Error("Chapter VIII preparation CSV source changed");
const [preparationHeader, ...preparationLines] = preparationBytes.toString("utf8").trim().split(/\r?\n/);
const preparationKeys = preparationHeader.split(",");
const preparationRows = preparationLines.map(line => Object.fromEntries(line.split(",").map((value, index) => [preparationKeys[index], Number(value)])));
if (preparationRows.length !== 21 || preparationRows.some(row => Object.values(row).some(value => !Number.isFinite(value))))
  throw new Error("Invalid Chapter VIII preparation table");
await writeFile("packages/companion/preparation-viii.json", JSON.stringify(preparationRows, null, 2) + "\n");
