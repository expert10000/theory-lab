import React,{useEffect,useMemo,useRef,useState} from "react";
import {SceneChunkLoader,type SceneStream} from "../quantum-scene/stream";
import type {ScenePayload} from "../quantum-scene";
import {SceneViewer,browserSceneDigest} from "./SceneViewer";
import {FieldViewer} from "./FieldViewer";

export interface SceneStreamSource {manifest:SceneStream;read:(path:string,signal:AbortSignal)=>Promise<Uint8Array>}
export function StreamViewer({source}:{source:SceneStreamSource}) {
  const loader=useMemo(()=>new SceneChunkLoader(source.manifest,source.read,browserSceneDigest),[source]),controller=useRef<AbortController|null>(null),sequence=useRef(0);
  const [payload,setPayload]=useState<ScenePayload|null>(null),[shown,setShown]=useState(-1),[selected,setSelected]=useState(0),[loading,setLoading]=useState(false),[progress,setProgress]=useState(""),[error,setError]=useState("");
  async function load(level:number){controller.current?.abort();const c=new AbortController();controller.current=c;const serial=++sequence.current;setLoading(true);setError("");setProgress("Verifying selected level…");
    try{const p=await loader.load(level,c.signal,(done,total)=>{if(serial===sequence.current)setProgress(`Verified parts ${done}/${total}`);});if(serial===sequence.current){setPayload(p);setShown(level);setSelected(level);setProgress("Selected level verified");}}
    catch(e){if(serial===sequence.current){if(c.signal.aborted)setProgress("Loading cancelled · previous verified view retained");else setError(e instanceof Error?e.message:String(e));}}
    finally{if(serial===sequence.current)setLoading(false);}
  }
  useEffect(()=>{setPayload(null);setShown(-1);setSelected(0);void load(0);return()=>{sequence.current++;controller.current?.abort();loader.clear();};},[loader]);
  return <section data-testid="stream-viewer" className="scene-viewer"><h3>Chunked multilevel scene</h3>
    <div className="scene-run-controls"><label>Detail level<select aria-label="Scene detail level" value={selected} onChange={e=>setSelected(Number(e.target.value))}>{source.manifest.levels.map((l,i)=><option key={l.id} value={i}>{l.label}</option>)}</select></label>
      <button disabled={loading} onClick={()=>void load(selected)}>Load selected level</button><button data-testid="refine-scene" disabled={loading||shown<0||shown>=source.manifest.levels.length-1} onClick={()=>void load(shown+1)}>Refine scene</button>
      <button data-testid="cancel-scene-load" disabled={!loading} onClick={()=>controller.current?.abort()}>Cancel loading</button>
    </div><p role="status" data-testid="stream-status">{progress} · displayed: {shown<0?"none":source.manifest.levels[shown].label} · verified cache {loader.cacheBytes.toLocaleString()} bytes</p>
    <p>Preview is a retained-sample display subset, not a new calculation. Chunks are checked lazily; unread levels are not yet verified. Cache is capped at 4 MiB, each decoded level at 16 MiB; rendering/decoder buffers add overhead.</p>
    {error&&<p role="alert">{error} · previous verified view retained</p>}
    {payload&&(payload.scene.fields?.length?<FieldViewer key={payload.scene.id} payload={payload}/>:<SceneViewer key={payload.scene.id} payload={payload}/>)}
    {payload&&<details><summary>Displayed level provenance</summary><pre>{JSON.stringify(payload.scene.provenance,null,2)}</pre></details>}
  </section>;
}
