import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {assertLatticePairingJob,isLatticePairingJob,isLatticePairingResult} from "../packages/contracts/lattice-pairing";
import {consistentLatticePairingResult,latticePairingJob,latticePairingSamples} from "../packages/models/lattice-pairing";
import {LatticePairingRunStore} from "../apps/desktop/main/lattice-pairing-runs";
import {WorkerSupervisor} from "../apps/desktop/main/worker";

const reference={mu:-2,amplitudeX:.8,amplitudeY:.8,relativePhaseRad:Math.PI/2,gridSize:16};
const close=(a:number,b:number)=>Math.abs(a-b)<1e-10;

test("lattice pairing job bounds finite grid and parameters",()=>{
  const job=latticePairingJob(reference,"lattice-contract");
  assert.ok(isLatticePairingJob(job));
  for(const change of [{mu:5.1},{amplitudeX:-.1},{amplitudeY:2.1},{relativePhaseRad:4},{gridSize:32},{mu:Infinity}])
    assert.throws(()=>assertLatticePairingJob(latticePairingJob({...reference,...change},"lattice-contract")));
  assert.equal(isLatticePairingJob({...job,model:{...job.model,type:"ute2_fit"}}),false);
});

test("odd gap, even dispersion, Hermitian BdG and particle-hole relation",()=>{
  const n=reference.gridSize;
  const rows=latticePairingSamples({...reference,relativePhaseRad:.7});
  assert.equal(rows.length,n*n);
  for(let ix=0;ix<n;ix++)for(let iy=0;iy<n;iy++){
    const row=rows[ix*n+iy];
    const inverse=rows[((n-ix)%n)*n+(n-iy)%n];
    assert.ok(close(row.xi,inverse.xi));
    assert.ok(close(row.deltaRe,-inverse.deltaRe));
    assert.ok(close(row.deltaIm,-inverse.deltaIm));
    // H(k)=[[ξ,Δ],[Δ*,−ξ]] is Hermitian, with τx H*(-k) τx = −H(k).
    assert.ok(close(row.eMinus,-row.ePlus));
    assert.ok(close(row.ePlus**2,row.xi**2+row.deltaRe**2+row.deltaIm**2));
    assert.ok(close((row.electronWeight??0)+(row.holeWeight??0),1)||row.node);
  }
  const row=rows[3*n*n/4+n/2];
  const sx=Math.sin(row.kx),sy=Math.sin(row.ky);
  const expectedGapSquared=reference.amplitudeX**2*sx**2+reference.amplitudeY**2*sy**2+
    2*reference.amplitudeX*reference.amplitudeY*Math.cos(.7)*sx*sy;
  assert.ok(close(row.gapMagnitude**2,expectedGapSquared));
});

test("declared chiral reference and sampled nodal masks",()=>{
  const n=reference.gridSize;
  const rows=latticePairingSamples(reference);
  const row=rows[3*n*n/4+n/2]; // (π/2,0): ξ=0, |Δ|=.8
  assert.ok(close(row.xi,0));assert.ok(close(row.gapMagnitude,.8));assert.ok(close(row.ePlus,.8));
  assert.ok(close(row.electronWeight!, .5));assert.ok(close(row.holeWeight!, .5));
  assert.equal(row.phaseRad,0);
  const closed=latticePairingSamples({...reference,mu:0});
  const node=closed[n/2]; // (-π,0)
  assert.equal(node.node,true);assert.equal(node.phaseRad,null);
  assert.equal(node.electronWeight,null);assert.equal(node.holeWeight,null);
  const line=latticePairingSamples({...reference,mu:0,relativePhaseRad:0});
  assert.equal(line[3*n*n/4+n/4].node,true); // (π/2,-π/2)
});

test("real lattice worker result and saved evidence survive restart, reject tampering",async()=>{
  const root=await mkdtemp(join(tmpdir(),"qlab-lattice-pairing-"));
  const worker=new WorkerSupervisor(process.cwd());
  try{
    await worker.start();assert.equal(worker.status.state,"READY");
    const job=latticePairingJob({...reference,gridSize:24},"lattice-worker-reference");
    const result=await worker.request("quantum.latticePairing",job);
    assert.ok(isLatticePairingResult(result));
    assert.ok(consistentLatticePairingResult(job,result));
    assert.equal(result.samples.length,576);
    assert.ok(JSON.stringify({jsonrpc:"2.0",id:"1",result}).length<262144);
    const store=new LatticePairingRunStore(root);
    const summary=await store.record(job,result);
    const reopened=new LatticePairingRunStore(root);
    assert.equal((await reopened.get(result.runId)).samples.length,576);
    assert.equal((await reopened.list())[0].resultSha256,summary.resultSha256);
    const file=join(root,result.runId,"result.json");
    const altered=JSON.parse(await readFile(file,"utf8"));
    altered.samples[0].ePlus+=.1;
    const changedText=JSON.stringify(altered,null,2)+"\n";
    await writeFile(file,changedText);
    await assert.rejects(reopened.get(result.runId),/integrity check/);
    const manifestFile=join(root,result.runId,"manifest.json");
    const manifest=JSON.parse(await readFile(manifestFile,"utf8"));
    manifest.resultSha256=createHash("sha256").update(changedText).digest("hex");
    await writeFile(manifestFile,JSON.stringify(manifest,null,2)+"\n");
    await assert.rejects(reopened.get(result.runId),/scientific consistency/);
    assert.deepEqual(await reopened.list(),[]);
  }finally{await worker.stop();await rm(root,{recursive:true,force:true});}
});
