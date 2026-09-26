import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MODEL_LIST,
  MODEL_REGISTRY,
  defaultsFor,
  parametersFor,
  spectrumJob,
  evolutionJob,
} from "../packages/models";
import { isQuantumJob } from "../packages/contracts";
import { SWEEP_DEFAULTS, sweepJob } from "../packages/models/sweep";

test("model registry generates contract-compatible jobs from its defaults", () => {
  assert.deepEqual(
    MODEL_LIST.map((model) => model.id),
    ["two_level", "driven_two_level", "landau_zener", "stuckelberg", "strong_drive"],
  );
  assert.ok(isQuantumJob(spectrumJob("static-1", defaultsFor("two_level"))));
  assert.equal(
    spectrumJob("native-1", defaultsFor("two_level"), "native").engine,
    "native",
  );
  for (const id of [
    "driven_two_level",
    "landau_zener",
    "stuckelberg",
    "strong_drive",
  ] as const) {
    const definition = MODEL_REGISTRY[id];
    const values = defaultsFor(id);
    assert.ok(parametersFor(id, values));
    const job = evolutionJob(
      id,
      `${id}-1`,
      values,
      definition.defaultState.index,
      definition.solverDefaults!.tStart,
      definition.solverDefaults!.tStop,
      definition.solverDefaults!.samples,
    );
    assert.ok(isQuantumJob(job));
    assert.equal(
      evolutionJob(
        id,
        `${id}-native`,
        values,
        0,
        definition.solverDefaults!.tStart,
        definition.solverDefaults!.tStop,
        definition.solverDefaults!.samples,
        "native",
      ).engine,
      "native",
    );
    assert.deepEqual(
      Object.keys(job.model.parameters),
      definition.parameters.map((parameter) => parameter.key),
    );
    if (id === "landau_zener") {
      assert.equal(job.model.source?.sourceModule, "examples/python/qutip/labs/two_level_dynamics.py");
      assert.equal(job.model.source?.exampleId, "Commit 687");
    } else assert.deepEqual(job.model.source, { volume: "VIII", chapter: "58" });
  }
});
test("parameter metadata rejects out-of-range and missing model values", () => {
  assert.equal(
    parametersFor("landau_zener", { sweepRate: "1", gap: "", bias: "0" }),
    null,
  );
  assert.equal(
    parametersFor("stuckelberg", {
      ...defaultsFor("stuckelberg"),
      turnTime: "0",
    }),
    null,
  );
  assert.equal(
    parametersFor("driven_two_level", {
      ...defaultsFor("driven_two_level"),
      frequency: "-1",
    }),
    null,
  );
  assert.equal(parametersFor("strong_drive", { ...defaultsFor("strong_drive"), frequency: "0" }), null);
  const floquet = evolutionJob("strong_drive", "floquet-valid", defaultsFor("strong_drive"), 0, 0, 10, 101);
  assert.equal(isQuantumJob({ ...floquet, model: { ...floquet.model,
    parameters: { ...floquet.model.parameters, frequency: 0 } } }), false);
  assert.throws(() =>
    evolutionJob(
      "landau_zener",
      "bad",
      defaultsFor("landau_zener"),
      0,
      10,
      -10,
      401,
    ),
  );
});
test("sweep builder validates axis membership, unique dimensions and cell budget", () => {
  const x = SWEEP_DEFAULTS.driven_two_level.x;
  const y = SWEEP_DEFAULTS.driven_two_level.y;
  const make = (xAxis = x, yAxis: typeof y | null = null) =>
    sweepJob("driven_two_level", "sweep-model", defaultsFor("driven_two_level"),
      xAxis, yAxis, 0, 20, 0, "native");
  assert.ok(isQuantumJob(make()));
  assert.ok(isQuantumJob(make(x, y)));
  assert.throws(() => make({ ...x, parameter: "gap" }));
  assert.throws(() => make(x, { ...x }));
  assert.throws(() => make({ ...x, points: 101 }, { ...y, points: 101 }));
});
