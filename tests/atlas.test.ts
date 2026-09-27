import assert from "node:assert/strict";
import test from "node:test";
import { ATLAS_ENTRIES, ATLAS_PRESETS, ATLAS_REVISION, atlasEntry, atlasUrl } from "../packages/atlas";

test("pinned Atlas snapshot is complete, connected and reference-only", () => {
  assert.equal(ATLAS_REVISION, "61791aff00c0f35a82ec6f2271deded5cc5e99d6");
  assert.equal(ATLAS_ENTRIES.length, 48);
  const ids = new Set(ATLAS_ENTRIES.map(entry => entry.id));
  assert.equal(ids.size, 48);
  for (const entry of ATLAS_ENTRIES) {
    assert.equal(entry.computation.adapter, null);
    assert.equal(entry.computation.runnable, null);
    assert.ok(entry.formula.latex && entry.basis.description);
    assert.match(atlasUrl(entry), /^https:\/\/github.com\/expert10000\/theory\/blob\/61791aff/);
    for (const relation of entry.relations) assert.ok(ids.has(relation.target), `${entry.id} → ${relation.target}`);
    if (entry.computation.default_preset) assert.equal(ATLAS_PRESETS[entry.computation.default_preset as keyof typeof ATLAS_PRESETS]?.model, entry.id);
  }
  assert.ok(atlasEntry("ssh"));
  assert.ok(atlasEntry("qwz"));
});
