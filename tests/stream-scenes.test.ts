import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import fixture from "../packages/quantum-scene/fixtures/complex-field.json";
import {assertScene,type ScenePayload} from "../packages/quantum-scene";
import {assertStream,SceneChunkLoader,makeSceneStream,STREAM_CACHE_BYTES} from "../packages/quantum-scene/stream";
import {scenePreview} from "../packages/quantum-scene/lod";
import {writeStreamBundle,openStreamBundle} from "../packages/quantum-scene/stream-bundle";
import {SceneBuilder} from "../packages/quantum-scene/builder";
const digest=async(b:Uint8Array)=>createHash("sha256").update(b).digest("hex");
function field():ScenePayload{const scene:unknown=structuredClone(fixture.scene);assertScene(scene);return{scene,artifacts:Object.fromEntries(Object.entries(fixture.values).map(([p,v])=>{const b=Buffer.alloc(v.length*8);v.forEach((n,i)=>b.writeDoubleLE(n,i*8));return[p,new Uint8Array(b)];}))};}
test("chunked field levels are lazy, cancellable, cache-bounded and lossless at full detail",async()=>{
  const full=field(),preview=await scenePreview(full,digest),s=await makeSceneStream([{label:"Display subset",payload:preview},{label:"Full samples",payload:full}],digest);let reads=0;
  const loader=new SceneChunkLoader(s.manifest,async(path)=>{reads++;return s.chunks[path];},digest);assert.equal(reads,0);const coarse=await loader.load(0,new AbortController().signal);assert.deepEqual(coarse.scene,preview.scene);const after=reads;await loader.load(0,new AbortController().signal);assert.equal(reads,after);
  const original=await loader.load(1,new AbortController().signal);assert.deepEqual(original,full);assert.ok(loader.cacheBytes<=STREAM_CACHE_BYTES);
  const c=new AbortController();c.abort();await assert.rejects(loader.load(1,c.signal),/abort/i);
  const cancelled=new SceneChunkLoader(s.manifest,async path=>{c2.abort();return s.chunks[path];},digest),c2=new AbortController();await assert.rejects(cancelled.load(1,c2.signal),/abort/i);
  const bad=structuredClone(s.manifest);bad.levels[0].parts[0].chunks[0]="../secret";assert.throws(()=>assertStream(bad));
  const forged=structuredClone(s.chunks);forged[s.manifest.chunks[0].path][0]^=1;const corrupt=new SceneChunkLoader(s.manifest,async p=>forged[p],digest);await assert.rejects(corrupt.load(0,new AbortController().signal),/integrity/);assert.equal(corrupt.cacheBytes,0);
  loader.clear();assert.equal(loader.cacheBytes,0);
});
test("stream bundle checks metadata/files early, unread chunk hashes lazily and rejects overwrites",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qvis-stream-"));try{const p=field(),s=await makeSceneStream([{label:"Full samples",payload:p}],digest),folder=await writeStreamBundle(s,root);await assert.rejects(writeStreamBundle(s,root));const opened=await openStreamBundle(folder),loader=new SceneChunkLoader(opened.manifest,p=>opened.read(p),digest);assert.deepEqual(await loader.load(0,new AbortController().signal),p);
    await writeFile(join(folder,s.manifest.chunks[0].path),Buffer.alloc(s.manifest.chunks[0].bytes));const lazy=await openStreamBundle(folder);await assert.rejects(lazy.read(s.manifest.chunks[0].path),/integrity/);
    await writeFile(join(folder,"unlisted.txt"),"no");await assert.rejects(openStreamBundle(folder),/unexpected/);
  }finally{await rm(root,{recursive:true,force:true});}
});
test("LRU evicts old verified chunks instead of accumulating a full large dataset",async()=>{
  const scene=structuredClone(field().scene);delete scene.fields;scene.datasets=[];scene.objects=[];
  const b=new SceneBuilder(scene,digest),positions=await b.data("large-points",Array.from({length:600000},(_,i)=>i%3===0?Math.floor(i/3):0),3,"synthetic test spacing");b.object("points","Large supplied test points","point-cloud",positions,"#79d9c1");
  const payload=await b.finish(),s=await makeSceneStream([{label:"Full points",payload}],digest);let reads=0;
  const loader=new SceneChunkLoader(s.manifest,async p=>{reads++;return s.chunks[p];},digest);await loader.load(0,new AbortController().signal);assert.ok(loader.cacheBytes<=STREAM_CACHE_BYTES&&loader.cacheBytes>3*1024*1024);const first=reads;await loader.load(0,new AbortController().signal);assert.ok(reads>first);assert.ok(loader.cacheBytes<=STREAM_CACHE_BYTES);
});
