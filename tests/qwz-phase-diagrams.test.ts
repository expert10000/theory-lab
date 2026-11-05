import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { QwzPhaseDiagramStore } from "../apps/desktop/main/qwz-phase-diagrams";
import type { RunStore } from "../apps/desktop/main/runs";

test("QWZ phase cells retain exact run hashes and reopen only unchanged source scenes", async () => {
  const root = await mkdtemp(join(tmpdir(), "qi20-phase-"));
  const hashes = ["a".repeat(64), "b".repeat(64)];
  let changed = false;
  const result = (index: number) => ({ operation: "topology", model: { type: "qwz",
    parameters: { mass: index ? 1 : -1, grid: 21 } }, analysis: { kind: "qwz",
    bulkGap: 2, meshResolved: true, gapClosed: false, chern: index ? 1 : -1 } });
  const runs = {
    async list() { return [0, 1].map(index => ({ runId: `run-${index}`, operation: "topology", model: "qwz" })); },
    async inspect(runId: string) { return { hashes: { result: hashes[Number(runId.slice(-1))] } }; },
    async verified(runId: string) { return { result: result(Number(runId.slice(-1))) }; },
    async verifiedSource(runId: string, hash: string) {
      const index = Number(runId.slice(-1));
      if (changed || hashes[index] !== hash) throw new Error("Source result hash changed");
      return { result: result(index) };
    },
    async scene(runId: string, view: string) { return { scene: { id: `${view}-${runId}`,
      provenance: { resultSha256: hashes[Number(runId.slice(-1))] } } }; },
  } as unknown as RunStore;
  try {
    const store = new QwzPhaseDiagramStore(root, runs);
    const map = await store.build();
    assert.deepEqual(map.axes, { mass: [-1, 1], grid: [21] });
    assert.deepEqual(map.points.map(point => point.chern), [-1, 1]);
    assert.equal(map.points[0].scenes.bands, "bands-run-0");
    assert.deepEqual(await store.get(map.studyId), map);
    assert.equal((await store.list())[0].points, 2);
    changed = true;
    await assert.rejects(store.get(map.studyId), /hash changed/);
    assert.deepEqual(await store.list(), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});
