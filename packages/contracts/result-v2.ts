import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import Ajv from "ajv";
import schema from "./schemas/quantum-result.v2.json";
import { isQuantumResult, type TopologyResult } from "./index";

type DatasetId = "band-k" | "lower-band" | "upper-band" | "berry-curvature";
type Dataset = {
  id: DatasetId; role: "coordinate" | "energy" | "berry-curvature";
  axes: ("kx" | "ky" | "band")[]; shape: number[]; unit: string;
  storage: { kind: "source-json-pointer"; pointer: string; encoding: "f64le"; sha256: string };
};
export type QuantumResultV2 = {
  schema: "quantum-result/v2"; runId: string; jobId: string; operation: "topology";
  model: { type: "qwz"; parameters: { mass: number; grid: number } };
  source: { schema: "quantum-result/v1"; resultSha256: string; bytes: number };
  datasets: Dataset[];
  facts: { bulkGap: number; sampledGap: number; chern: number | null; meshResolved: boolean };
  unavailable: { role: "eigenstates" | "berry-connection"; reason: string }[];
};

const checkSchema = new Ajv({ strict: true, allErrors: true }).compile(schema);
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const specs = [
  { id: "band-k", key: "bandKValues", role: "coordinate", axes: ["kx"], unit: "rad / lattice constant", shape: (g: number) => [g] },
  { id: "lower-band", key: "lowerBand", role: "energy", axes: ["kx", "ky"], unit: "normalized energy (hbar=1)", shape: (g: number) => [g, g] },
  { id: "upper-band", key: "upperBand", role: "energy", axes: ["kx", "ky"], unit: "normalized energy (hbar=1)", shape: (g: number) => [g, g] },
  { id: "berry-curvature", key: "berryCurvature", role: "berry-curvature", axes: ["kx", "ky"], unit: "dimensionless (a=1)", shape: (g: number) => [g, g] },
] as const;
function numericHash(values: readonly number[]) {
  const bytes = Buffer.alloc(values.length * 8);
  values.forEach((value, index) => {
    if (!Number.isFinite(value)) throw new Error(`Non-finite dataset value at ${index}`);
    bytes.writeDoubleLE(value, index * 8);
  });
  return sha(bytes);
}
function sourceResult(bytes: Uint8Array): TopologyResult {
  const result: unknown = JSON.parse(Buffer.from(bytes).toString("utf8"));
  if (!result || typeof result !== "object") throw new Error("Invalid source result");
  const candidate = result as TopologyResult;
  if (!isQuantumResult(candidate) || candidate.schema !== "quantum-result/v1" || candidate.operation !== "topology" ||
      candidate.model?.type !== "qwz" || candidate.analysis?.kind !== "qwz" ||
      candidate.status !== "completed") throw new Error("Expected a completed QWZ quantum-result/v1");
  return candidate;
}
export function qwzResultV2(sourceBytes: Uint8Array): QuantumResultV2 {
  const descriptor = qwzDescriptorWithoutValidation(sourceBytes);
  assertQuantumResultV2(descriptor, sourceBytes);
  return descriptor;
}
export function assertQuantumResultV2(value: unknown, sourceBytes: Uint8Array): asserts value is QuantumResultV2 {
  if (!checkSchema(value)) throw new Error(`Invalid quantum-result/v2: ${checkSchema.errors?.map(e => `${e.instancePath} ${e.message}`).join("; ")}`);
  try { assert.deepStrictEqual(value, qwzDescriptorWithoutValidation(sourceBytes)); }
  catch { throw new Error("quantum-result/v2 does not match the verified source run"); }
}
function qwzDescriptorWithoutValidation(sourceBytes: Uint8Array): QuantumResultV2 {
  const result = sourceResult(sourceBytes);
  const analysis = result.analysis;
  if (analysis.kind !== "qwz" || result.model.type !== "qwz") throw new Error("Expected QWZ analysis");
  const grid = result.model.parameters.grid;
  const datasets: Dataset[] = specs.map(spec => {
    const values = analysis[spec.key];
    const shape = spec.shape(grid);
    if (!Array.isArray(values) || values.length !== shape.reduce((a, b) => a * b, 1))
      throw new Error(`Missing or wrong-shaped QWZ ${spec.key}`);
    return { id: spec.id, role: spec.role, axes: [...spec.axes], shape,
      unit: spec.unit, storage: { kind: "source-json-pointer", pointer: `/analysis/${spec.key}`,
        encoding: "f64le", sha256: numericHash(values) } };
  });
  return {
    schema: "quantum-result/v2", runId: result.runId, jobId: result.jobId,
    operation: "topology", model: { type: "qwz", parameters: { ...result.model.parameters } },
    source: { schema: "quantum-result/v1", resultSha256: sha(sourceBytes), bytes: sourceBytes.byteLength },
    datasets, facts: { bulkGap: analysis.bulkGap, sampledGap: analysis.sampledGap,
      chern: analysis.chern, meshResolved: analysis.meshResolved },
    unavailable: ["eigenstates", "berry-connection"].map(role =>
      ({ role: role as "eigenstates" | "berry-connection", reason: "not supplied by quantum-result/v1 QWZ worker" })),
  };
}
