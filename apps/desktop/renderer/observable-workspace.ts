import type {QuantumResult} from "../../../packages/contracts";
import {activeSelectionReference,type ScientificSelectionReference,type SelectionSources} from "./selection-reference";

export type ObservableCategory="energy"|"expectation"|"variance"|"population"|"occupation"|
  "transition"|"matrix_element"|"correlation"|"density"|"geometry"|"diagnostic";
export type ObservableAvailability="stored"|"derived"|"unavailable";
export interface ObservableCard {
  id:string;category:ObservableCategory;label:string;operator:string;state:string;basis:string;unit:string;
  availability:ObservableAvailability;value:number|null;source:string;diagnostic:string;
}
/** Renderer-only projection of one already resolved saved-run selection. Not a worker/result schema. */
export interface ObservableWorkspaceView {
  schema:"observable-workspace/v1";runId:string;model:QuantumResult["model"]["type"];
  operation:QuantumResult["operation"];coordinate:ScientificSelectionReference["coordinate"];
  engine:string;computedAt:string;cards:ObservableCard[];
}

type CardFields=Omit<ObservableCard,"availability"|"value"|"source"|"diagnostic">;
function add(cards:ObservableCard[],fields:CardFields,value:number,source:string,diagnostic:string,availability:"stored"|"derived"="stored"){
  if(!Number.isFinite(value))throw new Error("Nonfinite recorded observable");
  cards.push({...fields,value,availability,source,diagnostic});
}
function unavailable(cards:ObservableCard[],fields:CardFields,reason:string){
  cards.push({...fields,value:null,availability:"unavailable",source:"not recorded",diagnostic:reason});
}
function card(id:string,category:ObservableCategory,label:string,operator:string,state:string,basis:string,unit:string):CardFields{
  return {id,category,label,operator,state,basis,unit};
}
function exact(reference:ScientificSelectionReference,result:QuantumResult):boolean{
  return reference.schema==="scientific-selection/v1"&&reference.runId===result.runId&&
    reference.model===result.model.type&&reference.operation===result.operation;
}
function sameReference(a:ScientificSelectionReference,b:ScientificSelectionReference):boolean{
  if(a.runId!==b.runId||a.model!==b.model||a.operation!==b.operation||a.coordinate.kind!==b.coordinate.kind)return false;
  if(a.coordinate.kind==="cell"&&b.coordinate.kind==="cell")
    return a.coordinate.xIndex===b.coordinate.xIndex&&a.coordinate.yIndex===b.coordinate.yIndex;
  if(a.coordinate.kind==="voxel"&&b.coordinate.kind==="voxel")
    return a.coordinate.x===b.coordinate.x&&a.coordinate.y===b.coordinate.y&&a.coordinate.z===b.coordinate.z;
  return "index" in a.coordinate&&"index" in b.coordinate&&a.coordinate.index===b.coordinate.index;
}
/** Never resolve a copied display value without the matching active context and coordinate. */
export function resolveObservableWorkspace(reference:ScientificSelectionReference|null,result:QuantumResult|null,
  sources:SelectionSources):ObservableWorkspaceView|null{
  if(!reference||!result||!exact(reference,result))return null;
  const active=activeSelectionReference(sources);
  if(!active||!sameReference(active,reference))return null;
  const sourceResult=[sources.spectrum.result,sources.evolution?.result,sources.cavity?.result,
    sources.lindblad?.result,sources.circuit?.result,sources.manyBody?.result,sources.sweep?.result,
    sources.topology?.result,sources.orbital?.result,sources.oscillator?.result]
    .find(candidate=>candidate?.runId===reference.runId&&candidate.model.type===reference.model&&
      candidate.operation===reference.operation);
  if(sourceResult!==result)return null;
  const coordinate=reference.coordinate,cards:ObservableCard[]=[];
  try{
    if(result.operation==="diagonalize"&&coordinate.kind==="energy"){
      const index=coordinate.index;
      const selection=sources.spectrum.selection;
      if(!Number.isInteger(index)||index<0||index>1||sources.spectrum.result?.runId!==result.runId||
        selection?.kind!=="energy"||selection.runId!==result.runId||selection.level!==index)return null;
      add(cards,card("energy","energy",`E${index}`,"H",`eigenstate ${index}`,"computational |0⟩, |1⟩","normalized"),
        result.spectrum.eigenvalues[index],`spectrum.eigenvalues[${index}]`,"ℏ = 1");
      if(result.stateAnalysis?.status==="resolved"){
        const state=result.stateAnalysis.states[index];
        for(const [axis,value] of Object.entries(state.bloch))
          add(cards,card(`sigma_${axis}`,"expectation",`⟨σ${axis}⟩`,`σ${axis}`,`eigenstate ${index}`,"computational |0⟩, |1⟩","dimensionless"),
            value,`stateAnalysis.states[${index}].bloch.${axis}`,`Eigenpair residual ${state.residualNorm.toExponential(2)}`);
        add(cards,card("population_1","population","P₁","|1⟩⟨1|",`eigenstate ${index}`,"computational |0⟩, |1⟩","probability"),
          state.populations[1],`stateAnalysis.states[${index}].populations[1]`,"Stored normalized eigenvector");
        add(cards,card("variance_z","variance","Var(σz)","I − ⟨σz⟩²",`eigenstate ${index}`,"computational |0⟩, |1⟩","dimensionless"),
          Math.max(0,1-state.bloch.z**2),"derived from stored ⟨σz⟩","Pauli identity σz² = I","derived");
      }else unavailable(cards,card("eigenstate_expectation","expectation","Eigenstate expectations","σx, σy, σz",`level ${index}`,"computational |0⟩, |1⟩","dimensionless"),
        result.stateAnalysis?.status==="degenerate"?"Unique eigenstate unavailable at degeneracy":"Legacy run stores energies only");
    }else if(result.operation==="evolve"&&coordinate.kind==="time"){
      const context=sources.evolution;
      if(!context||context.result.runId!==result.runId||context.selection.runId!==result.runId||
        context.selection.index!==coordinate.index||context.sample.index!==coordinate.index)return null;
      const sample=context.sample,state=`time ${sample.time}`;
      for(const [index,label] of ["P₀","P₁"].entries())
        add(cards,card(`p${index}`,"population",label,`|${index}⟩⟨${index}|`,state,"computational |0⟩, |1⟩","probability"),
          sample.populations[index],`data row ${sample.index}, p${index}`,"Verified 10-column evolution row");
      for(const [index,axis] of ["x","y","z"].entries())
        add(cards,card(`sigma_${axis}`,"expectation",`⟨σ${axis}⟩`,`σ${axis}`,state,"computational |0⟩, |1⟩","dimensionless"),
          sample.bloch[index],`data row ${sample.index}, sigma_${axis}`,"Verified 10-column evolution row");
      add(cards,card("variance_z","variance","Var(σz)","I − ⟨σz⟩²",state,"computational |0⟩, |1⟩","dimensionless"),
        Math.max(0,1-sample.bloch[2]**2),"derived from stored ⟨σz⟩","Pauli identity σz² = I","derived");
    }else if(result.operation==="cavity"&&coordinate.kind==="time"){
      const context=sources.cavity;
      if(!context||context.result.runId!==result.runId||context.selection.runId!==result.runId||
        context.selection.index!==coordinate.index||context.sample.index!==coordinate.index)return null;
      const sample=context.sample,state=`time ${sample.time}`,basis="qubit ⊗ truncated Fock";
      add(cards,card("p_excited","population","Excited population","|e⟩⟨e|",state,basis,"probability"),sample.pExcited,
        `data row ${sample.index}, p_excited`,"Boundary occupation reported separately");
      add(cards,card("mean_photon","occupation","Mean photons","a†a",state,basis,"photons"),sample.meanPhoton,
        `data row ${sample.index}, mean_photon`,"Finite Fock cutoff");
      add(cards,card("parity","expectation","Parity","Π",state,basis,"dimensionless"),sample.parity,
        `data row ${sample.index}, parity`,"Recorded parity; no full state vector");
      add(cards,card("boundary","diagnostic","Boundary occupation","cutoff projector",state,basis,"probability"),sample.boundaryProbability,
        `data row ${sample.index}, boundary_probability`,"Finite-cutoff diagnostic");
    }else if(result.operation==="lindblad"&&coordinate.kind==="time"){
      const context=sources.lindblad;
      if(!context||context.result.runId!==result.runId||context.selection.runId!==result.runId||
        context.selection.index!==coordinate.index||context.sample.index!==coordinate.index)return null;
      const sample=context.sample,state=`time ${sample.time}`,basis="qubit ⊗ truncated Fock; density-derived";
      for(const [id,category,label,operator,value,unit] of [
        ["p_excited","population","Excited population","|e⟩⟨e|",sample.pExcited,"probability"],
        ["mean_photon","occupation","Mean photons","a†a",sample.meanPhoton,"photons"],
        ["purity","diagnostic","Purity","Tr(ρ²)",sample.purity,"dimensionless"],
        ["coherence","diagnostic","Coherence","stored coherence readout",sample.coherence,"dimensionless"],
        ["boundary","diagnostic","Boundary occupation","cutoff projector",sample.boundaryProbability,"probability"],
        ["trace","diagnostic","Trace","Tr(ρ)",sample.trace,"dimensionless"]
      ] as const)add(cards,card(id,category,label,operator,state,basis,unit),value,
        `data row ${sample.index}, ${id}`,"Density-derived column; full ρ is not stored");
    }else if(result.operation==="circuit"&&coordinate.kind==="energy"){
      const context=sources.circuit;
      if(!context||context.result.runId!==result.runId||context.selection?.runId!==result.runId||
        context.selection.index!==coordinate.index||context.level?.index!==coordinate.index)return null;
      const level=context.level;
      add(cards,card("energy","energy",`E${level.index}`,"H",`charge-basis level ${level.index}`,"finite charge basis","GHz"),
        level.energyGHz,`spectrum.energies[${level.index}]`,`Cutoff drift E01 ${result.spectrum.cutoffDriftE01.toExponential(2)} GHz`);
      add(cards,card("charge_01","matrix_element","Charge matrix element 0↔1","|⟨0|n|1⟩|","levels 0 and 1","finite charge basis","dimensionless"),
        result.spectrum.chargeMatrixElement01,"spectrum.chargeMatrixElement01","Run-level 0↔1 readout, independent of selected level");
      unavailable(cards,card("charge_state","expectation","Selected-state charge","n",`level ${level.index}`,"finite charge basis","dimensionless"),
        "Charge-basis eigenvector and selected-state expectation are not stored");
    }else if(result.operation==="many_body"&&(coordinate.kind==="site"||coordinate.kind==="energy")){
      const context=sources.manyBody;
      if(!context||context.result.runId!==result.runId||context.selection?.runId!==result.runId||
        context.selection.index!==coordinate.index||context.item?.index!==coordinate.index)return null;
      const basis=`${result.model.parameters.sites}-site spin computational basis`,state="finite-chain ground state";
      if(coordinate.kind==="site"&&context.item.kind==="site_magnetization"){
        add(cards,card("site_z","expectation",`Site ${coordinate.index+1} ⟨σᶻ⟩`,`σᶻ_${coordinate.index+1}`,state,basis,"dimensionless"),
          context.item.magnetization,`groundState.siteMagnetization[${coordinate.index}]`,"Finite chain; no full state vector");
        const sites=result.groundState.siteMagnetization;
        if(sites.length!==result.model.parameters.sites)return null;
        add(cards,card("total_z","expectation","Total ⟨Σσᶻ⟩","Σᵢ σᶻᵢ",state,basis,"dimensionless"),
          sites.reduce((sum,value)=>sum+value,0),"sum of stored siteMagnetization","Explicit linear sum; not a new worker observable","derived");
      }else if(coordinate.kind==="energy"&&context.item.kind==="energy_level")
        add(cards,card("energy","energy",`E${coordinate.index}`,"H",`finite-chain level ${coordinate.index}`,basis,"normalized"),
          context.item.energy,`spectrum.lowEnergies[${coordinate.index}]`,"No selected excited-state vector stored");
      else return null;
      const sidecar=context.stateArtifact;
      if(coordinate.kind==="site"&&sidecar?.status==="resolved"&&sidecar.source.runId===result.runId&&
        sidecar.engine===result.engine.name&&sidecar.sites===result.model.parameters.sites&&sidecar.connectedZCorrelation){
        for(let j=0;j<sidecar.sites;j++)add(cards,card(`czz_${coordinate.index}_${j}`,"correlation",
          `Cᶻᶻ(${coordinate.index+1}, ${j+1})`,`⟨σᶻ_${coordinate.index+1}σᶻ_${j+1}⟩ − ⟨σᶻ_${coordinate.index+1}⟩⟨σᶻ_${j+1}⟩`,
          state,basis,"dimensionless"),sidecar.connectedZCorrelation[coordinate.index][j],
          `quantum-ising-state/v1 · row ${coordinate.index}, column ${j}`,
          `Verified source result SHA-256 ${sidecar.source.resultSha256.slice(0,12)}…`);
      }else unavailable(cards,card("czz","correlation","Connected Cᶻᶻᵢⱼ","⟨σᶻᵢσᶻⱼ⟩ − ⟨σᶻᵢ⟩⟨σᶻⱼ⟩",state,basis,"dimensionless"),
        sidecar?.status==="degenerate"?"No unique ground-state correlation at this degeneracy":
          "Run-bound state sidecar not loaded; site means alone cannot determine connected correlations");
      unavailable(cards,card("correlation_length","correlation","Correlation length","ξ",state,basis,"sites"),
        "No validated finite-size fit is defined for all 2–8-site configurations");
    }else if(result.operation==="sweep"&&coordinate.kind==="cell"){
      const context=sources.sweep;
      if(!context||context.result.runId!==result.runId||context.selection?.runId!==result.runId||
        context.selection.xIndex!==coordinate.xIndex||context.selection.yIndex!==coordinate.yIndex||
        context.cell?.xIndex!==coordinate.xIndex||context.cell.yIndex!==coordinate.yIndex)return null;
      add(cards,card("final_p1","transition","Final P₁","|1⟩⟨1|",`cell (${coordinate.xIndex}, ${coordinate.yIndex})`,
        "computational |0⟩, |1⟩","probability"),context.cell.finalP1,
        `row-major cell ${coordinate.yIndex*result.data.shape.x+coordinate.xIndex}`,"One saved grid run; no per-cell trajectory");
    }else if(result.operation==="topology"&&(coordinate.kind==="band"||coordinate.kind==="site"||coordinate.kind==="cell")){
      const context=sources.topology,sample=context?.sample;
      if(!context||context.result.runId!==result.runId||context.selection?.runId!==result.runId||!sample)return null;
      if(coordinate.kind==="band"&&sample.kind==="ssh_band"&&sample.index===coordinate.index){
        add(cards,card("lower_band","energy","Lower band","H(k)",`k=${sample.k}`,"SSH Bloch","normalized"),sample.lower,
          `analysis.lowerBand[${sample.index}]`,"Recorded band sample");
        add(cards,card("upper_band","energy","Upper band","H(k)",`k=${sample.k}`,"SSH Bloch","normalized"),sample.upper,
          `analysis.upperBand[${sample.index}]`,"Recorded band sample");
      }else if(coordinate.kind==="site"&&sample.kind==="ssh_site"&&sample.index===coordinate.index)
        add(cards,card("edge_density","density","Edge density","|ψ_edge|²",`site ${coordinate.index+1}`,"SSH finite chain","probability"),
          sample.density,`analysis.edgeDensity[${sample.index}]`,"Recorded site density");
      else if(coordinate.kind==="cell"&&sample.kind==="qwz_cell"&&result.model.type==="qwz"&&
        sample.xIndex===coordinate.xIndex&&sample.yIndex===coordinate.yIndex){
        add(cards,card("berry_curvature","geometry","Berry curvature","Fₖₓₖᵧ",`cell (${sample.xIndex}, ${sample.yIndex})`,"QWZ k mesh","dimensionless"),
          sample.curvature,`analysis.berryCurvature[${sample.xIndex*result.model.parameters.grid+sample.yIndex}]`,"Mesh-resolved recorded value");
        if(sample.lower!==null)add(cards,card("lower_band","energy","Lower band","H(k)","selected cell","QWZ Bloch","normalized"),
          sample.lower,"analysis.lowerBand[cell]","Supplied band surface");
        if(sample.upper!==null)add(cards,card("upper_band","energy","Upper band","H(k)","selected cell","QWZ Bloch","normalized"),
          sample.upper,"analysis.upperBand[cell]","Supplied band surface");
      }else return null;
    }else if(result.operation==="orbital"&&(coordinate.kind==="radial"||coordinate.kind==="voxel")){
      const context=sources.orbital,sample=context?.sample;
      if(!context||context.result.runId!==result.runId||context.selection?.runId!==result.runId||!sample)return null;
      if(coordinate.kind==="radial"&&sample.kind==="radial"&&sample.index===coordinate.index)
        add(cards,card("radial_probability","density","Radial probability density","r²|Rₙₗ(r)|²",`r=${sample.radius} a₀`,"hydrogenic radial","a₀⁻¹"),
          sample.probability,`analysis.radialProbability[${sample.index}]`,"Angular integral implicit");
      else if(coordinate.kind==="voxel"&&sample.kind==="voxel"&&sample.x===coordinate.x&&sample.y===coordinate.y&&sample.z===coordinate.z)
        add(cards,card("orbital_density","density","Orbital probability density","|ψ(r)|²",`voxel (${sample.x}, ${sample.y}, ${sample.z})`,
          "hydrogenic position","a₀⁻³"),sample.density,"verified voxel ψre, ψim","Derived from stored complex amplitudes","derived");
      else return null;
    }else if(result.operation.startsWith("oscillator")&&(coordinate.kind==="energy"||coordinate.kind==="position"||coordinate.kind==="time")){
      const context=sources.oscillator,item=context?.item;
      if(!context||context.result.runId!==result.runId||context.selection?.runId!==result.runId||
        context.selection.index!==coordinate.index||!item||item.index!==coordinate.index)return null;
      const basis="finite harmonic Fock basis";
      if(item.kind==="energy"&&coordinate.kind==="energy"){
        add(cards,card("energy","energy",`E${item.index}`,"H",`level ${item.index}`,basis,"normalized"),item.energy,
          `spectrum.energies[${item.index}]`,"Finite-cutoff result");
        if(result.operation==="oscillator_anharmonic"&&item.index===0)
          add(cards,card("x2","expectation","Ground ⟨x²⟩","x²","ground state",basis,"normalized²"),
            result.analysis.groundX2,"analysis.groundX2","Stored finite-cutoff expectation");
      }else if(item.kind==="position"&&coordinate.kind==="position")
        add(cards,card("position_density","density","Position density","|ψ(q)|²",`q=${item.q}`,"position q","normalized⁻¹"),
          item.density,`state.density[${item.index}]`,"Stored sampled number-state density");
      else if(item.kind==="time"&&coordinate.kind==="time"){
        const columns:Record<string,[ObservableCategory,string,string,string]>={
          q_mean:["expectation","⟨q⟩","q","normalized"],p_mean:["expectation","⟨p⟩","p","normalized"],
          q_variance:["variance","Var(q)","q² − ⟨q⟩²","normalized²"],
          p_variance:["variance","Var(p)","p² − ⟨p⟩²","normalized²"],
          mean_number:["occupation","Mean number","a†a","quanta"],
          purity:["diagnostic","Purity","Tr(ρ²)","dimensionless"],
          trace:["diagnostic","Trace","Tr(ρ)","dimensionless"],
          parity:["expectation","Parity","Π","dimensionless"],
          energy:["energy","Energy","H","normalized"],
          norm:["diagnostic","Norm","⟨ψ|ψ⟩","dimensionless"],
          coherence:["diagnostic","Coherence","stored coherence readout","dimensionless"],
          power:["diagnostic","Drive power","∂H/∂t","normalized/time"],
          boundary_probability:["diagnostic","Boundary probability","cutoff projector","probability"],
        };
        for(const [key,[category,label,operator,unit]] of Object.entries(columns)){
          const value=item.values[key];if(value===undefined)continue;
          add(cards,card(key,category,label,operator,`time row ${item.index}`,basis,unit),value,
            `data row ${item.index}, ${key}`,"Recorded artifact column");
        }
      }else return null;
    }else return null;
    if(!cards.length)return null;
    return {schema:"observable-workspace/v1",runId:result.runId,model:result.model.type,operation:result.operation,
      coordinate,engine:`${result.engine.name} ${result.engine.version}`,computedAt:result.provenance.computedAt,cards};
  }catch{return null;}
}
