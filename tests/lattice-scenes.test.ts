import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  sceneExample,
  assertExampleRequest,
  type LatticeFamily,
} from "../packages/quantum-scene/examples";
import { assertScene, verifyScenePayload } from "../packages/quantum-scene";
import {
  readSceneBundle,
  writeSceneBundle,
} from "../packages/quantum-scene/bundle";
const digest = async (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
test("bounded lattice families preserve basis/cell identities and unit geometric bonds", async () => {
  for (const family of [
    "square",
    "honeycomb",
    "simple_cubic",
  ] as LatticeFamily[])
    for (const n of [1, 3, 8]) {
      const p = await sceneExample(
          { family, repeats: [n, n, family === "simple_cubic" ? n : 1] },
          digest,
        ),
        a = await verifyScenePayload(p, digest),
        l = p.scene.lattice!;
      assert.equal(p.scene.provenance.kind, "geometry-fixture");
      assert.equal(
        a.get(l.sites)!.length,
        n ** l.dimensions * l.basis.length * 3,
      );
      const bonds = a.get("lattice-bonds");
      if (bonds)
        for (let i = 0; i < bonds.length; i += 6)
          assert.ok(
            Math.abs(
              Math.hypot(
                ...[0, 1, 2].map((j) => bonds[i + j] - bonds[i + j + 3]),
              ) - 1,
            ) < 1e-12,
          );
      assert.ok(
        p.scene.objects.length < 16 &&
          p.scene.datasets.reduce((n, d) => n + d.bytes, 0) < 16 * 1024 * 1024,
      );
    }
  for (const bad of [
    { family: "atoms", repeats: [2, 2, 1] },
    { family: "square", repeats: [2, 2, 2] },
    { family: "square", repeats: [0, 2, 1] },
    { family: "square", repeats: [9, 2, 1] },
    { family: "square", repeats: [NaN, 2, 1] },
    { family: "square", repeats: [2, 2, 1], path: "../outside" },
  ])
    assert.throws(() => assertExampleRequest(bad));
});
test("portable lattice fixtures round-trip and reject substituted identities, rank and segment layouts", async () => {
  const root = await mkdtemp(join(tmpdir(), "qvis-lattice-"));
  try {
    for (const family of [
      "square",
      "honeycomb",
      "simple_cubic",
    ] as LatticeFamily[]) {
      const p = await sceneExample(
        { family, repeats: [2, 2, family === "simple_cubic" ? 2 : 1] },
        digest,
      );
      const fixture = JSON.parse(
        await readFile(
          `packages/quantum-scene/fixtures/lattice-${family}.json`,
          "utf8",
        ),
      );
      assert.deepEqual(p.scene, fixture.scene);
      assert.deepEqual(
        (await readSceneBundle(await writeSceneBundle(p, root))).scene,
        p.scene,
      );
    }
    const p = await sceneExample(
      { family: "square", repeats: [2, 2, 1] },
      digest,
    );
    const bad = structuredClone(p),
      d = bad.scene.datasets.find((d) => d.id === "site-cells")!,
      bytes = bad.artifacts[d.path];
    new DataView(bytes.buffer).setFloat64(0, 99, true);
    d.sha256 = await digest(bytes);
    await assert.rejects(verifyScenePayload(bad, digest), /site identity/);
    const wrong = structuredClone(p);
    wrong.scene.lattice!.translations[1] = [1, 0, 0];
    assert.throws(() => assertScene(wrong.scene), /Degenerate/);
    const odd = structuredClone(p.scene);
    const edges = odd.datasets.find((d) => d.id === "unit-cell-edges")!;
    edges.count--;
    edges.bytes -= 24;
    assert.throws(() => assertScene(odd), /endpoint pairs/);
    const displaced = structuredClone(p);
    const sites = displaced.scene.datasets.find(
      (d) => d.id === "lattice-sites",
    )!;
    new DataView(displaced.artifacts[sites.path].buffer).setFloat64(
      0,
      0.2,
      true,
    );
    sites.sha256 = await digest(displaced.artifacts[sites.path]);
    await assert.rejects(
      verifyScenePayload(displaced, digest),
      /position disagrees/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
