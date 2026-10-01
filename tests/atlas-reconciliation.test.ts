import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { atlasReconciliationReport } from "../packages/atlas/report";
import legacy from "../packages/atlas/fixtures/legacy-48.v1.json";
import {
  ATLAS_ENTRIES,
  ATLAS_SOURCE_BINDINGS,
  atlasEntry,
} from "../packages/atlas";
import { atlasBinding } from "../packages/atlas/bindings";
import {
  ATLAS_RECONCILIATION,
  LAB_IMPLEMENTATIONS,
  reconcileAtlas,
  webSupportsAtlasBinding,
} from "../packages/atlas/reconciliation";
import { supportsScene } from "../packages/quantum-scene/from-result";
import { assertJob, type QuantumJob } from "../packages/contracts";
import { pulsedOscillatorJob, PULSED_OSCILLATOR_DEFAULTS } from "../packages/models/oscillator-pulse";
import { dampedOscillatorJob, DAMPED_OSCILLATOR_DEFAULTS } from "../packages/models/oscillator-damped";
import {
  MODEL_REGISTRY,
  defaultsFor,
  evolutionJob,
  spectrumJob,
  type EvolutionModelId,
} from "../packages/models";
import {
  CAVITY_REGISTRY,
  cavityDefaults,
  cavityJob,
} from "../packages/models/cavity";
import { lindbladDefaults, lindbladJob } from "../packages/models/lindblad";
import { manyBodyJob, MANY_BODY_DEFAULTS } from "../packages/models/many_body";
import { circuitJob, CIRCUIT_DEFAULTS } from "../packages/models/circuit";
import { topologyJob, TOPOLOGY_DEFAULTS } from "../packages/models/topology";
import { orbitalJob, ORBITAL_DEFAULTS } from "../packages/models/orbital";
import { oscillatorJob, OSCILLATOR_DEFAULTS } from "../packages/models/oscillator";
import { oscillatorEvolutionJob, OSCILLATOR_DYNAMICS_DEFAULTS } from "../packages/models/oscillator-dynamics";
import { drivenOscillatorJob, DRIVEN_OSCILLATOR_DEFAULTS } from "../packages/models/oscillator-drive";

test("R1 preserves scientific definitions for all 48 legacy IDs and all nine exact Lab bindings", () => {
  assert.equal(Object.keys(legacy.fingerprints).length, 48);
  for (const [id, fingerprint] of Object.entries(legacy.fingerprints)) {
    const e = atlasEntry(id);
    assert.ok(e, id);
    const actual = createHash("sha256")
      .update(
        JSON.stringify({
          formula: e.formula,
          basis: e.basis,
          parameters: e.parameters,
        }),
      )
      .digest("hex");
    assert.equal(actual, fingerprint, id);
  }
  const actual = Object.fromEntries(
    ATLAS_ENTRIES.map((e) => [e.id, atlasBinding(e.id)]).filter(([, b]) => b),
  );
  assert.deepEqual(Object.fromEntries(Object.keys(legacy.bindings).map(id=>[id,actual[id]])), legacy.bindings);
  assert.equal(Object.keys(actual).length,11,"nine original bindings plus static and driven oscillator additions");
});

test("R1 covers all 68 IDs and separates source examples, related physics, binding and scene capabilities", () => {
  assert.equal(
    readFileSync("docs/ATLAS_RECONCILIATION_R1.md", "utf8").replaceAll(
      "\r\n",
      "\n",
    ),
    atlasReconciliationReport(),
  );
  assert.equal(ATLAS_RECONCILIATION.length, 68);
  assert.equal(new Set(ATLAS_RECONCILIATION.map((r) => r.atlasId)).size, 68);
  assert.equal(ATLAS_RECONCILIATION.filter((r) => r.lab).length, 11);
  assert.equal(
    ATLAS_RECONCILIATION.filter((r) => r.lab?.implementation.webControl).length,
    4,
  );
  assert.equal(ATLAS_RECONCILIATION.filter((r) => r.sourceExample).length, 7);
  for (const r of ATLAS_RECONCILIATION) {
    assert.ok(r.reference && r.gap);
    assert.equal(Boolean(r.lab), Boolean(atlasBinding(r.atlasId)));
    if (r.lab) {
      assert.ok(r.lab.implementation.operations.includes(r.lab.operation));
      assert.equal(
        r.lab.implementation.sceneViews.length > 0,
        supportsScene(r.lab.operation, r.lab.modelId),
      );
      assert.equal(
        webSupportsAtlasBinding(atlasBinding(r.atlasId)!),
        r.lab.implementation.webControl,
      );
    }
    for (const related of r.relatedLabs)
      assert.ok(LAB_IMPLEMENTATIONS[related.modelId]);
  }
  assert.equal(reconcileAtlas("coulomb_one_body")?.status, "related-only");
  assert.equal(reconcileAtlas("coulomb_one_body")?.lab, null);
  assert.equal(reconcileAtlas("harmonic_oscillator")?.lab?.operation, "oscillator");
  assert.equal(reconcileAtlas("dispersive_jc")?.sourceExample?.kind, "direct");
  assert.equal(reconcileAtlas("dispersive_jc")?.lab, null);
  assert.equal(
    reconcileAtlas("surface_code_planar")?.sourceExample?.kind,
    "reference_lab",
  );
  assert.equal(reconcileAtlas("surface_code_planar")?.lab, null);
  assert.equal(reconcileAtlas("hofstadter")?.status, "reference");
  assert.equal(LAB_IMPLEMENTATIONS.driven_two_level.sceneOperation, "evolve");
  assert.equal(supportsScene("sweep", "driven_two_level"), false);
  assert.equal(reconcileAtlas("not-in-atlas"), null);
  for (const [id, b] of Object.entries(ATLAS_SOURCE_BINDINGS)) {
    assert.ok(atlasEntry(id));
    for (const path of [b.adapter, b.example])
      assert.match(path, /^examples\/python\/qutip\/[A-Za-z0-9_/-]+\.py$/);
  }
});

test("existing-model inventory maps real typed modules/jobs, without adding a parallel execution registry", () => {
  const time = {
    type: "schrodinger" as const,
    tStart: 0,
    tStop: 10,
    samples: 31,
  };
  const jobs: QuantumJob[] = [
    spectrumJob("r1", defaultsFor("two_level"), "native"),
    ...["driven_two_level", "landau_zener", "stuckelberg", "strong_drive"].map(
      (id) =>
        evolutionJob(
          id as EvolutionModelId,
          "r1",
          defaultsFor(id as EvolutionModelId),
          0,
          0,
          10,
          31,
          "native",
        ),
    ),
    ...["jaynes_cummings", "quantum_rabi"].map((id) =>
      cavityJob(
        id as keyof typeof CAVITY_REGISTRY,
        "r1",
        cavityDefaults(id as keyof typeof CAVITY_REGISTRY),
        { qubit: "excited", photons: 0 },
        time,
        "native",
      ),
    ),
    lindbladJob(
      "r1",
      lindbladDefaults(),
      { qubit: "excited", photons: 0 },
      { ...time, type: "master" },
      "native",
    ),
    manyBodyJob("r1", MANY_BODY_DEFAULTS, "open", "native"),
    circuitJob("r1", CIRCUIT_DEFAULTS, "native"),
    topologyJob("r1", { ...TOPOLOGY_DEFAULTS, modelId: "ssh" }),
    topologyJob("r1", { ...TOPOLOGY_DEFAULTS, modelId: "qwz" }),
    orbitalJob("r1", ORBITAL_DEFAULTS),
    oscillatorJob("d1", OSCILLATOR_DEFAULTS, "native"),
    oscillatorEvolutionJob("d1-motion", OSCILLATOR_DYNAMICS_DEFAULTS, "native"),
    drivenOscillatorJob("d1-drive", DRIVEN_OSCILLATOR_DEFAULTS, "native"),
    pulsedOscillatorJob("d1-pulse", PULSED_OSCILLATOR_DEFAULTS, "native"),
    dampedOscillatorJob("d1-damped", DAMPED_OSCILLATOR_DEFAULTS, "native"),
  ];
  assert.equal(jobs.length, 18);
  assert.deepEqual(
    new Set(jobs.map((j) => j.model.type)),
    new Set(Object.keys(LAB_IMPLEMENTATIONS)),
  );
  for (const j of jobs) {
    assertJob(j);
    const implementation = LAB_IMPLEMENTATIONS[j.model.type];
    assert.ok(existsSync(implementation.module));
    assert.ok(implementation.operations.includes(j.operation));
    assert.ok(implementation.engines.includes(j.engine));
    assert.equal(
      implementation.sceneViews.length > 0,
      supportsScene(j.operation, j.model.type),
    );
  }
  assert.deepEqual(
    Object.keys(MODEL_REGISTRY).sort(),
    [
      "two_level",
      "driven_two_level",
      "landau_zener",
      "stuckelberg",
      "strong_drive",
    ].sort(),
  );
});
