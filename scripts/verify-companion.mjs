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
