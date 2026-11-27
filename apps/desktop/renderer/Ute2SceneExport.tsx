import React,{useState} from "react";
import type {Ute2SceneKind} from "../../../packages/quantum-scene/ute2";

export function Ute2SceneExport({kind,runId}:{kind:Ute2SceneKind;runId:string}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  async function publish() {
    if(busy)return;
    setBusy(true);setMessage("");setError("");
    try {
      const path=await window.quantum.exportUte2Scene(kind,runId);
      if(path)setMessage(`Exported verified scene bundle: ${path}`);
    } catch(cause) {setError(cause instanceof Error?cause.message:String(cause));}
    finally {setBusy(false);}
  }
  return <div className="dynamics-actions">
    <button type="button" data-testid={`export-ute2-${kind}-scene`} disabled={busy} onClick={()=>void publish()}>
      {busy?"Exporting…":"Export verified scene bundle"}
    </button>
    {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
  </div>;
}
