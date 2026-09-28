import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ORBITAL_DEFAULTS,
  orbitalJob,
  consistentOrbitalResult,
} from "../packages/models/orbital";
import {
  convergencePlan,
  convergenceRows,
} from "../packages/models/orbital-convergence";
import { isQuantumResult } from "../packages/contracts";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { EvolutionCoordinator } from "../apps/desktop/main/evolution";
import { RunStore } from "../apps/desktop/main/runs";

test("study plans hold box or spacing fixed and never silently clamp it", () => {
  const base = orbitalJob("anchor", ORBITAL_DEFAULTS);
  const grid = convergencePlan(base, "grid", "refine");
  assert.equal(grid.length, 4);
  assert.deepEqual(
    grid.map((j) => j.model.parameters.grid),
    [21, 31, 41, 49],
  );
  assert.ok(grid.every((j) => j.model.parameters.radius === 8));
  const box = convergencePlan(base, "box", "grow");
  assert.equal(box.length, 4);
  assert.ok(
    box.every(
      (j) =>
        Math.abs(
          (2 * j.model.parameters.radius) / (j.model.parameters.grid - 1) -
            16 / 30,
        ) < 1e-12,
    ),
  );
  assert.equal(
    convergencePlan(
      orbitalJob("small", { ...ORBITAL_DEFAULTS, radius: ".5" }),
      "box",
      "small",
    ).length,
    3,
  );
  assert.throws(
    () =>
      convergencePlan(
        orbitalJob("wide", { ...ORBITAL_DEFAULTS, radius: "120", grid: "21" }),
        "box",
        "wide",
      ),
    /two admissible/,
  );
});
test("real studies preserve normalization errors, separate variables and retain every saved case", async () => {
  const root = await mkdtemp(join(tmpdir(), "qvis-convergence-")),
    artifacts = join(root, "artifacts");
  const worker = new WorkerSupervisor(process.cwd()),
    coordinator = new EvolutionCoordinator(worker, artifacts, () => {}),
    store = new RunStore(join(root, "runs"), artifacts);
  try {
    await worker.start();
    for (const mode of ["grid", "box"] as const) {
      const base = orbitalJob("anchor", {
        ...ORBITAL_DEFAULTS,
        ...(mode === "box" ? { radius: "2", grid: "49" } : {}),
      });
      const results = [];
      for (const job of convergencePlan(base, mode, `study-${mode}`)) {
        const result = await coordinator.run(job);
        await store.record(job, result);
        results.push(result);
        assert.equal(result.analysis.radialNodes!.length, 0);
        assert.ok(consistentOrbitalResult(job, result));
        const legacy = structuredClone(result);
        delete legacy.analysis.radialNodes;
        delete legacy.analysis.cubeProbabilityBounds;
        assert.ok(
          isQuantumResult(legacy) && consistentOrbitalResult(job, legacy),
          "older orbital results remain valid",
        );
      }
      const rows = convergenceRows(base, mode, results);
      assert.equal(rows.length, 4);
      assert.equal(rows[0].deltaPrevious, null);
      if (mode === "grid") {
        assert.ok(
          Math.abs(rows.at(-1)!.signedUnityError) <
            Math.abs(rows[0].signedUnityError),
        );
        assert.ok(
          rows[0].outsideBounds! > 0,
          "coarse 1s quadrature exceeds geometric reference interval",
        );
      } else {
        assert.ok(
          rows.every(
            (row, i) => i === 0 || row.integral > rows[i - 1].integral,
          ),
        );
        assert.ok(
          rows.every((r) => Math.abs(r.spacing - rows[0].spacing) < 1e-12),
        );
      }
      const wrong = structuredClone(results);
      wrong[1].model.parameters.Z = 2;
      assert.throws(
        () => convergenceRows(base, mode, wrong),
        /identical orbital physics/,
      );
      const version = structuredClone(results);
      version[1].engine.version = "changed";
      assert.throws(
        () => convergenceRows(base, mode, version),
        /engine changed/,
      );
      const changed = structuredClone(results);
      changed[1].model.parameters.radius += 0.1;
      assert.throws(
        () => convergenceRows(base, mode, changed),
        /held-fixed variable/,
      );
    }
    assert.equal((await store.list()).length, 8);
    const nodeJob = orbitalJob("nodes-2s", {
      ...ORBITAL_DEFAULTS,
      n: "2",
      radius: "32",
    });
    const nodeResult = await coordinator.run(nodeJob);
    assert.deepEqual(nodeResult.analysis.radialNodes, [2]);
    assert.ok(
      !consistentOrbitalResult(nodeJob, {
        ...nodeResult,
        analysis: { ...nodeResult.analysis, radialNodes: [3] },
      }),
    );
    const [low, high] = nodeResult.analysis.cubeProbabilityBounds!;
    assert.ok(
      !consistentOrbitalResult(nodeJob, {
        ...nodeResult,
        analysis: {
          ...nodeResult.analysis,
          cubeProbabilityBounds: [high, low - 0.1],
        },
      }),
    );
    for (const patch of [
      { radialNodes: [0] },
      { radialNodes: [1, 2, 3] },
      { cubeProbabilityBounds: [-1, 1] },
      { cubeProbabilityBounds: [1] },
    ])
      assert.ok(
        !isQuantumResult({
          ...nodeResult,
          analysis: { ...nodeResult.analysis, ...patch },
        }),
      );
    await store.record(nodeJob, nodeResult);
    const svgPath = join(root, "nodes.svg");
    await store.export(nodeResult.runId, "svg", svgPath);
    assert.match(await readFile(svgPath, "utf8"), /stroke-dasharray="4 4"/);
    assert.match(await readFile(svgPath, "utf8"), />N1<\/text>/);
  } finally {
    await worker.stop();
    await rm(root, { recursive: true, force: true });
  }
});
