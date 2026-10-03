import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import jobSchema from "../packages/contracts/schemas/quantum-job.v1.json";
import resultSchema from "../packages/contracts/schemas/quantum-result.v1.json";
import baseline from "../packages/contracts/fixtures/protocols-d1-free.v1.json";
import { assertJob } from "../packages/contracts";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { EvolutionCoordinator } from "../apps/desktop/main/evolution";
import { RunStore } from "../apps/desktop/main/runs";
import {
  DRIVEN_OSCILLATOR_DEFAULTS,
  drivenOscillatorJob,
  checkDrivenOscillatorData,
  drivenReference,
} from "../packages/models/oscillator-drive";
import {
  oscillatorDensity,
  compareOscillatorMotion,
} from "../packages/models/oscillator-dynamics";

test("D1-008 appends driven contracts without changing any delivered free/static or legacy branch", () => {
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
test("driven jobs use strict finite scope consistently in preview, TS and Python", () => {
  const good = drivenOscillatorJob(
    "drive-valid",
    DRIVEN_OSCILLATOR_DEFAULTS,
    "native",
  );
  assertJob(good);
  for (const d of [
    { omega: ".01" },
    { epsilonRe: ".5", epsilonIm: ".5" },
    { driveFrequency: "-1" },
    { stop: "21" },
    { alphaRe: "2", epsilonRe: ".5" },
    { points: "200" },
    { epsilonRe: "" },
  ])
    assert.throws(() =>
      drivenOscillatorJob(
        "invalid",
        { ...DRIVEN_OSCILLATOR_DEFAULTS, ...d },
        "native",
      ),
    );
  const bad = {
    ...good,
    model: {
      ...good.model,
      parameters: { ...good.model.parameters, epsilonRe: 0.5, epsilonIm: 0.5 },
    },
  };
  assert.throws(() => assertJob(bad));
  const script =
    "import json,sys;from quantum_worker.contracts import validate;v=json.load(sys.stdin);validate('quantum-job',v[0]);\ntry: validate('quantum-job',v[1])\nexcept Exception: pass\nelse: raise AssertionError('invalid drive accepted')";
  const r = spawnSync(process.execPath, ["scripts/python.mjs", "-c", script], {
    input: JSON.stringify([good, bad]),
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
});
test("real supervised drive verifies phases, displacement, density, energy/power and cancellation", async () => {
  const root = await mkdtemp(join(tmpdir(), "qlab-drive-")),
    worker = new WorkerSupervisor(process.cwd());
  let cancel = "";
  const coordinator = new EvolutionCoordinator(worker, root, (p) => {
    if (p.jobId === cancel && p.completed === 0)
      void coordinator.cancel(cancel);
  });
  try {
    await worker.start();
    assert.ok(
      worker.status.capabilities?.operations.includes("oscillator_drive"),
    );
    const outputs = [];
    for (const engine of ["native", "qutip"] as const) {
      const job = drivenOscillatorJob(
          `drive-${engine}`,
          DRIVEN_OSCILLATOR_DEFAULTS,
          engine,
        ),
        result = await coordinator.run(job),
        bytes = await coordinator.readData(job.jobId),
        data = checkDrivenOscillatorData(result, bytes);
      outputs.push({ result, data });
      assert.ok(result.analysis.maxNormDrift < 1e-7);
      assert.ok(result.analysis.maxNumberError < 1e-7);
      const row = 50,
        stride = result.data.columns.length,
        ref = drivenReference(
          result.model.parameters,
          result.initialState,
          data[row * stride] - result.solver.tStart,
        ),
        field = oscillatorDensity(result, data, row);
      field.q.forEach((q, k) =>
        assert.ok(
          Math.abs(
            field.density[k] -
              Math.exp(-((q - ref.q) ** 2)) / Math.sqrt(Math.PI),
          ) < 1e-7,
        ),
      );
      for (const col of [1, 8, 10, 11, 12, 13]) {
        const bad = bytes.slice();
        new DataView(bad.buffer).setFloat64(col * 8, 99, true);
        assert.throws(() => checkDrivenOscillatorData(result, bad));
      }
      const phased = bytes.slice(),
        v = new DataView(phased.buffer);
      for (let k = 13; k < stride; k++)
        v.setFloat64(k * 8, -v.getFloat64(k * 8, true), true);
      assert.throws(
        () => checkDrivenOscillatorData(result, phased),
        /amplitudes/,
      );
      assert.throws(
        () =>
          checkDrivenOscillatorData(
            { ...result, analysis: { ...result.analysis, maxNumberError: 1 } },
            bytes,
          ),
        /diagnostics/,
      );
    }
    assert.ok(
      Object.values(
        compareOscillatorMotion(
          outputs[0].result,
          outputs[0].data,
          outputs[1].result,
          outputs[1].data,
        ),
      ).every((v) => v < 1e-7),
    );
    cancel = "drive-cancel";
    await assert.rejects(
      coordinator.run(
        drivenOscillatorJob(cancel, DRIVEN_OSCILLATOR_DEFAULTS, "qutip"),
      ),
      /cancelled/,
    );
    await assert.rejects(coordinator.readData(cancel), /No completed/);
    const store = new RunStore(join(root, "runs"), root);
    for (const output of outputs) {
      const input = drivenOscillatorJob(
        output.result.jobId,
        DRIVEN_OSCILLATOR_DEFAULTS,
        output.result.engine.name,
      );
      await assert.rejects(
        store.record(
          { ...input, solver: { ...input.solver, tStop: 1 } },
          output.result,
        ),
        /inconsistent driven/,
      );
      await store.record(input, output.result);
      assert.deepEqual((await store.oscillatorFamily(output.result.runId)).result,output.result);
    }
    const restarted = new RunStore(
        join(root, "runs"),
        join(root, "absent-worker-artifacts"),
      ),
      saved = outputs[0].result;
    assert.equal(
      (await restarted.list()).filter((r) => r.operation === "oscillator_drive")
        .length,
      2,
    );
    for (const format of ["csv", "svg", "manifest"] as const)
      await restarted.export(
        saved.runId,
        format,
        join(root, `drive.${format}`),
      );
    const csv = await readFile(join(root, "drive.csv"), "utf8");
    assert.ok(csv.startsWith(saved.data.columns.join(",")));
    assert.equal(csv.trim().split("\n").length, saved.data.rows + 1);
    const svg = await readFile(join(root, "drive.svg"), "utf8");
    assert.match(svg, /q_mean/);
    assert.match(svg, /p_mean/);
    assert.doesNotMatch(svg, /q_variance/);
    const exported = JSON.parse(
      await readFile(join(root, "drive.manifest"), "utf8"),
    );
    assert.deepEqual(exported.result.analysis, saved.analysis);
    assert.equal(exported.manifest.artifactSha256, saved.data.sha256);
    assert.equal(exported.job.model.parameters.epsilonRe, 0.2);
    await assert.rejects(
      restarted.scene(saved.runId),
      /no QVIS-002 scene adapter/,
    );
    const dir = join(root, "runs", saved.runId),
      corrupt = await readFile(join(dir, "data.f64"));
    corrupt.writeDoubleLE(99, 11 * 8);
    await writeFile(join(dir, "data.f64"), corrupt);
    await assert.rejects(
      restarted.export(saved.runId, "csv", join(root, "invalid.csv")),
      /integrity/,
    );
    const sha = createHash("sha256").update(corrupt).digest("hex"),
      forged = { ...saved, data: { ...saved.data, sha256: sha } },
      resultText = JSON.stringify(forged, null, 2) + "\n",
      manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    manifest.artifactSha256 = sha;
    manifest.hashes.result = createHash("sha256")
      .update(resultText)
      .digest("hex");
    await writeFile(join(dir, "result.json"), resultText);
    await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest));
    await assert.rejects(
      restarted.export(saved.runId, "csv", join(root, "forged.csv")),
      /driven oscillator/,
    );
    await writeFile(join(root, saved.data.path), corrupt);
    await assert.rejects(
      store.record(
        drivenOscillatorJob(saved.jobId, DRIVEN_OSCILLATOR_DEFAULTS, "native"),
        { ...forged, runId: "run-invalid-drive" },
      ),
      /driven oscillator/,
    );
    assert.ok(
      !(await readdir(join(root, "runs"))).includes("run-invalid-drive"),
    );
    const edge = drivenOscillatorJob(
        "drive-edge",
        {
          ...DRIVEN_OSCILLATOR_DEFAULTS,
          omega: ".1",
          driveFrequency: "5",
          epsilonRe: ".01",
          cutoff: "64",
          stop: "20",
          samples: "3",
        },
        "native",
      ),
      edgeResult = await coordinator.run(edge);
    checkDrivenOscillatorData(
      edgeResult,
      await coordinator.readData(edge.jobId),
    );
    assert.deepEqual(await worker.request("health"), { status: "ok" });
  } finally {
    await worker.stop();
  }
});
