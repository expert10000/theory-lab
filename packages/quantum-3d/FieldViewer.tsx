import React, { useEffect, useRef, useState } from "react";
import { verifyScenePayload, type ScenePayload } from "../quantum-scene";
import { SceneViewer, browserSceneDigest } from "./SceneViewer";
import { fieldValues, gridIndex, gridPosition, phaseColor, surfacePayload, type FieldQuantity } from "./fields";
import { scalarColor, scalarRange } from "./scalarColor";
import "./scene.css";

export function FieldViewer({ payload,onSelectGrid }: { payload: ScenePayload;onSelectGrid?:(x:number,y:number,z:number)=>void }) {
  const [verified,setVerified] = useState<{payload:ScenePayload;arrays:Map<string,Float64Array>} | null>(null);
  const ready=verified?.payload===payload?verified.arrays:null;
  const [quantity,setQuantity] = useState<FieldQuantity>("density");
  const [fraction,setFraction] = useState(.15);
  const [axis,setAxis] = useState(2), [slice,setSlice] = useState(0);
  const [fieldId,setFieldId] = useState(payload.scene.fields?.[0]?.id ?? "");
  const [surface,setSurface] = useState<ScenePayload | null>(null);
  const [busy,setBusy] = useState(false), [error,setError] = useState("");
  const [sample,setSample] = useState<[number,number]>([0,0]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const field = payload.scene.fields?.find(f=>f.id===fieldId);
  useEffect(()=>{
    let alive=true;setVerified(null);setSurface(null);setError("");
    setFieldId(payload.scene.fields?.[0]?.id ?? "");
    void verifyScenePayload(payload,browserSceneDigest).then(arrays=>{if(alive)setVerified({payload,arrays});}).catch(e=>{if(alive)setError(String(e));});
    return ()=>{alive=false;};
  },[payload]);
  useEffect(()=>{if(field){setSlice(Math.floor(field.grid.shape[axis]/2));setSample([0,0]);if(field.kind==="scalar-field")setQuantity("real");}},[field,axis]);
  useEffect(()=>{
    if(!ready||!field||(field.kind==="scalar-field"&&quantity!=="real"))return;
    let alive=true;setBusy(true);setSurface(null);setError("");
    void surfacePayload(payload,field,ready,quantity,fraction,browserSceneDigest,()=>!alive).then(value=>{if(alive)setSurface(value);})
      .catch(e=>{if(alive)setError(String(e));}).finally(()=>{if(alive)setBusy(false);});
    return ()=>{alive=false;};
  },[ready,field,payload,quantity,fraction]);
  const values = ready&&field&&(field.kind==="complex-field"||quantity==="real") ? fieldValues(field,ready,quantity) : null;
  const plane = [0,1,2].filter(a=>a!==axis), shape = field?.grid.shape;
  const safeSlice=shape?Math.min(slice,shape[axis]-1):0;
  const range=values?scalarRange(values):null;
  let densityMaximum=0;
  if(ready&&field&&quantity==="phase") for(const v of fieldValues(field,ready,"density"))densityMaximum=Math.max(densityMaximum,v);
  useEffect(()=>{
    const c=canvas.current;if(!c||!field||!values||!range)return;
    const width=field.grid.shape[plane[0]],height=field.grid.shape[plane[1]];
    c.width=width;c.height=height;
    const ctx=c.getContext("2d");if(!ctx)return;
    const image=ctx.createImageData(width,height);
    const density=quantity==="phase"?fieldValues(field,ready!,"density"):null;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const xyz=[0,0,0];xyz[axis]=safeSlice;xyz[plane[0]]=x;xyz[plane[1]]=y;
      const index=gridIndex(field.grid.shape,...xyz as [number,number,number]);
      const color=quantity==="phase"?phaseColor(values[index]):scalarColor(values[index],...range);
      const offset=((height-1-y)*width+x)*4;
      color.forEach((v,a)=>image.data[offset+a]=Math.round(v*255));
      image.data[offset+3]=density&&density[index]<=densityMaximum*1e-12?0:255;
    }
    ctx.putImageData(image,0,0);
  },[values,field,quantity,axis,safeSlice,ready]);
  const xyz:[number,number,number]=[0,0,0];xyz[axis]=safeSlice;xyz[plane[0]]=shape?Math.min(sample[0],shape[plane[0]]-1):0;xyz[plane[1]]=shape?Math.min(sample[1],shape[plane[1]]-1):0;
  const selected=field&&values?gridIndex(field.grid.shape,...xyz):0;
  const position=field?gridPosition(field,...xyz):null;
  const phaseUndefined=quantity==="phase"&&ready&&field&&fieldValues(field,ready,"density")[selected]<=densityMaximum*1e-12;
  const amplitudeUnit = payload.scene.datasets.find(d=>d.id===field?.real)?.unit;
  const quantityUnit = quantity==="phase"?"rad":quantity==="density"?(amplitudeUnit==="a0^-3/2"?"a0^-3":amplitudeUnit==="dimensionless"?"dimensionless":`(${amplitudeUnit})²`):amplitudeUnit;
  return <section className="field-viewer" data-testid="field-viewer">
    <div className="scene-run-controls"><label>Field<select aria-label="Scene field" value={fieldId} onChange={e=>setFieldId(e.target.value)}>{payload.scene.fields?.map(f=><option value={f.id} key={f.id}>{f.label}</option>)}</select></label>
      <label>Quantity<select aria-label="Field quantity" value={quantity} onChange={e=>setQuantity(e.target.value as FieldQuantity)}>{(field?.kind==="scalar-field"?["real"]:["density","real","imaginary","phase"]).map(q=><option key={q} value={q}>{q==="density"?"|ψ|² density":q==="real"?"Real component":q==="imaginary"?"Imaginary component":"Phase (density surface)"}</option>)}</select></label>
      <label>Surface threshold {Math.round(fraction*100)}% of sampled maximum<input aria-label="Field threshold" type="range" min={.01} max={.9} step={.01} value={fraction} onChange={e=>setFraction(Number(e.target.value))}/></label></div>
    <p data-testid="field-verification">{ready?"SHA-256 VERIFIED · regular xyz grid, z-fastest":"Verifying field artifacts…"}</p>
    {error&&<p role="alert">{error}</p>}{busy&&<p role="status">Extracting bounded isosurface…</p>}
    {surface?<SceneViewer payload={surface}/>:ready&&!busy&&!error?<p>No surface at this threshold (the selected component may be identically zero). Slice inspection remains available.</p>:null}
    {ready&&field&&values&&<div className="field-slice-panel"><div className="scene-run-controls"><label>Slice normal<select aria-label="Slice normal" value={axis} onChange={e=>setAxis(Number(e.target.value))}><option value={0}>x</option><option value={1}>y</option><option value={2}>z</option></select></label><label>Slice index {safeSlice}<input aria-label="Field slice" type="range" min={0} max={field.grid.shape[axis]-1} value={safeSlice} onChange={e=>setSlice(Number(e.target.value))}/></label></div>
      <canvas ref={canvas} className="field-slice" data-testid="field-slice" aria-label="Numerical field slice" onClick={e=>{const b=e.currentTarget.getBoundingClientRect();const next:[number,number]=[Math.min(shape![plane[0]]-1,Math.max(0,Math.floor((e.clientX-b.left)/b.width*shape![plane[0]]))),Math.min(shape![plane[1]]-1,Math.max(0,Math.floor((1-(e.clientY-b.top)/b.height)*shape![plane[1]])))];setSample(next);const grid:[number,number,number]=[0,0,0];grid[axis]=safeSlice;grid[plane[0]]=next[0];grid[plane[1]]=next[1];onSelectGrid?.(...grid);}}/>
      <p>Horizontal: {payload.scene.coordinates.axes[plane[0]]} · vertical (up): {payload.scene.coordinates.axes[plane[1]]}. Click a pixel to inspect its grid value.</p>
      <p data-testid="field-sample">({position?.map((v,i)=>`${v.toPrecision(5)} ${payload.scene.coordinates.units[i]}`).join(", ")}) · {quantity} = {phaseUndefined?"undefined near a node":values[selected].toPrecision(7)} {quantityUnit}</p>
      {range&&<p>Slice color scale: {quantity==="phase"?"cyclic phase −π…π (rad); near-zero density masked":`${range[0].toPrecision(5)} … ${range[1].toPrecision(5)}`} · {quantityUnit}</p>}
    </div>}
    <p className="scene-axis-note">Linear grid interpolation / marching tetrahedra. Threshold is a fraction of the sampled maximum, not an enclosed-probability percentage. Phase uses interpolated complex amplitudes; it is undefined at nodes.</p>
  </section>;
}
