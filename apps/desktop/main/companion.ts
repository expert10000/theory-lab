import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import catalog from "../../../packages/companion/chapters.json";
import type { CompanionChapter } from "../../../packages/contracts/companion";

/** The renderer may choose only a catalog ID. File names and hashes stay in main. */
export async function verifiedCompanionPath(root: string, id: string): Promise<string> {
  const chapter = catalog.find(row => row.id === id);
  if (!chapter) throw new Error("Unknown Companion chapter");
  const directory = await lstat(root);
  if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error("Companion chapter directory is unavailable");
  const path = join(root, chapter.file), info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size < 1024 || info.size > 8 * 1024 * 1024)
    throw new Error("Companion chapter file is unavailable");
  const bytes = await readFile(path);
  if (bytes.byteLength !== info.size || createHash("sha256").update(bytes).digest("hex") !== chapter.sha256)
    throw new Error("Companion chapter source hash changed");
  return path;
}

export async function listCompanionChapters(root: string): Promise<CompanionChapter[]> {
  return Promise.all(catalog.map(async row => {
    let available = false;
    try { await verifiedCompanionPath(root,row.id); available = true; } catch { /* Withhold changed or missing source. */ }
    return { id: row.id, title: row.title, subject: row.subject, pages: row.pages,
      sha256: row.sha256, available };
  }));
}
