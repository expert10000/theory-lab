import type { QuantumResult } from "../contracts";
import { SceneBuilder } from "./builder";
import { addReciprocalGuides } from "./reciprocal";
import { assertScene, decodeDataset, verifyScenePayload, type QuantumScene, type SceneObject, type ScenePayload } from "./index";

export function supportsScene(operation: string, model: string): boolean {
  return operation === "evolve" || (operation === "topology" && ["ssh", "qwz"].includes(model)) || (operation === "orbital" && model === "hydrogenic") || (operation === "many_body" && model === "ising_chain");
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
  } else if (result.operation === "many_body") {
    const p = result.model.parameters, n = p.sites, m = result.groundState.siteMagnetization;
    if (m.length !== n || !m.every(v => Number.isFinite(v) && Math.abs(v) <= 1 + 1e-10)) throw new Error("Invalid Ising site magnetization layout");
    const points = Array.from({ length: n }, (_, i) => p.boundary === "periodic"
      ? [n / (2 * Math.PI) * Math.cos(2 * Math.PI * i / n), n / (2 * Math.PI) * Math.sin(2 * Math.PI * i / n), 0] : [i, 0, 0]);
    const positions = await dataset("sites", points.flat(), 3, "schematic lattice spacing");
    const magnetization = await dataset("magnetization", m, 1, "dimensionless Pauli sigma_z expectation");
    const bonds = p.boundary === "periodic" ? [...points, points[0]] : points;
    object("ising-bonds", `${p.boundary} Ising chain · J=${p.interaction}`, "polyline", await dataset("bonds", bonds.flat(), 3, "schematic lattice spacing"), "#617888");
    object("ising-sites", "Ground-state site magnetization (color)", "point-cloud", positions, "#79d9c1", { scalars: magnetization });
    scene.objects[scene.objects.length - 1].style.size = .25;
    object("magnetization-height", "Pauli σz expectation as height (not a spatial spin vector)", "vectors", positions, "#f2b36f", {
      values: await dataset("magnetization-height", m.flatMap(v => [0, 0, v]), 3, "dimensionless Pauli sigma_z expectation"), scalars: magnetization });
    scene.coordinates = { handedness: "right", axes: ["schematic x", "schematic y", "sigma_z display height"], units: ["schematic spacing", "schematic spacing", "dimensionless"] };
    const center = p.boundary === "open" ? (n - 1) / 2 : 0;
    scene.camera = { position: [center + n * .35, -n * .9, n * .7], target: [center, 0, 0], up: [0, 0, 1] };
    points.forEach((v, i) => scene.annotations.push({ id: `site-label-${i}`, text: `site ${i}`, position: [v[0], v[1], -.3] }));
    scene.annotations.push({ id: "ising-convention", text: "Finite-chain ground state · Pauli σz (not σz/2) · geometry is schematic", position: [center, 0, 1.35] });
  } else if (result.operation === "topology" && result.model.type === "ssh" && result.analysis.kind === "ssh") {
    const a = result.analysis, n = a.edgeDensity.length;
    if (n !== 2 * result.model.parameters.cells) throw new Error("Invalid SSH site count");
    const positions = await dataset("sites", a.edgeDensity.flatMap((_, i) => [i, 0, 0]), 3, "site index");
    const scalars = await dataset("density", a.edgeDensity, 1, "probability per site");
    object("chain", "Open SSH chain", "polyline", positions, "#617888");
    object("edge-density", "Midgap-pair density (color)", "point-cloud", positions, "#79d9c1", { scalars });
    scene.objects[scene.objects.length - 1].style.size = .35;
    scene.coordinates = { handedness: "right", axes: ["site index", "display y", "display z"], units: ["site index", "dimensionless", "dimensionless"] };
    const center = (n - 1) / 2;
    scene.camera = { position: [center, -n * .45, n * .3], target: [center, 0, 0], up: [0, 0, 1] };
    scene.annotations.push({ id: "invariant", text: `Winding ${a.winding ?? "undefined"} · bulk gap ${a.bulkGap.toPrecision(5)} (normalized)`, position: [center, 0, 1] });
    // Two indexed ribbon meshes batch up to 79 bonds within the 64-object budget.
    // Width is categorical, not proportional to hopping, and implies no direction.
    for (const [parity, key, color] of [[0, "t1", "#f2b36f"], [1, "t2", "#79d9c1"]] as const) {
      const hopping = result.model.parameters[key];
      if (hopping === 0) continue;
      const vertices: number[] = [], triangles: number[] = [];
      for (let i = parity; i < n - 1; i += 2) {
        const offset = vertices.length / 3;
        vertices.push(i + .12, -.07, 0, i + .88, -.07, 0, i + .88, .07, 0, i + .12, .07, 0);
        triangles.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
      }
      object(`ssh-${key}-bonds`, `${key === "t1" ? "Intracell A–B / t₁" : "Intercell B–A / t₂"} = ${hopping}`, "mesh",
        await dataset(`${key}-bond-vertices`, vertices, 3, "site index / schematic width"), color,
        { indices: await dataset(`${key}-bond-triangles`, triangles, 3, "vertex index") });
    }
    // Hide the old unweighted connecting line: zero hoppings must leave gaps.
    scene.objects.find(o => o.id === "chain")!.visible = false;
    for (const [parity, label, color] of [[0, "A", "#f2b36f"], [1, "B", "#79d9c1"]] as const) {
      object(`sublattice-${label}`, `Sublattice ${label} guide (display row offset)`, "point-cloud",
        await dataset(`sublattice-${label}`, Array.from({ length: n / 2 }, (_, i) => [2 * i + parity, -.45, 0]).flat(), 3, "site index / display row offset"), color);
      scene.objects[scene.objects.length - 1].style.size = .2;
    }
    scene.annotations.push({ id: "sublattice-key", text: "A₀ B₀ | A₁ B₁ … · orange t₁, teal t₂ · bond width not hopping magnitude", position: [center, 0, -1.5] });
    scene.topology={quantities:[],invariants:[{id:"winding",label:"SSH winding",value:a.winding,status:a.winding===null?"undefined":"verified",method:"Worker phase criterion |t2| > |t1|, undefined at bulk gap closure"}],limitations:["Open-chain density is not Berry connection; the viewer does not derive winding."]};
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
    scene.topology={quantities:[{id:"lower-curvature",label:"Lower-band Berry curvature",kind:"berry-curvature",object:"berry-curvature",dataset:"curvature",convention:"Occupied lower band; curvature at cell centers; a=1; kx-major/ky-fastest"}],invariants:[{id:"chern",label:"Chern number",value:a.chern,status:a.meshResolved?"verified":"unresolved",method:"Worker FHS lattice result cross-checked against independent Dirac mass-sign phase diagram"}],limitations:["Curvature samples use midpoint quadrature, not the FHS plaquette array.","A coarse mesh can be unresolved; no invariant is inferred from the displayed surface.","No periodic seam interpolation or new Berry-connection computation."]};
    object("brillouin-boundary", "Brillouin-zone boundary at curvature height 0 (not a mesh seam)", "polyline",
      await dataset("bz-boundary", [-Math.PI, -Math.PI, 0, Math.PI, -Math.PI, 0, Math.PI, Math.PI, 0, -Math.PI, Math.PI, 0, -Math.PI, -Math.PI, 0], 3, "kx, ky, zero display height"), "#617888");
    for (const [id, values, label, position] of [
      ["kx-guide", [-Math.PI, -Math.PI, 0, Math.PI, -Math.PI, 0], "kx: −π → +π (rad/a)", [0, -Math.PI - .5, 0]],
      ["ky-guide", [-Math.PI, -Math.PI, 0, -Math.PI, Math.PI, 0], "ky: −π → +π (rad/a)", [-Math.PI - .5, 0, 0]],
      ["curvature-guide", [-Math.PI, -Math.PI, -height, -Math.PI, -Math.PI, height], "height = Berry curvature (a=1)", [-Math.PI, -Math.PI, height]],
    ] as const) {
      object(id, label, "polyline", await dataset(id, [...values], 3, "declared mixed scene units"), "#a7bbc4");
      scene.annotations.push({ id: `${id}-label`, text: label, position: [...position] });
    }
  } else throw new Error("Result/model analysis mismatch");
  if(result.operation === "topology" && result.model.type === "qwz") {
    const b=new SceneBuilder(scene,digest);
    Object.assign(b.payload.artifacts,artifacts);
    await addReciprocalGuides(b,"square","lattice constant a=1","rad / lattice constant");
    Object.assign(artifacts,b.payload.artifacts);
  }
  assertScene(scene);
  const payload = { scene, artifacts };
  await verifyScenePayload(payload, digest);
  return payload;
}
