import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  assertJob,
  isQuantumResult,
  type OscillatorEvolutionResult,
} from "../packages/contracts";
import jobSchema from "../packages/contracts/schemas/quantum-job.v1.json";
import resultSchema from "../packages/contracts/schemas/quantum-result.v1.json";
import baseline from "../packages/contracts/fixtures/protocols-d1-static.v1.json";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { EvolutionCoordinator } from "../apps/desktop/main/evolution";
import {
  oscillatorEvolutionJob,
  OSCILLATOR_DYNAMICS_DEFAULTS,
  checkOscillatorEvolutionData,
  consistentOscillatorEvolutionResult,
  oscillatorDensity,
  compareOscillatorMotion,
} from "../packages/models/oscillator-dynamics";

test("D1-005 keeps all static and legacy job/result branches and definitions unchanged", () => {
  const hash = (v: unknown) =>
    createHash("sha256").update(JSON.stringify(v)).digest("hex");
  for (const [key, s] of [
    ["job", jobSchema],
    ["result", resultSchema],
  ] as const) {
    assert.deepEqual(
      s.oneOf.slice(0, baseline[key].variants.length).map(hash),
      baseline[key].variants,
    );
    for (const [name, digest] of Object.entries(baseline[key].definitions))
      assert.equal(hash((s.definitions as any)[name]), digest);
  }
});
test("oscillator evolution preview, TS schema and Python reject invalid scope consistently", () => {
  const good = oscillatorEvolutionJob(
    "osc-motion",
    OSCILLATOR_DYNAMICS_DEFAULTS,
    "native",
  );
  assertJob(good);
  const drafts = [
    { points: "200" },
    { omega: "0" },
    { cutoff: "65" },
    { initial: "fock" as const, index: "7", cutoff: "8" },
    { alphaRe: "2", alphaIm: "2" },
    { stop: "101" },
    { omega: "20", stop: "10" },
    { samples: "1002" },
    { initial: "fock" as const, index: "1.5" },
    { alphaIm: "NaN" },
  ];
  for (const d of drafts)
    assert.throws(() =>
      oscillatorEvolutionJob(
        "bad",
        { ...OSCILLATOR_DYNAMICS_DEFAULTS, ...d },
        "native",
      ),
    );
  const invalid = [
    {
      ...good,
      model: {
        ...good.model,
        parameters: { ...good.model.parameters, points: 200 },
      },
    },
    { ...good, initialState: { type: "coherent", alphaRe: 2, alphaIm: 2 } },
    { ...good, solver: { ...good.solver, tStop: good.solver.tStart } },
    {
      ...good,
      solver: { ...good.solver, tStop: 100 },
      model: {
        ...good.model,
        parameters: { ...good.model.parameters, omega: 20 },
      },
    },
  ];
  for (const value of invalid) assert.throws(() => assertJob(value));
  const script =
    "import json,sys; from quantum_worker.contracts import validate; values=json.load(sys.stdin); validate('quantum-job',values[0]);\nfor v in values[1:]:\n try: validate('quantum-job',v)\n except Exception: continue\n raise AssertionError('invalid accepted')";
  const result = spawnSync(
    process.execPath,
    ["scripts/python.mjs", "-c", script],
    { input: JSON.stringify([good, ...invalid]), encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
});

test("supervised dynamics provides scientifically verified binary amplitudes, moving density and cancellation", async () => {
  const root = await mkdtemp(join(tmpdir(), "qlab-osc-motion-")),
    worker = new WorkerSupervisor(process.cwd());
  let cancelId = "",
    coordinator: EvolutionCoordinator;
  const progress: number[] = [];
  coordinator = new EvolutionCoordinator(worker, root, (p) => {
    progress.push(p.completed);
    if (p.jobId === cancelId && p.completed === 0)
      void coordinator.cancel(cancelId);
  });
  try {
    assert.equal((await worker.start()).state, "READY");
    assert.ok(
      worker.status.capabilities?.operations.includes("oscillator_evolve"),
    );
    const results: { result: OscillatorEvolutionResult; data: Float64Array }[] =
      [];
    for (const engine of ["native", "qutip"] as const) {
      const job = oscillatorEvolutionJob(
        `motion-${engine}`,
        OSCILLATOR_DYNAMICS_DEFAULTS,
        engine,
      );
      const result = await coordinator.run(job);
      assert.ok(isQuantumResult(result));
      assert.ok(consistentOscillatorEvolutionResult(job, result));
      const bytes = await coordinator.readData(job.jobId),
        data = checkOscillatorEvolutionData(result, bytes);
      results.push({ result, data });
      assert.ok(result.analysis.maxNormDrift < 1e-7);
      for (const row of [0, 50, 100, 200]) {
        const plot = oscillatorDensity(result, data, row),
          stride = result.data.columns.length,
          alpha = Math.cos(data[row * stride]);
        plot.q.forEach((q, k) =>
          assert.ok(
            Math.abs(
              plot.density[k] -
                Math.exp(-((q - Math.SQRT2 * alpha) ** 2)) / Math.sqrt(Math.PI),
            ) < 1e-7,
          ),
        );
        assert.ok(Math.abs(plot.probability - 1) < 1e-7);
      }
      assert.throws(() => oscillatorDensity(result, data, -1));
      for (const mutate of [
        (v: DataView) => v.setFloat64(0, 4, true),
        (v: DataView) => v.setFloat64(8, 99, true),
        (v: DataView) => v.setFloat64(80, NaN, true),
        (v: DataView) => v.setFloat64(88, 0.9, true),
      ]) {
        const forged = bytes.slice();
        mutate(
          new DataView(forged.buffer, forged.byteOffset, forged.byteLength),
        );
        assert.throws(() => checkOscillatorEvolutionData(result, forged));
      }
      assert.throws(() =>
        checkOscillatorEvolutionData(
          { ...result, analysis: { ...result.analysis, maxQError: 1 } },
          bytes,
        ),
      );
    }
    results[0].data.forEach((v, k) =>
      assert.ok(Math.abs(v - results[1].data[k]) < 1e-7, `sample ${k}`),
    );
    const comparison = compareOscillatorMotion(results[0].result, results[0].data, results[1].result, results[1].data);
    assert.ok(Object.values(comparison).every(v => v < 1e-7));
    const phased = results[0].data.slice();
    const stride = results[0].result.data.columns.length;
    for (let row = 0; row < results[0].result.data.rows; row++)
      for (let col = 10; col < stride; col += 2) {
        const k = row * stride + col, re = phased[k];
        phased[k] = -phased[k + 1]; phased[k + 1] = re;
      }
    assert.ok(compareOscillatorMotion(results[0].result, results[0].data, results[0].result, phased).infidelity < 1e-12);
    assert.throws(() => compareOscillatorMotion(results[0].result, results[0].data,
      {...results[1].result, solver: {...results[1].result.solver, tStop: 1}}, results[1].data));
    assert.ok(progress.includes(0) && progress.includes(201));
    cancelId = "motion-cancel";
    const cancelled = oscillatorEvolutionJob(
      cancelId,
      {
        ...OSCILLATOR_DYNAMICS_DEFAULTS,
        engine: "qutip",
        cutoff: "64",
        stop: "100",
        samples: "1001",
      },
      "qutip",
    );
    await assert.rejects(coordinator.run(cancelled), /cancelled/);
    assert.equal(coordinator.isRunning, false);
    await assert.rejects(coordinator.readData(cancelId), /No completed/);
    assert.deepEqual(await worker.request("health"), { status: "ok" });
  } finally {
    await worker.stop();
  }
});
