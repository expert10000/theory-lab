import type { QuantumResult } from "../contracts";
import { assertScene, decodeDataset, verifyScenePayload, type QuantumScene, type SceneObject, type ScenePayload } from "./index";

export function supportsScene(operation: string, model: string): boolean {
  return operation === "evolve" || (operation === "topology" && ["ssh", "qwz"].includes(model)) || (operation === "orbital" && model === "hydrogenic");
}
export async function sceneFromResult(result: QuantumResult, data: Uint8Array | null, resultSha256: string,
  digest: (bytes: Uint8Array) => Promise<string>): Promise<ScenePayload> {
  if (!supportsScene(result.operation, result.model.type)) throw new Error("This result has no QVIS-002 scene adapter");
  const scene: QuantumScene = {
    schema: "quantum-scene/v1", id: result.runId, title: `${result.model.type.replaceAll("_", " ")} · ${result.engine.name}`,
    provenance: { runId: result.runId, jobId: result.jobId, model: result.model.type, engine: result.engine.name,
      engineVersion: result.engine.version, computedAt: result.provenance.computedAt, resultSha256, adapter: "qvis/1", parameters: { ...result.model.parameters } },
    coordinates: { handedness: "right", axes: ["x", "y", "z"], units: ["dimensionless", "dimensionless", "dimensionless"] },
    camera: { position: [3, 2, 2], target: [0, 0, 0], up: [0, 0, 1] },
    objects: [], datasets: [], annotations: [],
  };
  const source = "source" in result.model ? result.model.source : undefined;
  const repository = source?.sourceRepository;
  const pinned = repository?.match(/^(https:\/\/github\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+)\/tree\/([a-f0-9]{40})$/);
  const entryId = source?.exampleId?.match(/^Atlas ([A-Za-z0-9_-]+)$/)?.[1];
  if (pinned && entryId) scene.provenance.source = { repository: pinned[1], revision: pinned[2], entryId };
  const artifacts: ScenePayload["artifacts"] = {};
  async function dataset(id: string, values: number[], components: 1 | 3, unit: string) {
    const bytes = new Uint8Array(values.length * 8);
    const view = new DataView(bytes.buffer);
    values.forEach((v, i) => view.setFloat64(i * 8, v, true));
    const path = `${id}.f64`;
    scene.datasets.push({ id, path, format: "f64le", count: values.length / components, components, unit,
      bytes: bytes.byteLength, sha256: await digest(bytes) });
    artifacts[path] = bytes;
    return id;
  }
  function object(id: string, label: string, kind: SceneObject["kind"], positions: string, color: string, refs: Partial<SceneObject> = {}) {
    scene.objects.push({ id, label, kind, positions, visible: true, style: { color, opacity: 1, size: kind === "point-cloud" ? .14 : 1 }, ...refs });
  }
  if (result.operation === "orbital") {
    if (!data || data.byteLength !== result.data.bytes || await digest(data) !== result.data.sha256) throw new Error("Orbital source artifact failed integrity check");
    const p = result.model.parameters, samples = decodeDataset(data);
    if (samples.length !== p.grid ** 3 * 2 || !samples.every(Number.isFinite)) throw new Error("Invalid orbital source layout");
    const real: number[] = [], imaginary: number[] = [];
    for (let i = 0; i < samples.length; i += 2) { real.push(samples[i]); imaginary.push(samples[i + 1]); }
    scene.coordinates.units = ["a0", "a0", "a0"];
    const extent = (3 * p.n ** 2 - p.l * (p.l + 1)) / (2 * p.Z);
    scene.camera = { position: [4 * extent, 3.4 * extent, 3 * extent], target: [0, 0, 0], up: [0, 0, 1] };
    scene.fields = [{ id: "wavefunction", label: `Hydrogenic ψ · n=${p.n}, l=${p.l}, m=${p.m} · ${p.basis}`, kind: "complex-field",
      real: await dataset("psi-real", real, 1, "a0^-3/2"), imaginary: await dataset("psi-imaginary", imaginary, 1, "a0^-3/2"),
      grid: { shape: [p.grid, p.grid, p.grid], origin: [-p.radius, -p.radius, -p.radius],
        spacing: [2 * p.radius / (p.grid - 1), 2 * p.radius / (p.grid - 1), 2 * p.radius / (p.grid - 1)], order: "xyz-z-fastest" } }];
    scene.annotations.push({ id: "assumptions", text: `One-electron Coulomb · infinite nuclear mass · E=${result.analysis.energyHartree.toPrecision(5)} Hartree`, position: [0, 0, p.radius] });
  } else if (result.operation === "evolve") {
    if (!data || data.byteLength !== result.data.bytes || await digest(data) !== result.data.sha256) throw new Error("Evolution source artifact failed integrity check");
    const samples = decodeDataset(data);
    if (samples.length !== result.data.rows * 10 || !samples.every(Number.isFinite)) throw new Error("Invalid evolution source layout");
    const positions: number[] = [], time: number[] = [];
    for (let i = 0; i < result.data.rows; i++) {
      const offset = i * 10;
      positions.push(samples[offset + 3], samples[offset + 4], samples[offset + 5]); time.push(samples[offset]);
    }
    scene.coordinates.axes = ["sigma_x", "sigma_y", "sigma_z"];
    const trajectory = await dataset("trajectory", positions, 3, "dimensionless");
    const times = await dataset("time", time, 1, "normalized time (hbar=1)");
    object("bloch-trajectory", "Bloch trajectory (color = time)", "polyline", trajectory, "#79d9c1", { scalars: times });
    const origin = await dataset("origin", [0, 0, 0], 3, "dimensionless");
    const initial = await dataset("initial-vector", positions.slice(0, 3), 3, "dimensionless");
    object("initial-state", "Initial state", "vectors", origin, "#ffca80", { values: initial });
    for (const [id, plane] of [["xy", [0, 1]], ["xz", [0, 2]], ["yz", [1, 2]]] as const) {
      const points: number[] = [];
      for (let i = 0; i <= 96; i++) { const p = [0, 0, 0]; p[plane[0]] = Math.cos(i * Math.PI / 48); p[plane[1]] = Math.sin(i * Math.PI / 48); points.push(...p); }
      object(`sphere-${id}`, `Unit-sphere ${id} guide`, "polyline", await dataset(`guide-${id}`, points, 3, "dimensionless"), "#435d6b");
    }
    scene.annotations.push({ id: "north", text: "sigma_z = +1", position: [0, 0, 1.1] });
  } else if (result.operation === "topology" && result.analysis.kind === "ssh") {
    const a = result.analysis, n = a.edgeDensity.length;
    const positions = await dataset("sites", a.edgeDensity.flatMap((_, i) => [i, 0, 0]), 3, "site index");
    const scalars = await dataset("density", a.edgeDensity, 1, "probability per site");
    object("chain", "Open SSH chain", "polyline", positions, "#617888");
    object("edge-density", "Midgap-pair density (color)", "point-cloud", positions, "#79d9c1", { scalars });
    scene.objects[scene.objects.length - 1].style.size = .35;
    scene.coordinates = { handedness: "right", axes: ["site index", "display y", "display z"], units: ["site index", "dimensionless", "dimensionless"] };
    const center = (n - 1) / 2;
    scene.camera = { position: [center, -n * .45, n * .3], target: [center, 0, 0], up: [0, 0, 1] };
    scene.annotations.push({ id: "invariant", text: `Winding ${a.winding ?? "undefined"} · bulk gap ${a.bulkGap.toPrecision(5)} (normalized)`, position: [center, 0, 1] });
  } else if (result.operation === "topology" && result.model.type === "qwz" && result.analysis.kind === "qwz") {
    const a = result.analysis, grid = result.model.parameters.grid;
    if (a.gapClosed || a.berryCurvature.length !== grid * grid) throw new Error("QWZ field undefined at gap closure; no scene can be exported");
    const step = 2 * Math.PI / grid, positions: number[] = [], indices: number[] = [];
    for (let x = 0; x < grid; x++) for (let y = 0; y < grid; y++) {
      positions.push(-Math.PI + (x + .5) * step, -Math.PI + (y + .5) * step, a.berryCurvature[x * grid + y]);
      if (x < grid - 1 && y < grid - 1) { const i = x * grid + y; indices.push(i, i + grid, i + 1, i + 1, i + grid, i + grid + 1); }
    }
    const p = await dataset("curvature-grid", positions, 3, "mixed: kx, ky, Berry curvature");
    object("berry-curvature", "Lower-band Berry curvature", "mesh", p, "#79d9c1", {
      indices: await dataset("triangles", indices, 3, "vertex index"), scalars: await dataset("curvature", a.berryCurvature, 1, "dimensionless (a=1)") });
    scene.coordinates = { handedness: "right", axes: ["kx", "ky", "Berry curvature"], units: ["rad / lattice constant", "rad / lattice constant", "dimensionless (a=1)"] };
    const height = Math.max(1, ...a.berryCurvature.map(Math.abs));
    scene.camera = { position: [8 + height, 6 + height, 6 + height], target: [0, 0, 0], up: [0, 0, 1] };
    scene.annotations.push({ id: "invariant", text: `Chern ${a.chern ?? "unresolved"} · mesh ${grid}×${grid} · no periodic seam interpolation`, position: [0, 0, height] });
  } else throw new Error("Result/model analysis mismatch");
  assertScene(scene);
  const payload = { scene, artifacts };
  await verifyScenePayload(payload, digest);
  return payload;
}
