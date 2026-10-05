import React,{useEffect,useState} from "react";
import type {QuantumBridge} from "../../../packages/contracts";
import type {FigureFormat,ScientificFigurePreview} from "../../../packages/contracts/figure";

export function FigurePanel({bridge,runId,onClose}:{bridge:QuantumBridge;runId:string;onClose:()=>void}){
  const [preview,setPreview]=useState<ScientificFigurePreview|null>(null);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [exporting,setExporting]=useState<FigureFormat|null>(null);
  useEffect(()=>{
    let live=true;setPreview(null);setError("");setMessage("");
    void bridge.getFigure(runId).then(value=>{if(live&&value.metadata.source.runId===runId)setPreview(value)})
      .catch(cause=>{if(live)setError(cause instanceof Error?cause.message:String(cause))});
    return ()=>{live=false};
  },[bridge,runId]);
  async function exportOne(format:FigureFormat){
    if(!preview||exporting)return;
    setExporting(format);setError("");setMessage("");
    try{
      const path=await bridge.exportFigure(runId,format,preview.metadata.source.resultSha256);
      setMessage(path?`${format.toUpperCase()} figure and metadata saved in ${path}`:"Export cancelled");
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause))}
    finally{setExporting(null)}
  }
  return <div className="figure-overlay" role="presentation" onClick={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section className="figure-dialog" role="dialog" aria-modal="true" aria-label={`Scientific figure for ${runId}`} data-testid="scientific-figure">
      <div className="panel-heading"><div><p className="eyebrow">QVIS-021 / PUBLICATION FIGURE</p><h2>One verified run. One exact figure.</h2></div>
        <button type="button" className="text-button" aria-label="Close figure" onClick={onClose}>Close ×</button></div>
      {!preview&&!error&&<p role="status">Verifying saved run and preparing figure…</p>}
      {error&&<p className="error-message" role="alert" data-testid="figure-error">{error}</p>}
      {preview&&<>
        <p className="figure-context">{preview.metadata.source.modelId} · {preview.metadata.source.operation} · {preview.metadata.plottedSamples} recorded positions · {preview.metadata.engine.name} {preview.metadata.engine.version}</p>
        <img className="figure-preview" data-testid="figure-preview" alt={`Publication figure for verified ${runId}`}
          src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(preview.svg)}`}/>
        <p className="figure-context">Axes: {preview.metadata.axes.x.label} ({preview.metadata.axes.x.unit}) × {preview.metadata.axes.y.label} ({preview.metadata.axes.y.unit}). Series: {preview.metadata.series.map(item=>`${item.label} [${item.unit}]`).join(" · ")}. Uncertainty: not recorded.</p>
        <code className="figure-source" data-testid="figure-source-hash">Result SHA-256 {preview.metadata.source.resultSha256}</code>
        <div className="dynamics-actions"><button type="button" data-testid="export-figure-svg" disabled={!!exporting} onClick={()=>void exportOne("svg")}>{exporting==="svg"?"Exporting…":"Export SVG + metadata"}</button>
          <button type="button" data-testid="export-figure-png" disabled={!!exporting} onClick={()=>void exportOne("png")}>{exporting==="png"?"Exporting…":"Export PNG + metadata"}</button></div>
        <p>Publication output contains only the verified scientific figure and its source context—no application chrome. Existing CSV/SVG/manifest exports remain unchanged.</p>
      </>}
      {message&&<p role="status" data-testid="figure-message">{message}</p>}
    </section>
  </div>;
}
