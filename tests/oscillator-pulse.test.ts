import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import jobSchema from "../packages/contracts/schemas/quantum-job.v1.json";
import resultSchema from "../packages/contracts/schemas/quantum-result.v1.json";
import baseline from "../packages/contracts/fixtures/protocols-d1-drive.v1.json";
import { assertJob } from "../packages/contracts";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { EvolutionCoordinator } from "../apps/desktop/main/evolution";
import {
  PULSED_OSCILLATOR_DEFAULTS,
  pulsedOscillatorJob,
  checkPulsedOscillatorData,
  pulsedReference,
  comparePulseConvergence,
} from "../packages/models/oscillator-pulse";
import {
  oscillatorDensity,
  compareOscillatorMotion,
} from "../packages/models/oscillator-dynamics";

test("D1-011 preserves every delivered protocol branch/definition", () => {
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
test("pulse preview and TS/Python reject unsafe, unresolved and out-of-budget envelopes", () => {
  const good = pulsedOscillatorJob(
    "pulse-valid",
    PULSED_OSCILLATOR_DEFAULTS,
    "native",
  );
  assertJob(good);
  for (const change of [
    { pulseWidth: ".01" },
    { pulseCenter: "11" },
    { maxStep: ".1" },
    { pulseWidth: ".05", maxStep: ".02" },
    { epsilonRe: ".5", epsilonIm: ".5" },
    { maxStep: ".0001" },
    { pulseWidth: "5", alphaRe: "2", epsilonRe: ".5" },
    { pulseCenter: "" },
  ])
    assert.throws(() =>
      pulsedOscillatorJob(
        "invalid",
        { ...PULSED_OSCILLATOR_DEFAULTS, ...change },
        "native",
      ),
    );
  const bad = {
    ...good,
    model: {
      ...good.model,
      parameters: { ...good.model.parameters, pulseWidth: 0.05 },
    },
  };
  assert.throws(() => assertJob(bad));
  const r = spawnSync(
    process.execPath,
    [
      "scripts/python.mjs",
      "-c",
      "import json,sys;from quantum_worker.contracts import validate;v=json.load(sys.stdin);validate('quantum-job',v[0]);\ntry: validate('quantum-job',v[1])\nexcept Exception: pass\nelse: raise AssertionError('unresolved pulse accepted')",
    ],
    { input: JSON.stringify([good, bad]), encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr);
});
test("supervised pulse verifies coefficients, quadrature, power, density, convergence and cancellation", async () => {
  const root = await mkdtemp(join(tmpdir(), "qlab-pulse-")),
    worker = new WorkerSupervisor(process.cwd());
  let cancel = "";
  const coordinator = new EvolutionCoordinator(worker, root, (p) => {
    if (p.jobId === cancel && p.completed === 0)
      void coordinator.cancel(cancel);
  });
  try {
    await worker.start();
    assert.ok(
      worker.status.capabilities?.operations.includes("oscillator_pulse"),
    );
    const outputs = [];
    for (const engine of ["native", "qutip"] as const) {
      const job = pulsedOscillatorJob(
          `pulse-${engine}`,
          PULSED_OSCILLATOR_DEFAULTS,
          engine,
        ),
        result = await coordinator.run(job),
        bytes = await coordinator.readData(job.jobId),
        data = checkPulsedOscillatorData(result, bytes);
      outputs.push({ result, data });
      assert.ok(result.analysis.maxNumberError < 1e-7);
      assert.ok(result.analysis.maxNormDrift < 1e-7);
      const row = 100,
        ref = pulsedReference(result.model.parameters, result.initialState, 5);
      assert.ok(
        Math.abs(data[row * result.data.columns.length + 5] - ref.number) <
          1e-7,
      );
      const field = oscillatorDensity(result, data, row);
      field.q.forEach((q, k) =>
        assert.ok(
          Math.abs(
            field.density[k] -
              Math.exp(-((q - ref.q) ** 2)) / Math.sqrt(Math.PI),
          ) < 1e-7,
        ),
      );
      const corrupt = Buffer.from(bytes);
      corrupt.writeDoubleLE(corrupt.readDoubleLE(13 * 8) + 0.1, 13 * 8);
      assert.throws(
        () => checkPulsedOscillatorData(result, corrupt),
        /amplitudes/,
      );
      assert.throws(
        () =>
          checkPulsedOscillatorData(
            { ...result, analysis: { ...result.analysis, endEnvelope: 0.2 } },
            bytes,
          ),
        /metadata/,
      );
    }
    assert.ok(
      compareOscillatorMotion(
        outputs[0].result,
        outputs[0].data,
        outputs[1].result,
        outputs[1].data,
      ).q < 1e-7,
    );
    const highJob = pulsedOscillatorJob(
        "pulse-refine",
        { ...PULSED_OSCILLATOR_DEFAULTS, cutoff: "32" },
        "native",
      ),
      highResult = await coordinator.run(highJob),
      high = checkPulsedOscillatorData(
        highResult,
        await coordinator.readData(highJob.jobId),
      );
    const comparison = comparePulseConvergence(
      outputs[0].result,
      outputs[0].data,
      highResult,
      high,
    );
    assert.ok(comparison.q < 1e-7);
    assert.ok(comparison.infidelity < 1e-7);
    const narrow = pulsedOscillatorJob(
        "pulse-narrow",
        {
          ...PULSED_OSCILLATOR_DEFAULTS,
          pulseWidth: ".05",
          pulseCenter: "4.73",
          maxStep: ".005",
          samples: "3",
          epsilonRe: ".5",
          epsilonIm: "0",
        },
        "native",
      ),
      nr = await coordinator.run(narrow);
    checkPulsedOscillatorData(nr, await coordinator.readData(narrow.jobId));
    cancel = "pulse-cancel";
    await assert.rejects(
      coordinator.run(
        pulsedOscillatorJob(cancel, PULSED_OSCILLATOR_DEFAULTS, "qutip"),
      ),
      /cancelled/,
    );
    assert.equal(
      (await readdir(root)).some((n) => n.startsWith(cancel)),
      false,
    );
    await worker.request("health");
    assert.equal(worker.status.state, "READY");
  } finally {
    await worker.stop();
  }
});
