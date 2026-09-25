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

test("model registry generates contract-compatible jobs from its defaults", () => {
  assert.deepEqual(
    MODEL_LIST.map((model) => model.id),
    ["two_level", "driven_two_level", "landau_zener"],
  );
  assert.ok(isQuantumJob(spectrumJob("static-1", defaultsFor("two_level"))));
  for (const id of ["driven_two_level", "landau_zener"] as const) {
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
    assert.deepEqual(
      Object.keys(job.model.parameters),
      definition.parameters.map((parameter) => parameter.key),
    );
    assert.deepEqual(job.model.source, { volume: "VIII", chapter: "58" });
  }
});
test("parameter metadata rejects out-of-range and missing model values", () => {
  assert.equal(
    parametersFor("landau_zener", { sweepRate: "1", gap: "", bias: "0" }),
    null,
  );
  assert.equal(
    parametersFor("driven_two_level", {
      ...defaultsFor("driven_two_level"),
      frequency: "-1",
    }),
    null,
  );
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
