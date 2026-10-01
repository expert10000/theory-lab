import type {WorkspaceSnapshot, WorkspaceTab} from "../../../packages/contracts";
import type {EvolutionModelId} from "../../../packages/models";
import type {CavityModelId} from "../../../packages/models/cavity";

export type WorkspaceMode="explore"|"dynamics"|"sweeps"|"analysis"|"scenes"|"runs";
export type WorkspaceModel="two_level"|EvolutionModelId|CavityModelId|
  "lindblad"|"ising_chain"|"topology"|"hydrogenic"|"oscillator"|"transmon";

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
  if(mode==="sweeps")return ["driven_two_level","landau_zener","stuckelberg","strong_drive"].includes(model)?"sweep":null;
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
    case "sweep":return snapshot.sweep.modelId;
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
