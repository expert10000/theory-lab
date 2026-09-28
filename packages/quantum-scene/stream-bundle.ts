import {createHash} from "node:crypto";
import {lstat,mkdir,readdir,writeFile,rm} from "node:fs/promises";
import {join} from "node:path";
import {boundedRead} from "./bundle";
import {assertStream,MAX_STREAM_METADATA,SceneChunkLoader,type SceneStream} from "./stream";
const hash=(b:Uint8Array)=>createHash("sha256").update(b).digest("hex");
export async function writeStreamBundle(stream:{manifest:SceneStream;chunks:Record<string,Uint8Array>},parent:string){
  assertStream(stream.manifest);if(Object.keys(stream.chunks).length!==stream.manifest.chunks.length)throw new Error("Unexpected stream artifacts");
  const bytes=Buffer.from(JSON.stringify(stream.manifest));if(bytes.length>MAX_STREAM_METADATA)throw new Error("Stream metadata budget exceeded");
  const verifier=new SceneChunkLoader(stream.manifest,async path=>stream.chunks[path],async b=>hash(b));
  for(let i=0;i<stream.manifest.levels.length;i++)await verifier.load(i,new AbortController().signal);verifier.clear();
  const directory=join(parent,`${stream.manifest.levels.at(-1)!.scene.id}-lod.qscene`);await mkdir(directory,{recursive:false});
  try {for(const c of stream.manifest.chunks){const data=stream.chunks[c.path];if(!data||data.length!==c.bytes||hash(data)!==c.sha256)throw new Error("Stream chunk integrity failed");await writeFile(join(directory,c.path),data,{flag:"wx"});}
    await writeFile(join(directory,"stream.json"),bytes,{flag:"wx"});await writeFile(join(directory,"bundle.json"),JSON.stringify({schema:"quantum-scene-stream-bundle/v1",stream:{path:"stream.json",bytes:bytes.length,sha256:hash(bytes)}}),{flag:"wx"});return directory;
  }catch(e){await rm(directory,{recursive:true,force:true});throw e;}
}
export async function openStreamBundle(directory:string){
  const root=await lstat(directory);if(!root.isDirectory()||root.isSymbolicLink())throw new Error("Stream root must be a directory, not a link");
  const bundle=JSON.parse((await boundedRead(join(directory,"bundle.json"))).toString("utf8")),s=bundle.stream;
  if(bundle.schema!=="quantum-scene-stream-bundle/v1"||Object.keys(bundle).sort().join(",")!=="schema,stream"||!s||Object.keys(s).sort().join(",")!=="bytes,path,sha256"||s.path!=="stream.json"||!Number.isInteger(s.bytes)||s.bytes<1||s.bytes>MAX_STREAM_METADATA||typeof s.sha256!=="string"||!/^[a-f0-9]{64}$/.test(s.sha256))throw new Error("Invalid stream bundle manifest");
  const bytes=await boundedRead(join(directory,"stream.json"),s.bytes);if(hash(bytes)!==s.sha256)throw new Error("Stream metadata integrity failed");const manifest:unknown=JSON.parse(bytes.toString("utf8"));assertStream(manifest);
  const expected=new Set(["bundle.json","stream.json",...manifest.chunks.map(c=>c.path)]),entries=await readdir(directory,{withFileTypes:true});if(entries.length!==expected.size||entries.some(e=>!e.isFile()||e.isSymbolicLink()||!expected.has(e.name)))throw new Error("Missing, unexpected or linked stream files");
  return {manifest,read:async(path:string)=>{const c=manifest.chunks.find(c=>c.path===path);if(!c)throw new Error("Unknown stream chunk");const info=await lstat(directory);if(info.isSymbolicLink()||info.dev!==root.dev||info.ino!==root.ino)throw new Error("Stream root changed");const b=await boundedRead(join(directory,path),c.bytes);if(hash(b)!==c.sha256)throw new Error("Stream chunk integrity failed");return new Uint8Array(b);}};
}
