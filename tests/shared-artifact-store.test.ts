import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SharedArtifactStore } from "../apps/desktop/main/shared-artifact-store";

test("Lab run artifacts use the shared content-addressed pin and dry-run GC format", async () => {
  const root = await mkdtemp(join(tmpdir(), "qi18-lab-store-"));
  try {
    const store = new SharedArtifactStore(root);
    const bytes = new TextEncoder().encode("saved-run-data");
    const hash = await store.put(bytes);
    await store.pin("run-verified", [hash]);
    assert.deepEqual((await store.collect()).hashes, []);
    assert.deepEqual(await readFile(join(root, "objects", "sha256", hash.slice(0, 2), hash)), Buffer.from(bytes));
    await store.unpin("run-verified");
    assert.deepEqual((await store.collect()).hashes, [hash]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
