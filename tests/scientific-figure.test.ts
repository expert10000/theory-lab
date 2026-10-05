import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {RunStore,numericalSvg} from "../apps/desktop/main/runs";
import {EVOLUTION_COLUMNS,type EvolutionResult} from "../packages/contracts";
import {defaultsFor,evolutionJob} from "../packages/models";

const digest=(bytes:Uint8Array|string)=>createHash("sha256").update(bytes).digest("hex");
const tinyPng=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==","base64");
const points=(svg:string)=>[...svg.matchAll(/<polyline points="([^"]+)"/g)].map(match=>match[1].trim().split(" ").length);

test("QVIS-021 figures preserve all recorded points, exact source hashes and independent legacy SVG",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-figure-")),artifacts=join(root,"artifacts");
  const {mkdir}=await import("node:fs/promises");await mkdir(artifacts);
  const runs=new RunStore(join(root,"runs"),artifacts);
  const samples=1201,job=evolutionJob("driven_two_level","figure-job",defaultsFor("driven_two_level"),0,0,20,samples);
  const bytes=Buffer.alloc(samples*EVOLUTION_COLUMNS.length*8),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  for(let row=0;row<samples;row++){
    const time=20*row/(samples-1),p0=(1+Math.cos(time))/2;
    for(const [column,value] of [time,p0,1-p0,0,0,2*p0-1,0,0,0,1].entries())
      view.setFloat64((row*EVOLUTION_COLUMNS.length+column)*8,value,true);
  }
  await writeFile(join(artifacts,`${job.jobId}.f64`),bytes);
  const result:EvolutionResult={schema:"quantum-result/v1",jobId:job.jobId,runId:"run-scientific-figure",status:"completed",
    operation:"evolve",model:job.model,initialState:job.initialState,solver:job.solver,observables:job.observables,
    engine:{name:"qutip",version:"5.3.1"},data:{schema:"quantum-data/v1",format:"f64le",path:`${job.jobId}.f64`,
      rows:samples,columns:EVOLUTION_COLUMNS,bytes:bytes.length,sha256:digest(bytes)},
    provenance:{pythonVersion:"3.12",workerVersion:"0.1.0",computedAt:"2026-10-05T00:00:00Z",durationMs:1}};
  try{
    await runs.record(job,result);
    const legacy=numericalSvg(result,bytes);
    assert.ok(points(legacy).every(count=>count<samples),"legacy SVG retains its existing downsampling");
    const preview=await runs.figure(result.runId);
    assert.deepEqual(points(preview.svg),[samples,samples],"publication export uses every saved sample");
    assert.equal(preview.metadata.plottedSamples,samples);
    assert.equal(preview.metadata.samplePolicy,"all recorded samples");
    assert.equal(preview.metadata.uncertainty,"not recorded");
    assert.equal(preview.metadata.source.artifactSha256,digest(bytes));
    assert.match(preview.svg,/Uncertainty not recorded/);
    const reopened=new RunStore(join(root,"runs"),join(root,"offline"));
    assert.deepEqual(await reopened.figure(result.runId),preview,"restart reproduces the exact SVG and source metadata");
    await assert.rejects(reopened.exportFigure(result.runId,root,"svg",undefined,"0".repeat(64)),/changed after preview/);
    const svgExport=await reopened.exportFigure(result.runId,root,"svg",undefined,preview.metadata.source.resultSha256);
    const svgBytes=await readFile(join(svgExport.directory,"figure.svg"));
    const svgMeta=JSON.parse(await readFile(join(svgExport.directory,"metadata.json"),"utf8"));
    assert.equal(svgBytes.toString("utf8"),preview.svg);
    assert.equal(svgMeta.fileSha256,digest(svgBytes));assert.equal(svgMeta.svgSha256,digest(svgBytes));
    assert.equal(svgMeta.source.resultSha256,preview.metadata.source.resultSha256);
    assert.deepEqual(svgMeta.parameters,job.model.parameters);
    const pngExport=await reopened.exportFigure(result.runId,root,"png",async()=>tinyPng,preview.metadata.source.resultSha256);
    const pngBytes=await readFile(join(pngExport.directory,"figure.png"));
    const pngMeta=JSON.parse(await readFile(join(pngExport.directory,"metadata.json"),"utf8"));
    assert.equal(digest(pngBytes),pngMeta.fileSha256);
    assert.equal(pngMeta.svgSha256,svgMeta.svgSha256);
    assert.equal(pngMeta.source.resultSha256,svgMeta.source.resultSha256);
    await writeFile(join(root,"runs",result.runId,"data.f64"),Buffer.alloc(bytes.length));
    await assert.rejects(reopened.figure(result.runId),/integrity/);
    await assert.rejects(reopened.exportFigure(result.runId,root,"svg"),/integrity/);
  }finally{await rm(root,{recursive:true,force:true})}
});
