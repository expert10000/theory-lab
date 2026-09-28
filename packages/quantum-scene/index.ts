import schema from "./quantum-scene.v1.json";

export type Vec3 = [number, number, number];
export interface SceneDataset {
  id: string; path: string; format: "f64le"; count: number; components: 1 | 3;
  unit: string; bytes: number; sha256: string;
}
export interface SceneObject {
  id: string; label: string; kind: "point-cloud" | "polyline" | "vectors" | "mesh";
  positions: string; values?: string; indices?: string; scalars?: string; visible: boolean;
  style: { color: string; opacity: number; size: number };
}
export interface QuantumScene {
  schema: "quantum-scene/v1"; id: string; title: string;
  provenance: { runId: string; jobId: string; model: string; engine: string; engineVersion: string;
    computedAt: string; resultSha256: string; adapter: "qvis/1";
    parameters?: Record<string, number | string>;
    source?: { repository: string; revision: string; entryId: string } };
  coordinates: { handedness: "right"; axes: [string, string, string]; units: [string, string, string] };
  camera: { position: Vec3; target: Vec3; up: Vec3 };
  datasets: SceneDataset[]; objects: SceneObject[];
  annotations: { id: string; text: string; position: Vec3 }[];
}
export interface ScenePayload { scene: QuantumScene; artifacts: Record<string, Uint8Array> }
export const MAX_SCENE_BYTES = 16 * 1024 * 1024;

// Interpret only the vocabulary used by this fixed schema. No eval/code generation,
// Node imports, URLs or file reads: this boundary also works under the browser CSP.
function check(rule: any, value: any, path: string): void {
  if (rule.$ref) return check((schema.definitions as any)[rule.$ref.split("/").pop()], value, path);
  const fail = () => { throw new Error(`Invalid quantum-scene/v1 at ${path}`); };
  if (rule.anyOf) {
    for (const candidate of rule.anyOf) { try { check(candidate, value, path); return; } catch { /* Try the next declared variant. */ } }
    fail();
  }
  if ("const" in rule && value !== rule.const) fail();
  if (rule.enum && !rule.enum.includes(value)) fail();
  if (rule.type === "number" || rule.type === "integer") {
    if (typeof value !== "number" || !Number.isFinite(value) || (rule.type === "integer" && !Number.isInteger(value)) || value < rule.minimum || value > rule.maximum) fail();
  } else if (rule.type === "string") {
    if (typeof value !== "string" || value.length < (rule.minLength ?? 0) || value.length > (rule.maxLength ?? Infinity) || (rule.pattern && !new RegExp(rule.pattern).test(value))) fail();
  } else if (rule.type === "boolean") { if (typeof value !== "boolean") fail(); }
  else if (rule.type === "array") {
    if (!Array.isArray(value) || value.length < (rule.minItems ?? 0) || value.length > (rule.maxItems ?? Infinity)) fail();
    for (let i = 0; i < value.length; i++) check(rule.items, value[i], `${path}[${i}]`);
  } else if (rule.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail();
    if (Object.keys(value).length < (rule.minProperties ?? 0) || Object.keys(value).length > (rule.maxProperties ?? Infinity)) fail();
    for (const key of rule.required ?? []) if (!Object.hasOwn(value, key)) fail();
    for (const key of Object.keys(value)) {
      if (rule.propertyNames) check(rule.propertyNames, key, `${path}.key`);
      if (Object.hasOwn(rule.properties ?? {}, key)) check(rule.properties[key], value[key], `${path}.${key}`);
      else if (rule.additionalProperties && typeof rule.additionalProperties === "object") check(rule.additionalProperties, value[key], `${path}.${key}`);
      else fail();
    }
  }
}

export function assertScene(value: unknown): asserts value is QuantumScene {
  check(schema, value, "scene");
  const scene = value as QuantumScene;
  const unique = (ids: string[]) => { if (new Set(ids).size !== ids.length) throw new Error("Duplicate scene identity"); };
  unique([...scene.objects.map(o => o.id), ...scene.annotations.map(a => a.id)]);
  unique(scene.datasets.map(d => d.id)); unique(scene.datasets.map(d => d.path));
  if (scene.datasets.reduce((n, d) => n + d.bytes, 0) > MAX_SCENE_BYTES) throw new Error("Scene exceeds memory budget");
  const datasets = new Map(scene.datasets.map(d => [d.id, d]));
  for (const d of scene.datasets) if (d.bytes !== d.count * d.components * 8) throw new Error("Dataset shape/size mismatch");
  for (const o of scene.objects) {
    const p = datasets.get(o.positions);
    if (!p || p.components !== 3) throw new Error("Missing position dataset");
    if (o.kind === "polyline" && p.count < 2) throw new Error("Polyline needs two points");
    if ((o.kind === "vectors") !== !!o.values || (o.kind === "mesh") !== !!o.indices) throw new Error("Object kind/reference mismatch");
    for (const [ref, components, sameCount] of [[o.values, 3, true], [o.indices, 3, false], [o.scalars, 1, true]] as const) {
      if (!ref) continue;
      const d = datasets.get(ref);
      if (!d || d.components !== components || (sameCount && d.count !== p.count)) throw new Error("Object dataset mismatch");
    }
  }
  const { position: p, target: t, up } = scene.camera;
  const direction = t.map((v, i) => v - p[i]);
  const cross = [direction[1] * up[2] - direction[2] * up[1], direction[2] * up[0] - direction[0] * up[2], direction[0] * up[1] - direction[1] * up[0]];
  if (Math.hypot(...cross) < 1e-9) throw new Error("Degenerate scene camera");
}

export function decodeDataset(bytes: Uint8Array): Float64Array {
  if (bytes.byteLength % 8) throw new Error("Incomplete f64le dataset");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return Float64Array.from({ length: bytes.byteLength / 8 }, (_, i) => view.getFloat64(i * 8, true));
}
export async function verifyScenePayload(payload: ScenePayload, digest: (bytes: Uint8Array) => Promise<string>): Promise<Map<string, Float64Array>> {
  assertScene(payload.scene);
  if (Object.keys(payload.artifacts).length !== payload.scene.datasets.length) throw new Error("Unexpected scene artifacts");
  const arrays = new Map<string, Float64Array>();
  for (const d of payload.scene.datasets) {
    const bytes = payload.artifacts[d.path];
    if (!(bytes instanceof Uint8Array) || bytes.byteLength !== d.bytes || await digest(bytes) !== d.sha256) throw new Error(`Scene artifact integrity failed: ${d.id}`);
    const values = decodeDataset(bytes);
    if (!values.every(Number.isFinite)) throw new Error("Non-finite scene data");
    if (d.components === 3 && !values.every(v => Math.abs(v) <= 1000000)) throw new Error("Scene coordinate exceeds bounds");
    arrays.set(d.id, values);
  }
  for (const o of payload.scene.objects) if (o.indices) {
    const count = arrays.get(o.positions)!.length / 3;
    if (!arrays.get(o.indices)!.every(v => Number.isInteger(v) && v >= 0 && v < count)) throw new Error("Invalid mesh indices");
  }
  return arrays;
}
