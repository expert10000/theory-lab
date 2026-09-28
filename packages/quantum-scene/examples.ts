import { SceneBuilder, type SceneDigest } from "./builder";
import { addReciprocalGuides } from "./reciprocal";
import type { QuantumScene, Vec3 } from "./index";
import {latticeDefinition, type LatticeFamily} from "./lattice-definition";
export type {LatticeFamily} from "./lattice-definition";
export interface SceneExampleRequest {
  family: LatticeFamily;
  repeats: [number, number, number];
  view?: "real" | "reciprocal";
}
export function assertExampleRequest(
  value: unknown,
): asserts value is SceneExampleRequest {
  const v = value as SceneExampleRequest;
  if (
    !v ||
    typeof v !== "object" ||
    !["family,repeats","family,repeats,view"].includes(Object.keys(v).sort().join(",")) ||
    (v.view !== undefined && !["real","reciprocal"].includes(v.view)) ||
    !["square", "honeycomb", "simple_cubic"].includes(v.family) ||
    !Array.isArray(v.repeats) ||
    v.repeats.length !== 3 ||
    !v.repeats.every((n) => Number.isInteger(n) && n >= 1 && n <= 8) ||
    (v.family !== "simple_cubic" && v.repeats[2] !== 1)
  )
    throw new Error(
      "Invalid geometry example: supported family, repeats 1…8, planar z=1; no paths or extra fields",
    );
}
export async function sceneExample(
  request: SceneExampleRequest,
  digest: SceneDigest,
) {
  assertExampleRequest(request);
  if(request.view === "reciprocal") return reciprocalExample(request,digest);
  const descriptor = JSON.stringify({
    schema: "qvis-geometry-example/1",
    family: request.family,
    repeats: request.repeats,
  });
  const hash = await digest(new TextEncoder().encode(descriptor)),
    id = `fixture-${hash.slice(0, 24)}`;
  const def = latticeDefinition(request.family),
    [nx, ny, nz] = request.repeats;
  const scene: QuantumScene = {
    schema: "quantum-scene/v1",
    id,
    title: `${request.family.replaceAll("_", " ")} · ${nx}×${ny}×${nz} open geometry fixture`,
    provenance: {
      kind: "geometry-fixture",
      runId: id,
      jobId: id,
      model: request.family,
      engine: "geometry",
      engineVersion: "qvis/1",
      computedAt: "not applicable (no calculation)",
      resultSha256: hash,
      adapter: "qvis/1",
      parameters: { nx, ny, nz },
    },
    coordinates: {
      handedness: "right",
      axes: ["x", "y", "z"],
      units: [
        "schematic nearest-neighbor spacing",
        "schematic nearest-neighbor spacing",
        "schematic nearest-neighbor spacing",
      ],
    },
    camera: { position: [8, -8, 7], target: [0, 0, 0], up: [0, 0, 1] },
    objects: [],
    datasets: [],
    annotations: [],
  };
  const b = new SceneBuilder(scene, digest),
    sites: number[] = [],
    cells: number[] = [],
    basisIndices: number[] = [];
  const location = (cell: number[], basis = 0): Vec3 =>
    [0, 1, 2].map(
      (axis) =>
        def.basis[basis].position[axis] +
        def.translations.reduce((v, t, i) => v + t[axis] * cell[i], 0),
    ) as Vec3;
  const inBox = ([x, y, z]: number[]) =>
    x >= 0 && x < nx && y >= 0 && y < ny && z >= 0 && z < nz;
  const bonds: number[] = [],
    edges: number[] = [];
  const link = (
    cell: number[],
    basis: number,
    neighbor: number[],
    other: number,
  ) => {
    if (inBox(neighbor))
      bonds.push(...location(cell, basis), ...location(neighbor, other));
  };
  for (let x = 0; x < nx; x++)
    for (let y = 0; y < ny; y++)
      for (let z = 0; z < nz; z++) {
        const cell = [x, y, z];
        def.basis.forEach((_, i) => {
          sites.push(...location(cell, i));
          cells.push(...cell);
          basisIndices.push(i);
        });
        if (request.family === "honeycomb") {
          link(cell, 0, cell, 1);
          link(cell, 0, [x, y - 1, z], 1);
          link(cell, 0, [x + 1, y - 1, z], 1);
        } else
          for (let axis = 0; axis < def.dimensions; axis++) {
            const next = [...cell];
            next[axis]++;
            link(cell, 0, next, 0);
          }
        // Every primitive-cell edge, batched; duplicates shared by cells are harmless.
        for (let mask = 0; mask < 2 ** def.dimensions; mask++)
          for (let axis = 0; axis < def.dimensions; axis++)
            if (!(mask & (1 << axis))) {
              const from = cell.map((v, i) => v + ((mask >> i) & 1)),
                to = [...from];
              to[axis]++;
              edges.push(...location(from), ...location(to));
            }
      }
  const positions = await b.data(
      "lattice-sites",
      sites,
      3,
      scene.coordinates.units[0],
    ),
    cellRef = await b.data(
      "site-cells",
      cells,
      3,
      "integer primitive cell indices",
    ),
    basisRef = await b.data(
      "site-basis",
      basisIndices,
      1,
      "integer basis index",
    );
  scene.lattice = {
    ...def,
    repeats: [...request.repeats],
    boundary: "open",
    sites: positions,
    cells: cellRef,
    basisIndices: basisRef,
  };
  b.object(
    "lattice-sites-object",
    "Sites · color = basis index (A=0, B=1)",
    "point-cloud",
    positions,
    "#79d9c1",
    { scalars: basisRef },
  );
  if (bonds.length)
    b.object(
      "lattice-bonds",
      "Nearest-neighbor geometric bonds · no hopping strength",
      "segments",
      await b.data("lattice-bonds", bonds, 3, scene.coordinates.units[0]),
      "#79d9c1",
    );
  b.object(
    "unit-cells",
    "Primitive cell wireframes",
    "segments",
    await b.data("unit-cell-edges", edges, 3, scene.coordinates.units[0]),
    "#526875",
  );
  for (let axis = 0; axis < def.dimensions; axis++) {
    b.object(
      `translation-${axis}`,
      `Translation a${axis + 1}`,
      "vectors",
      await b.data(`origin-${axis}`, [0, 0, 0], 3, scene.coordinates.units[0]),
      "#f2b36f",
      {
        values: await b.data(
          `translation-${axis}`,
          def.translations[axis],
          3,
          scene.coordinates.units[0],
        ),
      },
    );
    scene.annotations.push({
      id: `translation-label-${axis}`,
      text: `a${axis + 1}`,
      position: def.translations[axis],
    });
  }
  const center = [0, 1, 2].map(
    (axis) =>
      sites.filter((_, i) => i % 3 === axis).reduce((s, v) => s + v, 0) /
      (sites.length / 3),
  ) as Vec3;
  const size = Math.max(3, nx * 2, ny * 2, nz * 2);
  scene.camera = {
    position: [center[0] + size, center[1] - size, center[2] + size * 0.9],
    target: center,
    up: [0, 0, 1],
  };
  scene.annotations.push({
    id: "fixture-note",
    text: "Geometry fixture · open boundaries · no Hamiltonian, atom species or worker job",
    position: [center[0], center[1], center[2] + 1],
  });
  return b.finish();
}
async function reciprocalExample(request:SceneExampleRequest,digest:SceneDigest) {
  const hash=await digest(new TextEncoder().encode(JSON.stringify({schema:"qvis-reciprocal-example/1",family:request.family}))),id=`fixture-${hash.slice(0,24)}`;
  const scene:QuantumScene={schema:"quantum-scene/v1",id,title:`${request.family.replaceAll("_"," ")} · primitive reciprocal fixture`,
    provenance:{kind:"geometry-fixture",runId:id,jobId:id,model:request.family,engine:"geometry",engineVersion:"qvis/1",computedAt:"not applicable (no calculation)",resultSha256:hash,adapter:"qvis/1",parameters:{zone:"primitive",convention:"ai dot bj = 2pi deltaij"}},
    coordinates:{handedness:"right",axes:["kx","ky","kz"],units:["rad / schematic primitive spacing","rad / schematic primitive spacing","rad / schematic primitive spacing"]},
    camera:{position:[12,-10,10],target:[0,0,0],up:[0,0,1]},objects:[],datasets:[],annotations:[]};
  const b=new SceneBuilder(scene,digest);
  await addReciprocalGuides(b,request.family);
  scene.annotations.push({id:"primitive-zone-note",text:"Supplied primitive zone · repeats do not fold the zone · geometry only",position:[0,0,-1]});
  return b.finish();
}
