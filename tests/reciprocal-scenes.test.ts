import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {sceneExample, type LatticeFamily} from "../packages/quantum-scene/examples";
import {assertScene,verifyScenePayload} from "../packages/quantum-scene";
import {writeSceneBundle,readSceneBundle} from "../packages/quantum-scene/bundle";
const digest=async(b:Uint8Array)=>createHash("sha256").update(b).digest("hex");
test("explicit primitive reciprocal fixtures preserve 2pi duality, symmetry points and paths offline",async()=>{
 const root=await mkdtemp(join(tmpdir(),"qvis-reciprocal-"));
 try {for(const family of ["square","honeycomb","simple_cubic"] as LatticeFamily[]) {
  const p=await sceneExample({family,repeats:[1,1,1],view:"reciprocal"},digest),r=p.scene.reciprocal!;
  const fixture=JSON.parse(await readFile(`packages/quantum-scene/fixtures/reciprocal-${family}.json`,"utf8"));assert.deepEqual(p.scene,fixture.scene);
  r.directBasis.forEach((a,i)=>r.basis.forEach((b,j)=>assert.ok(Math.abs(a.reduce((s,v,k)=>s+v*b[k],0)-(i===j?2*Math.PI:0))<1e-12)));
  assert.deepEqual((await readSceneBundle(await writeSceneBundle(p,root))).scene,p.scene);
  assert.equal((await sceneExample({family,repeats:[8,8,family==="simple_cubic"?8:1],view:"reciprocal"},digest)).scene.id,p.scene.id,"primitive zone does not depend on supercell repeat count");
  const bad=structuredClone(p.scene);bad.reciprocal!.basis[0][0]+=.1;assert.throws(()=>assertScene(bad),/not dual/);
  const reference=structuredClone(p.scene);reference.reciprocal!.paths[0].points[0]="unknown";assert.throws(()=>assertScene(reference),/path mismatch/);
  const changed=structuredClone(p);const d=changed.scene.datasets.find(d=>d.id==="symmetry-points")!;new DataView(changed.artifacts[d.path].buffer).setFloat64(0,.2,true);d.sha256=await digest(changed.artifacts[d.path]);await assert.rejects(verifyScenePayload(changed,digest),/coordinates disagree/);
 }}finally{await rm(root,{recursive:true,force:true});}
});
