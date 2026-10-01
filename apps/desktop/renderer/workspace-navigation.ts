import type {WorkspaceSnapshot, WorkspaceTab} from "../../../packages/contracts";
import type {EvolutionModelId} from "../../../packages/models";
import type {CavityModelId} from "../../../packages/models/cavity";

export type WorkspaceMode="explore"|"dynamics"|"sweeps"|"analysis"|"scenes"|"runs";
export type WorkspaceModel="two_level"|EvolutionModelId|CavityModelId|
  "lindblad"|"ising_chain"|"topology"|"hydrogenic"|"oscillator"|"transmon";
export type WorkspaceLocation={model:WorkspaceModel;tab:WorkspaceTab};

export const MODEL_GROUPS:readonly {id:string;label:string;models:readonly WorkspaceModel[]}[]=[
  {id:"two-level",label:"Two-level",models:["two_level","driven_two_level","landau_zener","stuckelberg","strong_drive"]},
  {id:"light-matter",label:"Light–matter",models:["jaynes_cummings","quantum_rabi"]},
  {id:"open-systems",label:"Open systems",models:["lindblad"]},
  {id:"many-body",label:"Many-body",models:["ising_chain"]},
  {id:"topology",label:"Topology",models:["topology"]},
  {id:"atomic-continuous",label:"Atomic & continuous",models:["hydrogenic","oscillator"]},
  {id:"circuits",label:"Circuits",models:["transmon"]},
];
const MODELS=new Set<WorkspaceModel>(MODEL_GROUPS.flatMap(group=>group.models));
const TABS=new Set<WorkspaceTab>(["spectrum","hamiltonian","dynamics","cavity","open","sweep","many_body","circuit","presets","runs","roadmap","backend","atlas","topology","scenes","orbital","oscillator"]);
const UTILITIES=new Set<WorkspaceTab>(["presets","roadmap","backend","atlas"]);

export function workspaceHash({model,tab}:WorkspaceLocation):string{
  return UTILITIES.has(tab)?`#view/${tab}/${model}`:`#lab/${model}/${tab}`;
}

export function locationFromHash(hash:string):WorkspaceLocation|null{
  const parts=hash.replace(/^#/,"").split("/");
  if(parts[0]==="lab"&&parts.length===3&&MODELS.has(parts[1] as WorkspaceModel)&&TABS.has(parts[2] as WorkspaceTab)){
    const model=parts[1] as WorkspaceModel,tab=parts[2] as WorkspaceTab;
    const mode=modeForTab(tab);
    return mode&&tabForMode(model,mode)===tab?{model,tab}:null;
  }
  if(parts[0]==="view"&&parts.length===3&&UTILITIES.has(parts[1] as WorkspaceTab)&&MODELS.has(parts[2] as WorkspaceModel))
    return {model:parts[2] as WorkspaceModel,tab:parts[1] as WorkspaceTab};
  // Older one-tab links remain readable, even though the visible navigation is model-aware.
  const legacy=parts.length===1?parts[0]:parts[0]==="tab"&&parts.length===2?parts[1]:null;
  if(!legacy||!TABS.has(legacy as WorkspaceTab))return null;
  const tab=legacy as WorkspaceTab;
  const model:WorkspaceModel=tab==="cavity"?"jaynes_cummings":tab==="open"?"lindblad":
    tab==="many_body"?"ising_chain":tab==="topology"?"topology":tab==="orbital"?"hydrogenic":
    tab==="oscillator"?"oscillator":tab==="circuit"?"transmon":tab==="dynamics"||tab==="sweep"?"driven_two_level":"two_level";
  return {model,tab};
}

export const WORKSPACE_MODES:readonly {id:WorkspaceMode;label:string}[]=[
  {id:"explore",label:"Explore"},{id:"dynamics",label:"Dynamics"},
  {id:"sweeps",label:"Sweeps"},{id:"analysis",label:"Analysis"},
  {id:"scenes",label:"Scenes"},{id:"runs",label:"Runs"},
];

export function modeForTab(tab:WorkspaceTab):WorkspaceMode|null{
  if(tab==="scenes"||tab==="runs")return tab;
  if(tab==="dynamics"||tab==="open")return "dynamics";
  if(tab==="sweep")return "sweeps";
  if(tab==="hamiltonian")return "analysis";
  if(["spectrum","cavity","many_body","topology","orbital","oscillator","circuit"].includes(tab))return "explore";
  return null;
}

export function tabForMode(model:WorkspaceModel,mode:WorkspaceMode):WorkspaceTab|null{
  if(mode==="scenes"||mode==="runs")return mode;
  if(mode==="analysis")return model==="two_level"?"hamiltonian":null;
  if(mode==="sweeps")return ["two_level","driven_two_level","landau_zener","stuckelberg","strong_drive"].includes(model)?"sweep":null;
  if(mode==="dynamics")return model==="lindblad"?"open":
    ["driven_two_level","landau_zener","stuckelberg","strong_drive"].includes(model)?"dynamics":null;
  switch(model){
    case "two_level":return "spectrum";
    case "jaynes_cummings":case "quantum_rabi":return "cavity";
    case "ising_chain":return "many_body";
    case "topology":return "topology";
    case "hydrogenic":return "orbital";
    case "oscillator":return "oscillator";
    case "transmon":return "circuit";
    default:return null;
  }
}

export function modelForSnapshot(snapshot:WorkspaceSnapshot):WorkspaceModel{
  switch(snapshot.tab){
    case "dynamics":return snapshot.dynamics.modelId;
    case "sweep":return snapshot.sweepView==="two_level"?"two_level":snapshot.sweep.modelId;
    case "cavity":return snapshot.cavity.modelId;
    case "open":return "lindblad";
    case "many_body":return "ising_chain";
    case "topology":return "topology";
    case "orbital":return "hydrogenic";
    case "oscillator":return "oscillator";
    case "circuit":return "transmon";
    default:return "two_level";
  }
}

export function modelLabel(model:WorkspaceModel):string{
  const labels:Record<WorkspaceModel,string>={
    two_level:"Two-level system",driven_two_level:"Rabi dynamics",landau_zener:"Landau–Zener",
    stuckelberg:"Stückelberg",strong_drive:"Floquet / strong drive",
    jaynes_cummings:"Jaynes–Cummings",quantum_rabi:"Quantum Rabi",lindblad:"Lindblad dynamics",
    ising_chain:"Ising chain",topology:"Topological bands",hydrogenic:"Atomic orbitals",
    oscillator:"Oscillator",transmon:"Transmon circuit",
  };
  return labels[model];
}
