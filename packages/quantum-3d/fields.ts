import { type SceneField, type ScenePayload, type Vec3 } from "../quantum-scene";
export type FieldQuantity = "density" | "real" | "imaginary" | "phase";
export function gridIndex(shape: [number, number, number], x: number, y: number, z: number) {
  return (x * shape[1] + y) * shape[2] + z;
}
export function gridPosition(field: SceneField, x: number, y: number, z: number): Vec3 {
  return [x, y, z].map((v, a) => field.grid.origin[a] + v * field.grid.spacing[a]) as Vec3;
}
export function fieldValues(field: SceneField, arrays: Map<string, Float64Array>, quantity: FieldQuantity) {
  const real = arrays.get(field.real)!, imaginary = field.imaginary ? arrays.get(field.imaginary)! : undefined;
  if (field.kind === "scalar-field") {
    if (quantity !== "real") throw new Error("Scalar fields expose their supplied scalar value only");
    return real;
  }
  return Float64Array.from(real, (r, i) => {
    const im = imaginary![i];
    if (quantity === "real") return r;
    if (quantity === "imaginary") return im;
    if (quantity === "density") return r * r + im * im;
    return Math.atan2(im, r);
  });
}
export function phaseColor(phase: number): [number, number, number] {
  const h = ((phase / (2 * Math.PI) + 1) % 1) * 6;
  const x = 1 - Math.abs(h % 2 - 1);
  return h < 1 ? [1, x, 0] : h < 2 ? [x, 1, 0] : h < 3 ? [0, 1, x] : h < 4 ? [0, x, 1] : h < 5 ? [x, 0, 1] : [1, 0, x];
}
const corners = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const tetrahedra = [[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6],[0,5,1,6]];
export interface FieldMesh { positions: number[]; indices: number[]; phases: number[] }
// Piecewise-linear marching tetrahedra. No periodic seam, smoothing or claim of
// exact nodal geometry. Work yields between slabs and has a hard triangle budget.
export async function isosurface(field: SceneField, values: Float64Array, level: number,
  real: Float64Array, imaginary: Float64Array | undefined, cancelled = () => false): Promise<FieldMesh> {
  const mesh: FieldMesh = { positions: [], indices: [], phases: [] };
  const [nx,ny,nz] = field.grid.shape;
  for (let x = 0; x < nx - 1; x++) {
    if (cancelled()) throw new Error("Surface generation cancelled");
    for (let y = 0; y < ny - 1; y++) for (let z = 0; z < nz - 1; z++) {
      const nodes = corners.map(([dx,dy,dz]) => gridIndex(field.grid.shape, x+dx,y+dy,z+dz));
      for (const tetra of tetrahedra) {
        const inside = tetra.filter(c => values[nodes[c]] >= level), outside = tetra.filter(c => values[nodes[c]] < level);
        if (!inside.length || !outside.length) continue;
        const edge = (a: number, b: number) => {
          const ai = nodes[a], bi = nodes[b], fraction = (level-values[ai])/(values[bi]-values[ai]);
          const p = gridPosition(field,x+corners[a][0],y+corners[a][1],z+corners[a][2]);
          const q = gridPosition(field,x+corners[b][0],y+corners[b][1],z+corners[b][2]);
          const r = real[ai]*(1-fraction)+real[bi]*fraction;
          const im = imaginary ? imaginary[ai]*(1-fraction)+imaginary[bi]*fraction : 0;
          return { p: p.map((v,i) => v+(q[i]-v)*fraction) as Vec3, phase: Math.atan2(im,r) };
        };
        const triangles = inside.length === 2 ? [
          [edge(inside[0],outside[0]),edge(inside[0],outside[1]),edge(inside[1],outside[0])],
          [edge(inside[0],outside[1]),edge(inside[1],outside[1]),edge(inside[1],outside[0])],
        ] : [(inside.length === 1 ? outside.map(b => edge(inside[0],b)) : inside.map(a => edge(a,outside[0])))];
        for (const triangle of triangles) {
          const [a,b,c] = triangle.map(t => t.p);
          const u = b.map((v,i)=>v-a[i]), v = c.map((n,i)=>n-a[i]);
          if (Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]) < 1e-14) continue;
          if (mesh.indices.length / 3 >= 60000) throw new Error("Surface exceeds 60,000 triangles; increase threshold or reduce grid");
          for (const t of triangle) { mesh.indices.push(mesh.positions.length / 3); mesh.positions.push(...t.p); mesh.phases.push(t.phase); }
        }
      }
    }
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  return mesh;
}
export async function surfacePayload(source: ScenePayload, field: SceneField, arrays: Map<string, Float64Array>, quantity: FieldQuantity,
  fraction: number, digest: (bytes: Uint8Array) => Promise<string>, cancelled = () => false): Promise<ScenePayload | null> {
  // Phase has no meaningful scalar isosurface across its branch cut: use density
  // for geometry and interpolate complex amplitudes before phase-coloring.
  const values = fieldValues(field, arrays, quantity === "phase" ? "density" : quantity);
  let maximum = 0; for (const v of values) maximum = Math.max(maximum, Math.abs(v));
  if (!maximum) return null;
  const level = maximum * fraction;
  const real = arrays.get(field.real)!, imaginary = field.imaginary ? arrays.get(field.imaginary)! : undefined;
  const levels = quantity === "real" || quantity === "imaginary" ? [level,-level] : [level];
  const scene = { ...source.scene, fields: undefined, objects: [], datasets: [], annotations: source.scene.annotations } as ScenePayload["scene"];
  // Omit absent optional property (strict schema does not accept undefined).
  delete scene.fields;
  const payload: ScenePayload = { scene, artifacts: {} };
  for (let part = 0; part < levels.length; part++) {
    const mesh = await isosurface(field,values,levels[part],real,imaginary,cancelled);
    if (!mesh.indices.length) continue;
    for (const [name, data, components, unit] of [[`vertices-${part}`,mesh.positions,3,"scene coordinates"],[`indices-${part}`,mesh.indices,3,"vertex index"], ...(quantity === "phase" ? [[`phase-${part}`,mesh.phases,1,"rad"]] : [])] as [string,number[],1|3,string][]) {
      const bytes = new Uint8Array(data.length*8), view = new DataView(bytes.buffer);
      data.forEach((v,i)=>view.setFloat64(i*8,v,true)); payload.artifacts[`${name}.f64`] = bytes;
      scene.datasets.push({id:name,path:`${name}.f64`,format:"f64le",components,count:data.length/components,unit,bytes:bytes.length,sha256:await digest(bytes)});
    }
    scene.objects.push({id:`surface-${part}`,label:`${quantity === "phase" ? "Density surface / phase color" : quantity} = ${levels[part].toPrecision(5)}`,
      kind:"mesh",positions:`vertices-${part}`,indices:`indices-${part}`, ...(quantity === "phase" ? {scalars:`phase-${part}`} : {}),
      visible:true,...(quantity==="phase"?{colorMap:"phase" as const}:{}),style:{color:part ? "#5995f0" : "#f5b269",opacity:1,size:1}});
  }
  return scene.objects.length ? payload : null;
}
