import type {LayerOneSource,QuantumJob} from "../contracts";
import {cavityJob} from "../models/cavity";
import {evolutionJob,spectrumJob} from "../models";
import {topologyJob,TOPOLOGY_DEFAULTS} from "../models/topology";
import {ATLAS_ENTRIES,ATLAS_REVISION,ATLAS_SOURCE,atlasEntry} from "./index";
import {atlasBinding} from "./bindings";

/** Only these existing job variants can retain exact pinned Atlas identity. */
export const CANONICAL_ATLAS_IDS=[
  "two_level_pauli","semiclassical_rabi_drive","landau_zener","floquet_two_level",
  "jaynes_cummings","rabi","ssh","qwz",
] as const;
export type CanonicalAtlasId=typeof CANONICAL_ATLAS_IDS[number];
const canonicalIds=new Set<string>(CANONICAL_ATLAS_IDS);
const strings=(values:Record<string,number>)=>Object.fromEntries(Object.entries(values).map(([key,value])=>[key,String(value)]));

export function atlasSource(id:string):LayerOneSource|null{
  const entry=atlasEntry(id);
  return entry?{sourceRepository:`${ATLAS_SOURCE}/tree/${ATLAS_REVISION}`,
    sourceModule:`data/hamiltonian_atlas/${entry.sourceFile}`,volume:"VIII",exampleId:`Atlas ${id}`}:null;
}

/** Null means descriptive-only or a tested binding lacking durable origin fields. */
export function canonicalAtlasJob(id:string,jobId:string):QuantumJob|null{
  if(!canonicalIds.has(id))return null;
  const binding=atlasBinding(id),source=atlasSource(id);
  if(!binding||!source)throw new Error(`Missing reviewed Atlas binding ${id}`);
  if(binding.kind==="spectrum"){
    const job=spectrumJob(jobId,strings(binding.parameters),"native");
    return {...job,model:{...job.model,source}};
  }
  if(binding.kind==="dynamics")return evolutionJob(binding.modelId,jobId,strings(binding.parameters),0,0,10,101,"native",source);
  if(binding.kind==="cavity")return cavityJob(binding.modelId,jobId,strings(binding.parameters),
    {qubit:"excited",photons:0},{type:"schrodinger",tStart:0,tStop:10,samples:101},"native",source);
  if(binding.kind==="topology"){
    const draft=binding.modelId==="ssh"?
      {...TOPOLOGY_DEFAULTS,modelId:"ssh" as const,t1:String(binding.parameters.t1),t2:String(binding.parameters.t2),
        cells:String(binding.parameters.cells),kPoints:String(binding.parameters.kPoints)}:
      {...TOPOLOGY_DEFAULTS,modelId:"qwz" as const,mass:String(binding.parameters.mass),grid:String(binding.parameters.grid)};
    return topologyJob(jobId,draft);
  }
  return null;
}

export function atlasDeepLinkCapabilities(id:string){
  const binding=atlasBinding(id);
  return {load:!!binding,run:canonicalIds.has(id)&&!!binding,sweep:id==="two_level_pauli"&&!!binding,
    theory:!!atlasEntry(id)};
}

/** Reverse link only for exact canonical inputs, not an arbitrary job claiming Atlas provenance. */
export function canonicalAtlasOrigin(job:QuantumJob){
  if(!("source" in job.model)||!job.model.source)return null;
  for(const id of CANONICAL_ATLAS_IDS){
    const expected=canonicalAtlasJob(id,"origin-check");
    if(!expected||expected.operation!==job.operation||expected.model.type!==job.model.type||!("source" in expected.model))continue;
    const source=job.model.source,reference=expected.model.source;
    if(!source||!reference||Object.keys(source).length!==Object.keys(reference).length||
      Object.entries(reference).some(([key,value])=>source[key as keyof LayerOneSource]!==value))continue;
    const actual=job.model.parameters as Record<string,unknown>,canonical=expected.model.parameters as Record<string,unknown>;
    if(Object.keys(actual).length!==Object.keys(canonical).length||
      Object.entries(canonical).some(([key,value])=>actual[key]!==value))continue;
    const entry=atlasEntry(id)!;
    return {id,revision:ATLAS_REVISION,entry,section:entry.references.chapters[0]??"Volume VIII"};
  }
  return null;
}

/** Keep the supported source set explicitly smaller than the 68-entry reference catalog. */
export const ATLAS_REFERENCE_COUNT=ATLAS_ENTRIES.length;
