import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import primitive from "../packages/quantum-scene/fixtures/bloch-vector.json";
import field from "../packages/quantum-scene/fixtures/complex-field.json";
import { assertScene, type ScenePayload } from "../packages/quantum-scene";
import { readSceneBundle, writeSceneBundle } from "../packages/quantum-scene/bundle";

function payload(fixture: typeof primitive | typeof field): ScenePayload {
  const scene = structuredClone(fixture.scene); assertScene(scene);
  const artifacts = Object.fromEntries(Object.entries(fixture.values).map(([path, values]) => {
    const data=Buffer.alloc(values.length*8);values.forEach((v,i)=>data.writeDoubleLE(v,i*8));return [path,data];
  }));
  return {scene,artifacts};
}
test("bundle import reads primitive and field scenes without altering files", async()=>{
  const root=await mkdtemp(join(tmpdir(),"qvis-import-"));
  try {
    for(const fixture of [primitive,field]) {
      const supplied=payload(fixture),directory=await writeSceneBundle(supplied,root);
      const before=await readFile(join(directory,"scene.json"));
      const imported=await readSceneBundle(directory);
      assert.deepEqual(imported.scene,supplied.scene);
      assert.deepEqual(imported.artifacts,supplied.artifacts);
      assert.deepEqual(await readFile(join(directory,"scene.json")),before);
    }
  } finally {await rm(root,{recursive:true,force:true});}
});
test("import rejects corruption, unknown files, traversal and excessive metadata", async()=>{
  const root=await mkdtemp(join(tmpdir(),"qvis-import-bad-"));
  let serial=0;
  async function fresh(){const p=payload(primitive);p.scene.id=`import-${serial++}`;return writeSceneBundle(p,root);}
  try {
    const extra=await fresh();await writeFile(join(extra,"extra.txt"),"not a dataset");
    await assert.rejects(readSceneBundle(extra),/unexpected/);
    const corrupt=await fresh(),corruptPath=join(corrupt,primitive.scene.datasets[0].path);
    const changed=await readFile(corruptPath);changed[0]^=1;await writeFile(corruptPath,changed);
    await assert.rejects(readSceneBundle(corrupt),/integrity/);
    const metadata=await fresh();await writeFile(join(metadata,"scene.json"),"{}".repeat(100000));
    await assert.rejects(readSceneBundle(metadata),/size/);
    const traversal=await fresh();
    const scene=JSON.parse(await readFile(join(traversal,"scene.json"),"utf8"));scene.datasets[0].path="../outside.f64";
    const bytes=Buffer.from(JSON.stringify(scene));await writeFile(join(traversal,"scene.json"),bytes);
    await writeFile(join(traversal,"bundle.json"),JSON.stringify({schema:"quantum-scene-bundle/v1",scene:{path:"scene.json",bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")}}));
    await assert.rejects(readSceneBundle(traversal),/scene|schema/i);
    const manifest=await fresh();await writeFile(join(manifest,"bundle.json"),JSON.stringify({schema:"quantum-scene-bundle/v1",scene:{path:"../scene.json",bytes:2,sha256:"a".repeat(64)}}));
    await assert.rejects(readSceneBundle(manifest),/manifest/);
  }finally{await rm(root,{recursive:true,force:true});}
});
test("bundle root junctions are rejected instead of following another directory",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qvis-import-link-"));
  try {
    const directory=await writeSceneBundle(payload(primitive),root),link=join(root,"linked.qscene");
    await symlink(directory,link,process.platform==="win32"?"junction":"dir");
    await assert.rejects(readSceneBundle(link),/not a link/);
  }finally{await rm(root,{recursive:true,force:true});}
});
