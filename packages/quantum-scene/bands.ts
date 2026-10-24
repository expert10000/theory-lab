import type { QuantumResult } from "../contracts";
import { consistentTopologyResult } from "../models/topology";
import { SceneBuilder } from "./builder";
import { addReciprocalGuides } from "./reciprocal";
import type { QuantumScene } from "./index";

export async function bandSceneFromResult(
  result: QuantumResult,
  resultSha256: string,
  digest: (bytes: Uint8Array) => Promise<string>,
  domain: "lattice"|"continuum" = "lattice",
) {
  if (
    result.operation !== "topology" ||
    !consistentTopologyResult(
      {
        schema: "quantum-job/v1",
        jobId: result.jobId,
        operation: "topology",
        engine: "native",
        model: result.model,
      },
      result,
    )
  )
    throw new Error("Bands require a verified topology result");
  const a = result.analysis,
    surface = a.kind !== "ssh",
    values: number[][] = a.kind === "bhz" ? a.bandEnergies : a.kind==="bhz_general"?
      (domain==="continuum"?a.continuumBandEnergies:a.latticeBandEnergies):[a.lowerBand ?? [], a.upperBand ?? []];
  if (!values.every(v=>v.length>0) || (a.kind === "qwz" && !a.bandKValues))
    throw new Error(
      "This older QWZ run has no supplied band arrays. Re-run the QWZ laboratory with the updated worker.",
    );
  const ks:number[] = a.kind === "ssh" ? a.kValues : a.kind==="bhz_general"?
    (domain==="continuum"?a.continuumKValues:a.latticeKValues):a.bandKValues!,
    k = surface
      ? ks.flatMap((x) => ks.flatMap((y) => [x, y, 0]))
      : ks.flatMap((x) => [x, 0, 0]);
  const height = Math.max(1, ...values[values.length-1].map(Math.abs)),
    unit = "normalized energy (hbar=1)";
  const scene: QuantumScene = {
    schema: surface ? "quantum-scene/v1" : "quantum-scene/v2",
    id: a.kind==="bhz_general"?
      (result.runId.length<=75?`${result.runId}-${domain}-bands`:`bands-${resultSha256.slice(0,32)}-${domain}`):
      (result.runId.length<=85?`${result.runId}-bands`:`bands-${resultSha256.slice(0,32)}`),
    title: a.kind==="bhz_general"?`BHZ supplied ${domain} energy bands`:`${a.kind.toUpperCase()} supplied energy bands`,
    provenance: {
      kind: "numerical-result",
      runId: result.runId,
      jobId: result.jobId,
      model: result.model.type,
      engine: result.engine.name,
      engineVersion: result.engine.version,
      computedAt: result.provenance.computedAt,
      resultSha256,
      adapter: "qvis/1",
      parameters: { ...result.model.parameters },
    },
    coordinates: {
      handedness: "right",
      axes: surface ? ["kx", "ky", "energy"] : ["k", "energy", "display z"],
      units: surface
        ? [domain==="continuum"?"inverse length (a=1)":"rad / lattice constant",domain==="continuum"?"inverse length (a=1)":"rad / lattice constant",unit]
        : ["rad / cell spacing", unit, "dimensionless"],
    },
    camera: {
      position: surface
        ? [9 + height, -8 - height, 7 + height]
        : [0, -height * 2, Math.max(8, height * 2)],
      target: [0, 0, 0],
      up: surface ? [0, 0, 1] : [0, 1, 0],
    },
    objects: [],
    datasets: [],
    annotations: [
      {
        id: "band-convention",
        text: "Original worker samples. Lines/triangles are display connections, not interpolated scientific values. No periodic seam or topology inference.",
        position: [0, 0, height],
      },
      {
        id: "band-gap",
        text: a.kind==="bhz" ? `Worker sampled bulk gap ${a.sampledGap.toPrecision(7)}; spin-conserved Z2 ${a.z2 ?? (a.gapClosed?"undefined":"unresolved")}. No edge-state inference.` :
          a.kind==="bhz_general"?`Atlas continuum and declared lattice regularization are separate views. Worker lattice Z2 ${a.z2??"unresolved"}; open-ribbon states are supplied only with the lattice view.`:
          `Worker bulk gap ${a.bulkGap.toPrecision(7)}; sampled separations need not reach the exact global gap. Topology ${a.kind === "ssh" ? (a.winding ?? "undefined") : (a.chern ?? "undefined or unresolved")}.`,
        position: [0, 0, -height],
      },
    ],
  };
  const source = "source" in result.model ? result.model.source : undefined,
    pinned = source?.sourceRepository?.match(
      /^(https:\/\/github\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+)\/tree\/([a-f0-9]{40})$/,
    ),
    entryId = source?.exampleId?.match(/^Atlas ([A-Za-z0-9_-]+)$/)?.[1];
  if (pinned && entryId)
    scene.provenance.source = {
      repository: pinned[1],
      revision: pinned[2],
      entryId,
    };
  const b = new SceneBuilder(scene, digest),
    coordinates = await b.data(
      "band-k",
      k,
      3,
      surface ? (domain==="continuum"?"inverse length (a=1)":"rad / lattice constant") : "rad / cell spacing",
    ),
    energies: string[] = [],
    objects: string[] = [],
    triangles: number[] = [];
  if (surface)
    for (let x = 0; x < ks.length - 1; x++)
      for (let y = 0; y < ks.length - 1; y++) {
        const i = x * ks.length + y;
        triangles.push(
          i,
          i + ks.length,
          i + 1,
          i + 1,
          i + ks.length,
          i + ks.length + 1,
        );
      }
  const indices = surface
    ? await b.data("band-triangles", triangles, 3, "vertex index")
    : undefined;
  const labels=a.kind==="bhz"?["Block occupied","Partner occupied","Block empty","Partner empty"]:
    a.kind==="bhz_general"?["Occupied 1","Occupied 2","Empty 1","Empty 2"]:["Lower band","Upper band"];
  for (const [j, bandValues] of values.entries()) {
    const id = `band-${j}`,
      e = await b.data(`band-energy-${j}`, bandValues, 1, unit);
    const positions = await b.data(
      `band-positions-${j}`,
      bandValues.flatMap((v, i) =>
        surface ? [k[i * 3], k[i * 3 + 1], v] : [k[i * 3], v, 0],
      ),
      3,
      "declared mixed scene units",
    );
    b.object(
      id,
      labels[j],
      surface ? "mesh" : "polyline",
      positions,
      ["#f2b36f","#c994d7","#79d9c1","#7fa8ee"][j],
      { scalars: e, ...(indices ? { indices } : {}) },
    );
    energies.push(e);
    objects.push(id);
  }
  scene.bands = {
    kind: surface ? "surface" : "path",
    coordinates,
    energies,
    objects,
    labels,
    energyUnit: unit,
    bulkGap: a.kind==="bhz_general"&&domain==="continuum"?
      Math.min(...values[2].map((value,i)=>value-values[1][i])):a.bulkGap,
    ...(surface ? { grid: [ks.length, ks.length] as [number, number] } : {}),
  };
  if(a.kind==="bhz")scene.topology={quantities:[],invariants:[
    {id:"spin-z2",label:"Spin-conserved Z2 parity",value:a.z2,status:a.gapClosed?"undefined":a.meshResolved?"verified":"unresolved",
      method:"FHS occupied-block Chern parity, paired-block cancellation and independent Dirac-mass phase check"},
    {id:"block-chern",label:"Occupied first-block Chern",value:a.blockChern,status:a.gapClosed?"undefined":"supplied",
      method:"FHS lattice links on producer momentum mesh"}],
    limitations:["Square-lattice regularization A=B=1, epsilon=0; spin blocks conserved.",
      "Only bulk bands and block invariants supplied; no edge states, spin mixing, or generic BHZ phase inference.",
      "Gap shown is the producer grid minimum, except an exact known high-symmetry closure is reported as zero."]};
  if(a.kind==="bhz_general"){
    scene.topology={quantities:[],invariants:[{id:"z2",label:"Inversion-parity Z2",value:a.z2,
      status:a.gapClosed?"undefined":a.meshResolved?"verified":"unresolved",
      method:"Producer Fu-Kane TRIM parity with dense-grid gap check; R term preserves time reversal and inversion"}],
      limitations:["Continuum bulk and a=1 lattice regularization are separate supplied views.",
        "Stored eigenvector phases are gauge-dependent; edge weights and spin expectations are producer values.",
        "A finite open ribbon is not a semi-infinite boundary or a universal material prediction."]};
    if(domain==="lattice"){
      const samples=a.edge.kValues.flatMap((kx,i)=>a.edge.energies[i].map((energy,j)=>[kx,energy,a.edge.weights[i][j]]));
      const edgePositions=await b.data("ribbon-spectrum",samples.flatMap(([kx,energy])=>[kx,0,energy]),3,"mixed k/energy display units");
      const edgeWeights=await b.data("ribbon-edge-weight",samples.map(([, ,weight])=>weight),1,"probability in outer two cells per edge");
      b.object("ribbon-states","Producer open-ribbon energies (color = outer-edge weight)","point-cloud",edgePositions,"#f2b36f",{scalars:edgeWeights});
    }
  }
  if (surface&&domain==="lattice")
    await addReciprocalGuides(
      b,
      "square",
      "lattice constant a=1",
      "rad / lattice constant",
    );
  else if (!surface) {
    // The SSH worker samples k in [-π, π] for a unit cell spacing. This
    // adapter supplies the zone explicitly; consumers never infer it.
    const pi=Math.PI, kUnit="rad / cell spacing";
    const points=[
      {id:"Xminus",label:"−π",position:[-pi,0,0] as [number,number,number]},
      {id:"Gamma",label:"Γ",position:[0,0,0] as [number,number,number]},
      {id:"Xplus",label:"+π",position:[pi,0,0] as [number,number,number]},
    ];
    const pointObject=await b.data("symmetry-points",points.flatMap(p=>p.position),3,kUnit);
    b.object("symmetry-points","SSH high-symmetry k-points","point-cloud",pointObject,"#f2b36f");
    const pathObject=await b.data("symmetry-path",points.flatMap(p=>p.position),3,kUnit);
    b.object("symmetry-path","SSH supplied zone path","polyline",pathObject,"#f2b36f");
    const boundaryObject=await b.data("primitive-bz",[-pi,0,0,pi,0,0],3,kUnit);
    b.object("primitive-bz","SSH Brillouin-zone endpoints","point-cloud",boundaryObject,"#79d9c1");
    const origin=await b.data("reciprocal-origin-0",[0,0,0],3,kUnit);
    const basis=await b.data("reciprocal-basis-0",[2*pi,0,0],3,kUnit);
    b.object("reciprocal-b1","Reciprocal b1 (2π convention)","vectors",origin,"#5995f0",{values:basis});
    scene.reciprocal={directBasis:[[1,0,0]],basis:[[2*pi,0,0]],directUnit:"cell spacing a=1",
      reciprocalUnit:kUnit,pointObject:"symmetry-points",points,
      paths:[{object:"symmetry-path",label:"−π → Γ → +π",points:points.map(p=>p.id)}],
      boundaryObjects:["primitive-bz"]};
  }
  return b.finish();
}
