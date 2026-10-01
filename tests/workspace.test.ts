import { test } from "node:test";
import { PULSED_OSCILLATOR_DEFAULTS } from "../packages/models/oscillator-pulse";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { EVOLUTION_COLUMNS, isWorkspaceSnapshot, type WorkspaceSnapshot } from "../packages/contracts";
import { RunStore } from "../apps/desktop/main/runs";
import { defaultsFor, evolutionJob, spectrumJob } from "../packages/models";
import type { CircuitJob, CircuitResult, ManyBodyJob, ManyBodyResult } from "../packages/contracts";
import { MANY_BODY_DEFAULTS, manyBodyJob } from "../packages/models/many_body";
import { CIRCUIT_DEFAULTS, circuitJob } from "../packages/models/circuit";
import { TOPOLOGY_DEFAULTS } from "../packages/models/topology";
import { ORBITAL_DEFAULTS } from "../packages/models/orbital";
import { OSCILLATOR_DEFAULTS } from "../packages/models/oscillator";
import { OSCILLATOR_DYNAMICS_DEFAULTS } from "../packages/models/oscillator-dynamics";
import { DRIVEN_OSCILLATOR_DEFAULTS } from "../packages/models/oscillator-drive";
test("Gaussian pulse workspace draft is optional and rejects executable/unsupported fields",()=>{
  assert.ok(isWorkspaceSnapshot(workspace),"legacy workspace still valid");
  const extended={...workspace,tab:"oscillator",oscillatorPulse:PULSED_OSCILLATOR_DEFAULTS,oscillatorMode:"pulse"};
  assert.ok(isWorkspaceSnapshot(extended));
  for(const d of [{pulseWidth:"x".repeat(101)},{source:"t=>code"},{envelope:"custom"},{initial:"arbitrary"},{engine:"dynamiqs"}])assert.equal(isWorkspaceSnapshot({...extended,oscillatorPulse:{...PULSED_OSCILLATOR_DEFAULTS,...d}}),false);
});

const workspace: WorkspaceSnapshot = {
  schema: "quantum-workspace/v1", savedAt: "2026-09-27T00:00:00Z", tab: "sweep", selectedPresetId: null,
  spectrum: { parameters: { delta: "1", omega: "0.8" }, engine: "compare" },
  dynamics: { modelId: "landau_zener", parameters: { sweepRate: ".5", gap: ".5", bias: "0" },
    start: "-10", stop: "10", samples: "401", basis: 0, engine: "qutip" },
  cavity: { modelId: "jaynes_cummings", parameters: { qubitFrequency: "1", cavityFrequency: "1", coupling: ".35", cutoff: "6" },
    qubit: "excited", photons: "0", start: "0", stop: "20", samples: "401", engine: "native" },
  open: { parameters: { relaxation: ".3", cutoff: "4" }, qubit: "plus_x", photons: "0", start: "0", stop: "20", samples: "401", engine: "qutip" },
  sweep: { modelId: "driven_two_level", parameters: { delta: "1", amplitude: ".8", frequency: "1", phase: "0" },
    x: { parameter: "amplitude", start: 0, stop: 2, points: 5 },
    y: { parameter: "frequency", start: .6, stop: 1.4, points: 4 }, twoD: true,
    start: "0", stop: "20", initialIndex: 0, engine: "native" },
};
test("workspace v1 accepts all lab drafts and rejects unknown or unsafe fields", () => {
  assert.ok(isWorkspaceSnapshot(workspace));
  assert.ok(isWorkspaceSnapshot({ ...workspace, tab: "scenes" }));
  assert.equal(isWorkspaceSnapshot({ ...workspace, schema: "quantum-workspace/v2" }), false);
  assert.equal(isWorkspaceSnapshot({ ...workspace, extra: true }), false);
  assert.equal(isWorkspaceSnapshot({ ...workspace, sweep: { ...workspace.sweep, x: { ...workspace.sweep.x, points: 20000 } } }), false);
  assert.equal(isWorkspaceSnapshot({ ...workspace, spectrum: { ...workspace.spectrum, parameters: { delta: "x".repeat(200) } } }), false);
});

test("two-level energy-study draft is additive and does not relabel the old dynamics sweep",()=>{
  assert.ok(isWorkspaceSnapshot(workspace));
  const draft={omega:"0.8",start:"-2",stop:"2",points:"21",engine:"native"};
  assert.ok(isWorkspaceSnapshot({...workspace,sweepView:"two_level",spectrumStudy:draft}));
  assert.equal(isWorkspaceSnapshot({...workspace,sweepView:"unknown",spectrumStudy:draft}),false);
  assert.equal(isWorkspaceSnapshot({...workspace,spectrumStudy:{...draft,code:"eval()"}}),false);
  assert.equal(isWorkspaceSnapshot({...workspace,spectrumStudy:{...draft,points:"1".repeat(101)}}),false);
});

test("many-body job bounds and additive workspace v1 compatibility", () => {
  const job = manyBodyJob("ising-test", MANY_BODY_DEFAULTS, "open", "native");
  assert.deepEqual(job.model.parameters, { sites: 4, interaction: 1, transverse: 0.8, longitudinal: 0.15, boundary: "open" });
  assert.throws(() => manyBodyJob("bad", { ...MANY_BODY_DEFAULTS, sites: "9" }, "open", "native"));
  assert.throws(() => manyBodyJob("bad", { ...MANY_BODY_DEFAULTS, transverse: "NaN" }, "open", "native"));
  assert.ok(isWorkspaceSnapshot(workspace), "older v1 snapshots must remain loadable");
  assert.ok(isWorkspaceSnapshot({ ...workspace, tab: "many_body", manyBody: { ...MANY_BODY_DEFAULTS } }));
  assert.equal(isWorkspaceSnapshot({ ...workspace, manyBody: { ...MANY_BODY_DEFAULTS, sites: "2".repeat(101) } }), false);
});

test("circuit draft is additive to workspace v1 and builds a bounded job", () => {
  const job = circuitJob("circuit-test", CIRCUIT_DEFAULTS, "native");
  assert.equal(job.model.parameters.ncut, 12);
  assert.throws(() => circuitJob("bad", { ...CIRCUIT_DEFAULTS, EC: "0" }, "native"));
  assert.ok(isWorkspaceSnapshot(workspace), "older snapshots remain loadable");
  assert.ok(isWorkspaceSnapshot({ ...workspace, tab: "circuit", circuit: CIRCUIT_DEFAULTS }));
  assert.equal(isWorkspaceSnapshot({ ...workspace, circuit: { ...CIRCUIT_DEFAULTS, engine: "quspin" } }), false);
});

test("topology draft is additive to workspace v1", () => {
  assert.ok(isWorkspaceSnapshot(workspace), "older v1 snapshots remain loadable");
  assert.ok(isWorkspaceSnapshot({ ...workspace, tab: "topology", topology: TOPOLOGY_DEFAULTS }));
  assert.ok(isWorkspaceSnapshot({ ...workspace, tab: "atlas" }));
  assert.equal(isWorkspaceSnapshot({ ...workspace, topology: { ...TOPOLOGY_DEFAULTS, modelId: "weyl" } }), false);
});
test("orbital draft is additive and retains basis/box/grid settings", () => {
  assert.ok(isWorkspaceSnapshot(workspace));
  assert.ok(isWorkspaceSnapshot({...workspace,tab:"orbital",orbital:ORBITAL_DEFAULTS}));
  assert.equal(isWorkspaceSnapshot({...workspace,orbital:{...ORBITAL_DEFAULTS,basis:"unknown"}}),false);
});
test("oscillator workspace draft is optional and rejects unsupported engines/fields", () => {
  assert.ok(isWorkspaceSnapshot(workspace));
  assert.ok(isWorkspaceSnapshot({...workspace,tab:"oscillator",oscillator:OSCILLATOR_DEFAULTS}));
  assert.equal(isWorkspaceSnapshot({...workspace,oscillator:{...OSCILLATOR_DEFAULTS,engine:"dynamiqs"}}),false);
  assert.equal(isWorkspaceSnapshot({...workspace,oscillator:{...OSCILLATOR_DEFAULTS,mass:"1"}}),false);
});
test("free oscillator draft and mode extend workspace v1 without invalidating legacy snapshots", () => {
  assert.ok(isWorkspaceSnapshot(workspace));
  const value = {...workspace, tab: "oscillator", oscillatorDynamics: OSCILLATOR_DYNAMICS_DEFAULTS, oscillatorMode: "dynamics"};
  assert.ok(isWorkspaceSnapshot(value));
  assert.ok(isWorkspaceSnapshot({...value, oscillator: OSCILLATOR_DEFAULTS}));
  assert.equal(isWorkspaceSnapshot({...value, oscillatorMode: "arbitrary"}), false);
  assert.equal(isWorkspaceSnapshot({...value, oscillatorDynamics: {...OSCILLATOR_DYNAMICS_DEFAULTS, initial: "arbitrary"}}), false);
  assert.equal(isWorkspaceSnapshot({...value, oscillatorDynamics: {...OSCILLATOR_DYNAMICS_DEFAULTS, engine: "dynamiqs"}}), false);
  assert.equal(isWorkspaceSnapshot({...value, oscillatorDynamics: {...OSCILLATOR_DYNAMICS_DEFAULTS, alphaRe: "x".repeat(101)}}), false);
  assert.equal(isWorkspaceSnapshot({...value, oscillatorDynamics: {...OSCILLATOR_DYNAMICS_DEFAULTS, script: "anything"}}), false);
});

test("run store persists provenance and verified data, then exports CSV, SVG and manifest", async () => {
  const root = await mkdtemp(join(tmpdir(), "qlab-run-test-"));
  const artifacts = join(root, "artifacts");
  await mkdir(artifacts);
  try {
    const store = new RunStore(join(root, "runs"), artifacts);
    const spectrumInput = spectrumJob("job-spectrum-test", { delta: "1", omega: "0.8" });
    const spectrum = { schema: "quantum-result/v1" as const, jobId: spectrumInput.jobId,
      runId: "run-spectrum-test", status: "completed" as const, operation: "diagonalize" as const,
      model: spectrumInput.model, engine: { name: "qutip" as const, version: "5.3" },
      spectrum: { eigenvalues: [-.64, .64] as [number, number], units: "normalized" as const, hbar: 1 as const },
      provenance: { pythonVersion: "3.12", workerVersion: "0.1", computedAt: "2026-09-27T00:00:00Z", durationMs: 1 } };
    await store.record(spectrumInput, spectrum);
    assert.deepEqual(await store.spectrum(spectrum.runId),spectrum);
    await assert.rejects(store.spectrum("../bad"),/Invalid run ID/);
    await assert.rejects(store.spectrum("missing-spectrum"),/ENOENT/);
    const job = evolutionJob("driven_two_level", "job-data-test", defaultsFor("driven_two_level"), 0, 0, 2, 3);
    const binary = Buffer.alloc(3 * 10 * 8);
    const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
    for (let row = 0; row < 3; row++) { view.setFloat64(row * 80, row, true); view.setFloat64(row * 80 + 8, 1 - row / 2, true); view.setFloat64(row * 80 + 16, row / 2, true); }
    await writeFile(join(artifacts, `${job.jobId}.f64`), binary);
    const digest = createHash("sha256").update(binary).digest("hex");
    const result = { schema: "quantum-result/v1" as const, jobId: job.jobId, runId: "run-data-test",
      status: "completed" as const, operation: "evolve" as const, model: job.model, initialState: job.initialState,
      solver: job.solver, observables: job.observables, engine: { name: "qutip" as const, version: "5.3" },
      data: { schema: "quantum-data/v1" as const, format: "f64le" as const, path: `${job.jobId}.f64`,
        rows: 3, columns: EVOLUTION_COLUMNS, bytes: binary.byteLength, sha256: digest },
      provenance: { pythonVersion: "3.12", workerVersion: "0.1", computedAt: "2026-09-27T00:00:01Z", durationMs: 2 } };
    await store.record(job, result);
    await assert.rejects(store.spectrum(result.runId),/not a verified two-level spectrum/);
    assert.deepEqual((await store.list()).map(item => item.runId), ["run-data-test", "run-spectrum-test"]);
    const csv = join(root, "data.csv"), svg = join(root, "figure.svg"), manifest = join(root, "manifest.json");
    await store.export(result.runId, "csv", csv);
    await store.export(result.runId, "svg", svg);
    await store.export(result.runId, "manifest", manifest);
    assert.match(await readFile(csv, "utf8"), /^time,p0,p1,/);
    assert.match(await readFile(csv, "utf8"), /\n2,0,1,/);
    assert.match(await readFile(svg, "utf8"), /<svg xmlns=/);
    assert.equal(JSON.parse(await readFile(manifest, "utf8")).job.jobId, job.jobId);
    await store.export(spectrum.runId, "csv", join(root, "spectrum.csv"));
    assert.match(await readFile(join(root, "spectrum.csv"), "utf8"), /E\+,0.64/);
    await writeFile(join(root, "runs", result.runId, "data.f64"), Buffer.alloc(binary.byteLength));
    await assert.rejects(store.export(result.runId, "csv", join(root, "bad.csv")), /integrity check/);
    await writeFile(join(root,"runs",spectrum.runId,"result.json"),"{}\n");
    await assert.rejects(store.spectrum(spectrum.runId),/integrity check/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("driven workspace settings are optional, bounded strings and reject executable or unsupported fields",()=>{
  assert.ok(isWorkspaceSnapshot(workspace));
  const extended={...workspace,tab:"oscillator",oscillator:OSCILLATOR_DEFAULTS,oscillatorDynamics:OSCILLATOR_DYNAMICS_DEFAULTS,oscillatorDriven:DRIVEN_OSCILLATOR_DEFAULTS,oscillatorMode:"driven"};
  assert.ok(isWorkspaceSnapshot(extended));
  for(const d of [{epsilonRe:"x".repeat(101)},{envelope:"t=>code"},{initial:"arbitrary"},{engine:"dynamiqs"}])assert.equal(isWorkspaceSnapshot({...extended,oscillatorDriven:{...DRIVEN_OSCILLATOR_DEFAULTS,...d}}),false);
});

test("run store persists inline many-body results and exports spectra", async () => {
  const root = await mkdtemp(join(tmpdir(), "qlab-ising-test-"));
  try {
    const store = new RunStore(join(root, "runs"), join(root, "artifacts"));
    const job: ManyBodyJob = { schema: "quantum-job/v1", jobId: "ising-run", operation: "many_body",
      engine: "native", model: { type: "ising_chain", parameters: {
        sites: 2, interaction: 1, transverse: 0.8, longitudinal: 0.15, boundary: "open" } } };
    const result: ManyBodyResult = { schema: "quantum-result/v1", jobId: job.jobId,
      runId: "run-ising-test", status: "completed", operation: "many_body", model: job.model,
      engine: { name: "native", version: "1.18" },
      spectrum: { lowEnergies: [-1.2, -0.1, 0.1, 1.2], gap: 1.1, units: "normalized", hbar: 1 },
      groundState: { siteMagnetization: [0.7, 0.7], halfChainEntropy: 0.2 },
      provenance: { pythonVersion: "3.12", workerVersion: "0.1", computedAt: "2026-09-27T00:00:02Z", durationMs: 3 } };
    await store.record(job, result);
    assert.equal((await store.list())[0].operation, "many_body");
    const csv = join(root, "ising.csv"), svg = join(root, "ising.svg");
    await store.export(result.runId, "csv", csv);
    await store.export(result.runId, "svg", svg);
    assert.match(await readFile(csv, "utf8"), /site_magnetization,0,0.7/);
    assert.match(await readFile(svg, "utf8"), /E0 -1.200/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("run store persists and exports bounded transmon spectra", async () => {
  const root = await mkdtemp(join(tmpdir(), "qlab-transmon-test-"));
  try {
    const store = new RunStore(join(root, "runs"), join(root, "artifacts"));
    const job: CircuitJob = { schema: "quantum-job/v1", jobId: "transmon-run", operation: "circuit",
      engine: "native", model: { type: "transmon", parameters: { EJ: 20, EC: .25, ng: .2, ncut: 12, levels: 3 } } };
    const result: CircuitResult = { schema: "quantum-result/v1", jobId: job.jobId, runId: "run-transmon-test",
      status: "completed", operation: "circuit", model: job.model, engine: { name: "native", version: "1.18" },
      spectrum: { energies: [-16, -11, -6.3], e01: 5, e12: 4.7, anharmonicity: -.3,
        chargeMatrixElement01: 1.1, cutoffDriftE01: 1e-8, units: "GHz" },
      provenance: { pythonVersion: "3.12", workerVersion: "0.1", computedAt: "2026-09-27T00:00:02Z", durationMs: 3 } };
    await store.record(job, result);
    assert.equal((await store.list())[0].operation, "circuit");
    const csv = join(root, "transmon.csv"), svg = join(root, "transmon.svg");
    await store.export(result.runId, "csv", csv);
    await store.export(result.runId, "svg", svg);
    assert.match(await readFile(csv, "utf8"), /anharmonicity,0,-0.3,GHz/);
    assert.match(await readFile(svg, "utf8"), /E0 -16.000/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
