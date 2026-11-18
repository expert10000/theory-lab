import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "docs/source-material/rb87-companion";
const chapters = JSON.parse(await readFile("packages/companion/chapters.json","utf8"));
const manifest = await readFile(join(root,"SHA256_MANIFEST.txt"),"utf8");
if (chapters.length !== 7 || new Set(chapters.map(row=>row.id)).size !== 7)
  throw new Error("Companion chapter catalog must contain seven unique IDs");
for (const chapter of chapters) {
  if (!/^rb87-(i|ii|iii|iv|v|vi|vii)$/.test(chapter.id) ||
      !/^Chapter_[1-7]_[A-Za-z0-9_]+\.pdf$/.test(chapter.file) ||
      !/^[a-f0-9]{64}$/.test(chapter.sha256) ||
      !manifest.includes(`${chapter.sha256}  ${chapter.file}`))
    throw new Error(`Invalid Companion catalog entry ${chapter.id}`);
  const bytes = await readFile(join(root,"Chapters",chapter.file));
  if (createHash("sha256").update(bytes).digest("hex") !== chapter.sha256)
    throw new Error(`Companion source changed: ${chapter.id}`);
}
