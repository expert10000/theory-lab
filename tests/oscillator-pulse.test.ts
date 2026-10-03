import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import jobSchema from "../packages/contracts/schemas/quantum-job.v1.json";
import resultSchema from "../packages/contracts/schemas/quantum-result.v1.json";
import baseline from "../packages/contracts/fixtures/protocols-d1-drive.v1.json";
import { assertJob, type PulsedOscillatorResult } from "../packages/contracts";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { EvolutionCoordinator } from "../apps/desktop/main/evolution";
import { RunStore } from "../apps/desktop/main/runs";
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
    const outputs: { result: PulsedOscillatorResult; data: Float64Array }[] =
      [];
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
      assert.equal(
        result.integration.method,
        engine === "qutip" ? "qutip-vern9" : "scipy-dop853",
      );
      assert.ok(
        result.integration.evaluations > 0 &&
          result.integration.evaluations <= 1000000,
      );
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
    const complex = pulsedOscillatorJob(
      "pulse-complex-edge",
      {
        ...PULSED_OSCILLATOR_DEFAULTS,
        initial: "fock",
        index: "2",
        omega: ".1",
        driveFrequency: "5",
        epsilonRe: ".3",
        epsilonIm: ".4",
        cutoff: "64",
        stop: "20",
        pulseWidth: ".05",
        pulseCenter: "9.731",
        maxStep: ".005",
        samples: "3",
      },
      "qutip",
    );
    const cr = await coordinator.run(complex);
    checkPulsedOscillatorData(cr, await coordinator.readData(complex.jobId));
    assert.throws(
      () =>
        comparePulseConvergence(
          outputs[0].result,
          outputs[0].data,
          {
            ...highResult,
            model: {
              ...highResult.model,
              parameters: { ...highResult.model.parameters, pulseCenter: 4 },
            },
          },
          high,
        ),
      /same pulse/,
    );
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

test("pulse runs export after restart and reject corruption even with recomputed hashes", async () => {
  const root = await mkdtemp(join(tmpdir(), "qlab-pulse-store-")),
    artifacts = join(root, "artifacts"),
    worker = new WorkerSupervisor(process.cwd()),
    coordinator = new EvolutionCoordinator(worker, artifacts, () => {}),
    store = new RunStore(join(root, "runs"), artifacts);
  try {
    await worker.start();
    const job = pulsedOscillatorJob(
        "pulse-durable",
        {
          ...PULSED_OSCILLATOR_DEFAULTS,
          epsilonRe: ".15",
          epsilonIm: ".2",
          pulseCenter: "4",
          pulseWidth: "1.25",
          maxStep: ".01",
        },
        "native",
      ),
      result = await coordinator.run(job);
    await store.record(job, result);
    assert.deepEqual((await store.oscillatorFamily(result.runId)).result,result);
    await assert.rejects(
      store.record(
        { ...job, solver: { ...job.solver, maxStep: 0.005 } },
        { ...result, runId: "run-inconsistent-pulse" },
      ),
      /inconsistent/,
    );
    const restarted = new RunStore(
      join(root, "runs"),
      join(root, "no-live-artifacts"),
    );
    assert.equal((await restarted.list())[0].operation, "oscillator_pulse");
    for (const format of ["csv", "svg", "manifest"] as const)
      await restarted.export(
        result.runId,
        format,
        join(root, `pulse.${format}`),
      );
    const csv = await readFile(join(root, "pulse.csv"), "utf8");
    assert.ok(csv.startsWith(result.data.columns.join(",")));
    assert.equal(csv.trim().split("\n").length, result.data.rows + 1);
    const svg = await readFile(join(root, "pulse.svg"), "utf8");
    assert.match(svg, /q_mean/);
    assert.match(svg, /p_mean/);
    assert.doesNotMatch(svg, /q_variance/);
    const exported = JSON.parse(
      await readFile(join(root, "pulse.manifest"), "utf8"),
    );
    assert.deepEqual(exported.job, job);
    assert.deepEqual(exported.result.analysis, result.analysis);
    assert.deepEqual(exported.result.integration, result.integration);
    assert.equal(exported.manifest.artifactSha256, result.data.sha256);
    await assert.rejects(
      restarted.scene(result.runId),
      /no QVIS-002 scene adapter/,
    );
    const dir = join(root, "runs", result.runId),
      corrupt = await readFile(join(dir, "data.f64"));
    // Preserve every phase-independent readout while forging the stipulated
    // absolute coefficient phase. Byte hashes alone would accept this.
    const stride = result.data.columns.length;
    for (let row = 0; row < result.data.rows; row++)
      for (let col = 13; col < stride; col++) {
        const offset = (row * stride + col) * 8;
        corrupt.writeDoubleLE(-corrupt.readDoubleLE(offset), offset);
      }
    await writeFile(join(dir, "data.f64"), corrupt);
    await assert.rejects(restarted.verified(result.runId),/integrity/);
    await assert.rejects(restarted.oscillatorFamily(result.runId),/integrity/);
    await assert.rejects(
      restarted.export(result.runId, "csv", join(root, "corrupt.csv")),
      /integrity/,
    );
    const sha = (v: Uint8Array | string) =>
        createHash("sha256").update(v).digest("hex"),
      forged = { ...result, data: { ...result.data, sha256: sha(corrupt) } },
      text = JSON.stringify(forged, null, 2) + "\n",
      manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    manifest.artifactSha256 = forged.data.sha256;
    manifest.hashes.result = sha(text);
    await writeFile(join(dir, "result.json"), text);
    await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest));
    await assert.rejects(restarted.verified(result.runId),/amplitudes/);
    await assert.rejects(restarted.oscillatorFamily(result.runId),/amplitudes/);
    for (const format of ["csv", "svg", "manifest"] as const)
      await assert.rejects(
        restarted.export(result.runId, format, join(root, `forged.${format}`)),
        /amplitudes/,
      );
    await writeFile(join(artifacts, result.data.path), corrupt);
    await assert.rejects(
      store.record(job, { ...forged, runId: "run-forged-pulse" }),
      /amplitudes/,
    );
    assert.ok(
      !(await readdir(join(root, "runs"))).includes("run-forged-pulse"),
    );
    assert.ok(
      !(await readdir(join(root, "runs"))).includes("run-inconsistent-pulse"),
    );
  } finally {
    await worker.stop();
  }
});
