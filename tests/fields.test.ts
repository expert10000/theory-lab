import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fixture from "../packages/quantum-scene/fixtures/complex-field.json";
import { assertScene, verifyScenePayload, type ScenePayload } from "../packages/quantum-scene";
import { fieldValues, gridIndex, gridPosition, isosurface, phaseColor, surfacePayload } from "../packages/quantum-3d/fields";
const digest = async (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
export function fieldFixture(): ScenePayload {
  const scene = structuredClone(fixture.scene); assertScene(scene);
  return { scene, artifacts: Object.fromEntries(Object.entries(fixture.values).map(([p,values])=>{
    const bytes = Buffer.alloc(values.length*8);values.forEach((v,i)=>bytes.writeDoubleLE(v,i*8));return [p,bytes];
  })) };
}
test("complex grid fixture verifies layout, exact derived quantities and bounds", async()=>{
  const payload=fieldFixture(),arrays=await verifyScenePayload(payload,digest),field=payload.scene.fields![0];
  const i=gridIndex(field.grid.shape,2,1,0);
  assert.deepEqual(gridPosition(field,2,1,0),[1,0,-1]);
  assert.equal(fieldValues(field,arrays,"density")[i],1);
  assert.equal(fieldValues(field,arrays,"real")[i],1);
  assert.equal(fieldValues(field,arrays,"imaginary")[i],0);
  assert.equal(fieldValues(field,arrays,"phase")[i],0);
  for(const mutate of [(f:any)=>f.grid.shape[0]=50,(f:any)=>f.grid.spacing[0]=0,(f:any)=>f.imaginary="missing",(f:any)=>f.grid.order="zyx",(f:any)=>f.kind="scalar-field"]){
    const bad=fieldFixture();mutate(bad.scene.fields![0]);assert.throws(()=>assertScene(bad.scene));
  }
  const corrupt=fieldFixture();corrupt.artifacts["real.f64"][0]^=1;await assert.rejects(verifyScenePayload(corrupt,digest),/integrity/);
});
test("marching tetrahedra reconstructs a plane and preserves phase branch continuity",async()=>{
  const payload=fieldFixture(),arrays=await verifyScenePayload(payload,digest),field=payload.scene.fields![0];
  const mesh=await isosurface(field,arrays.get("real")!,.3,arrays.get("real")!,arrays.get("imaginary")!);
  assert.ok(mesh.indices.length>0);
  for(let i=0;i<mesh.positions.length;i+=3)assert.ok(Math.abs(mesh.positions[i]-.3)<1e-12);
  const derived=await surfacePayload(payload,field,arrays,"phase",.4,digest);assert.ok(derived);
  await verifyScenePayload(derived,digest);assert.equal(derived.scene.objects[0].colorMap,"phase");
  assert.ok(phaseColor(Math.PI).every((v,i)=>Math.abs(v-phaseColor(-Math.PI)[i])<1e-12));
  await assert.rejects(isosurface(field,arrays.get("real")!,.3,arrays.get("real")!,undefined,()=>true),/cancelled/);
});
test("Gaussian density isosurface converges to its analytic radius without renormalization",async()=>{
  const field=fieldFixture().scene.fields![0];field.grid={shape:[21,21,21],origin:[-2,-2,-2],spacing:[.2,.2,.2],order:"xyz-z-fastest"};
  const real=Float64Array.from({length:21**3},(_,i)=>{const x=Math.floor(i/(21*21)),y=Math.floor(i/21)%21,z=i%21;const p=gridPosition(field,x,y,z);return Math.exp(-p.reduce((s,v)=>s+v*v,0)/2);});
  const density=Float64Array.from(real,v=>v*v),level=.2;
  const mesh=await isosurface(field,density,level,real,undefined);
  const radius=Math.sqrt(-Math.log(level));let drift=0;
  for(let i=0;i<mesh.positions.length;i+=3)drift=Math.max(drift,Math.abs(Math.hypot(...mesh.positions.slice(i,i+3))-radius));
  assert.ok(mesh.indices.length>0&&drift<.025,`radius interpolation error ${drift}`);
});
