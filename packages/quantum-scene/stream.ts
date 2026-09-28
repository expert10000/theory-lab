import {assertScene,verifyScenePayload,type QuantumScene,type ScenePayload} from "./index";

export const STREAM_CHUNK_BYTES=64*1024, STREAM_CACHE_BYTES=4*1024*1024;
export const MAX_STREAM_BYTES=64*1024*1024, MAX_STREAM_METADATA=1024*1024;
export interface SceneStream {
  schema:"quantum-scene-stream/v1";
  levels:{id:string;label:string;scene:QuantumScene;parts:{dataset:string;chunks:string[]}[]}[];
  chunks:{path:string;bytes:number;sha256:string}[];
}
const keys=(v:any,expected:string[])=>v&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).sort().join(",")===expected.sort().join(",");
export function assertStream(value:unknown):asserts value is SceneStream {
  const s=value as SceneStream;
  if(!keys(s,["schema","levels","chunks"])||s.schema!=="quantum-scene-stream/v1"||!Array.isArray(s.levels)||s.levels.length<1||s.levels.length>8||!Array.isArray(s.chunks)||s.chunks.length<1||s.chunks.length>1024) throw new Error("Invalid scene stream manifest");
  const chunks=new Map<string,SceneStream["chunks"][number]>();let total=0;
  for(const c of s.chunks){if(!keys(c,["path","bytes","sha256"])||typeof c.sha256!=="string"||!/^[a-f0-9]{64}$/.test(c.sha256)||c.path!==`chunk-${c.sha256}.f64`||!Number.isInteger(c.bytes)||c.bytes<8||c.bytes>STREAM_CHUNK_BYTES||c.bytes%8||chunks.has(c.path))throw new Error("Invalid stream chunk");chunks.set(c.path,c);total+=c.bytes;}
  if(total>MAX_STREAM_BYTES)throw new Error("Stream exceeds disk budget");
  const ids=new Set<string>(),used=new Set<string>();let previous=0;
  for(const l of s.levels){
    if(!keys(l,["id","label","scene","parts"])||typeof l.id!=="string"||!/^[A-Za-z0-9_-]{1,32}$/.test(l.id)||ids.has(l.id)||typeof l.label!=="string"||!l.label.length||l.label.length>240||!Array.isArray(l.parts))throw new Error("Invalid stream level");ids.add(l.id);assertScene(l.scene);
    const size=l.scene.datasets.reduce((n,d)=>n+d.bytes,0);if(size<previous)throw new Error("LOD levels must have nondecreasing byte counts");previous=size;
    if(l.parts.length!==l.scene.datasets.length)throw new Error("Stream dataset mapping mismatch");const refs=new Set<string>();
    for(const p of l.parts){const d=l.scene.datasets.find(d=>d.id===p.dataset);if(!keys(p,["dataset","chunks"])||!d||refs.has(p.dataset)||!Array.isArray(p.chunks)||!p.chunks.length||p.chunks.length>256)throw new Error("Invalid stream dataset parts");refs.add(p.dataset);let bytes=0;for(const path of p.chunks){const c=chunks.get(path);if(!c)throw new Error("Missing stream chunk");used.add(path);bytes+=c.bytes;}if(bytes!==d.bytes)throw new Error("Stream chunk/dataset size mismatch");}
  }
  if(used.size!==chunks.size)throw new Error("Unused stream chunks");
  if(new TextEncoder().encode(JSON.stringify(s)).byteLength>MAX_STREAM_METADATA)throw new Error("Stream metadata budget exceeded");
}
export class SceneChunkLoader {
  private cache=new Map<string,Uint8Array>();private used=0;
  constructor(readonly manifest:SceneStream,private read:(path:string,signal:AbortSignal)=>Promise<Uint8Array>,private digest:(bytes:Uint8Array)=>Promise<string>){assertStream(manifest);this.manifest=structuredClone(manifest);}
  get cacheBytes(){return this.used;}
  clear(){this.cache.clear();this.used=0;}
  async load(level:number,signal:AbortSignal,onProgress:(done:number,total:number)=>void=()=>{}):Promise<ScenePayload>{
    const l=this.manifest.levels[level];if(!Number.isInteger(level)||!l)throw new Error("Invalid scene level");signal.throwIfAborted();
    const artifacts:Record<string,Uint8Array>={}, total=l.parts.reduce((n,p)=>n+p.chunks.length,0);let done=0;
    for(const p of l.parts){const d=l.scene.datasets.find(d=>d.id===p.dataset)!,data=new Uint8Array(d.bytes);let offset=0;
      for(const path of p.chunks){signal.throwIfAborted();let bytes=this.cache.get(path);if(bytes){this.cache.delete(path);this.cache.set(path,bytes);}else{
        const descriptor=this.manifest.chunks.find(c=>c.path===path)!;bytes=await this.read(path,signal);signal.throwIfAborted();
        if(!(bytes instanceof Uint8Array)||bytes.byteLength!==descriptor.bytes||await this.digest(bytes)!==descriptor.sha256)throw new Error("Stream chunk integrity failed");signal.throwIfAborted();bytes=new Uint8Array(bytes);
        while(this.used+bytes.length>STREAM_CACHE_BYTES){const oldest=this.cache.keys().next().value!;this.used-=this.cache.get(oldest)!.length;this.cache.delete(oldest);}this.cache.set(path,bytes);this.used+=bytes.length;
      }data.set(bytes,offset);offset+=bytes.length;onProgress(++done,total);}
      artifacts[d.path]=data;
    }
    const payload={scene:structuredClone(l.scene),artifacts};await verifyScenePayload(payload,this.digest);signal.throwIfAborted();return payload;
  }
}
export async function makeSceneStream(levels:{label:string;payload:ScenePayload}[],digest:(bytes:Uint8Array)=>Promise<string>){
  const manifest:SceneStream={schema:"quantum-scene-stream/v1",levels:[],chunks:[]},chunks:Record<string,Uint8Array>={};
  for(const [i,l] of levels.entries()) {await verifyScenePayload(l.payload,digest);const parts:SceneStream["levels"][number]["parts"]=[];
    for(const d of l.payload.scene.datasets){const refs:string[]=[],bytes=l.payload.artifacts[d.path];for(let offset=0;offset<bytes.length;offset+=STREAM_CHUNK_BYTES){const chunk=bytes.slice(offset,offset+STREAM_CHUNK_BYTES),sha256=await digest(chunk),path=`chunk-${sha256}.f64`;if(!chunks[path]){chunks[path]=chunk;manifest.chunks.push({path,sha256,bytes:chunk.length});}refs.push(path);}parts.push({dataset:d.id,chunks:refs});}
    manifest.levels.push({id:`level-${i}`,label:l.label,scene:structuredClone(l.payload.scene),parts});
  }assertStream(manifest);return {manifest,chunks};
}
