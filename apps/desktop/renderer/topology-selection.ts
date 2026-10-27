import type {TopologyResult} from "../../../packages/contracts";

export type TopologySelection=
  | {kind:"ssh_band";runId:string;index:number}
  | {kind:"ssh_site";runId:string;index:number}
  | {kind:"rice_mele_band";runId:string;index:number}
  | {kind:"rice_mele_site";runId:string;index:number}
  | {kind:"rice_mele_pump_sample";runId:string;phaseIndex:number;kIndex:number}
  | {kind:"rice_mele_dynamic_sample";runId:string;timeIndex:number;kIndex:number}
  | {kind:"rice_mele_chain_sample";runId:string;timeIndex:number;siteIndex:number}
  | {kind:"qwz_cell";runId:string;xIndex:number;yIndex:number}
  | {kind:"bbh_cell";runId:string;index:number}
  | {kind:"kitaev_band";runId:string;index:number}
  | {kind:"kitaev_site";runId:string;index:number}
  | {kind:"weyl_sphere_sample";runId:string;index:number}
  | {kind:"nodal_loop_sample";runId:string;index:number}
  | {kind:"landau_level_sample";runId:string;fieldIndex:number;level:number}
  | {kind:"hofstadter_band_sample";runId:string;band:number;xIndex:number;yIndex:number}
  | {kind:"hofstadter_strip_sample";runId:string;state:number;kIndex:number}
  | {kind:"bhz_ribbon_state";runId:string;index:number};
export type TopologySample=
  | {kind:"ssh_band";index:number;k:number;lower:number;upper:number}
  | {kind:"ssh_site";index:number;density:number}
  | {kind:"rice_mele_band";index:number;k:number;lower:number;upper:number}
  | {kind:"rice_mele_site";index:number;density:number}
  | {kind:"rice_mele_pump_sample";phaseIndex:number;kIndex:number;phase:number;k:number;t1:number;t2:number;delta:number;lower:number;upper:number;berryFlux:number;polarization:number}
  | {kind:"rice_mele_dynamic_sample";timeIndex:number;kIndex:number;time:number;phase:number;k:number;current:number;localCurrent:number;charge:number;excitedPopulation:number}
  | {kind:"rice_mele_chain_sample";timeIndex:number;siteIndex:number;time:number;phase:number;density:number;rightBondCurrent:number|null;centralBondCharge:number;leftEdgePopulation:number;rightEdgePopulation:number}
  | {kind:"qwz_cell";xIndex:number;yIndex:number;curvature:number;lower:number|null;upper:number|null}
  | {kind:"bbh_cell";index:number;xIndex:number;yIndex:number;density:number}
  | {kind:"kitaev_band";index:number;k:number;lower:number;upper:number}
  | {kind:"kitaev_site";index:number;density:number}
  | {kind:"weyl_sphere_sample";index:number;q:[number,number,number];lower:number;upper:number;berry:[number,number,number]}
  | {kind:"nodal_loop_sample";index:number;q:[number,number,number];lower:number;upper:number}
  | {kind:"landau_level_sample";fieldIndex:number;level:number;field:number;energy:number;frequency:number;coarseError:number;fineError:number}
  | {kind:"hofstadter_band_sample";band:number;xIndex:number;yIndex:number;kx:number;ky:number;energy:number}
  | {kind:"hofstadter_strip_sample";state:number;kIndex:number;ky:number;energy:number;leftWeight:number;rightWeight:number}
  | {kind:"bhz_ribbon_state";index:number;k:number;energy:number;edgeWeight:number;density:number[];spin:number[];amplitudes:[number,number][]};
export interface TopologyRunContext {
  result:TopologyResult;
  selection:TopologySelection|null;
  sample:TopologySample|null;
  stale:boolean;
}
export function selectedTopologySample(selection:TopologySelection|null,result:TopologyResult|null):TopologySample|null{
  if(!selection||!result||selection.runId!==result.runId)return null;
  const analysis=result.analysis;
  if(result.model.type==="rice_mele_pump"&&analysis.kind==="rice_mele_pump"&&analysis.finiteChain&&selection.kind==="rice_mele_chain_sample"){
    const c=analysis.finiteChain,{timeIndex,siteIndex}=selection;
    if(!Number.isInteger(timeIndex)||!Number.isInteger(siteIndex)||timeIndex<0||timeIndex>=c.timeValues.length||siteIndex<0||siteIndex>=c.sites)return null;
    return {kind:"rice_mele_chain_sample",timeIndex,siteIndex,time:c.timeValues[timeIndex],phase:c.phaseValues[timeIndex],
      density:c.siteDensity[timeIndex*c.sites+siteIndex],rightBondCurrent:siteIndex<c.sites-1?c.bondElectronCurrent[timeIndex*(c.sites-1)+siteIndex]:null,
      centralBondCharge:c.centralBondCharge[timeIndex],leftEdgePopulation:c.leftEdgePopulation[timeIndex],rightEdgePopulation:c.rightEdgePopulation[timeIndex]};
  }
  if(result.model.type==="rice_mele_pump"&&analysis.kind==="rice_mele_pump"&&analysis.dynamics&&selection.kind==="rice_mele_dynamic_sample"){
    const d=analysis.dynamics,{timeIndex,kIndex}=selection,n=d.kValues.length;
    if(!Number.isInteger(timeIndex)||!Number.isInteger(kIndex)||timeIndex<0||timeIndex>=d.timeValues.length||kIndex<0||kIndex>=n)return null;
    return {kind:"rice_mele_dynamic_sample",timeIndex,kIndex,time:d.timeValues[timeIndex],phase:d.phaseValues[timeIndex],k:d.kValues[kIndex],
      current:d.current[timeIndex],localCurrent:d.currentByK[timeIndex*n+kIndex],charge:d.charge[timeIndex],
      excitedPopulation:d.excitedPopulation[timeIndex]};
  }
  if(result.model.type==="rice_mele_pump"&&analysis.kind==="rice_mele_pump"&&selection.kind==="rice_mele_pump_sample"){
    const {phaseIndex,kIndex}=selection,n=analysis.kValues.length;
    if(!Number.isInteger(phaseIndex)||!Number.isInteger(kIndex)||phaseIndex<0||phaseIndex>=analysis.phaseValues.length||kIndex<0||kIndex>=n)return null;
    const j=phaseIndex*n+kIndex;
    return {kind:"rice_mele_pump_sample",phaseIndex,kIndex,phase:analysis.phaseValues[phaseIndex],k:analysis.kValues[kIndex],
      t1:analysis.t1Values[phaseIndex],t2:analysis.t2Values[phaseIndex],delta:analysis.deltaValues[phaseIndex],
      lower:analysis.lowerBand[j],upper:analysis.upperBand[j],berryFlux:analysis.berryFlux[j],polarization:analysis.polarization[phaseIndex]};
  }
  if(result.model.type==="rice_mele"&&analysis.kind==="rice_mele"){
    if(selection.kind==="rice_mele_band"&&Number.isInteger(selection.index)&&selection.index>=0&&selection.index<analysis.kValues.length){
      const index=selection.index;return {kind:"rice_mele_band",index,k:analysis.kValues[index],lower:analysis.lowerBand[index],upper:analysis.upperBand[index]};
    }
    if(selection.kind==="rice_mele_site"&&Number.isInteger(selection.index)&&selection.index>=0&&selection.index<analysis.middleDensity.length){
      const index=selection.index;return {kind:"rice_mele_site",index,density:analysis.middleDensity[index]};
    }
  }
  if(result.model.type==="hofstadter"&&analysis.kind==="hofstadter"&&selection.kind==="hofstadter_band_sample"){
    const {band,xIndex,yIndex}=selection,g=analysis.kxValues.length;
    if(![band,xIndex,yIndex].every(Number.isInteger)||band<0||band>=analysis.bandIndices.length||
       xIndex<0||xIndex>=g||yIndex<0||yIndex>=analysis.kyValues.length)return null;
    return {kind:"hofstadter_band_sample",band,xIndex,yIndex,kx:analysis.kxValues[xIndex],
      ky:analysis.kyValues[yIndex],energy:analysis.bandEnergies[band][xIndex*g+yIndex]};
  }
  if(result.model.type==="hofstadter"&&analysis.kind==="hofstadter"&&selection.kind==="hofstadter_strip_sample"){
    const strip=analysis.strip,{state,kIndex}=selection;
    if(!strip||!Number.isInteger(state)||!Number.isInteger(kIndex)||state<0||
       state>=strip.cells||kIndex<0||kIndex>=strip.kyValues.length)return null;
    return {kind:"hofstadter_strip_sample",state,kIndex,ky:strip.kyValues[kIndex],
      energy:strip.energies[state][kIndex],leftWeight:strip.leftWeights[state][kIndex],
      rightWeight:strip.rightWeights[state][kIndex]};
  }
  if(result.model.type==="landau_continuum"&&analysis.kind==="landau_continuum"&&selection.kind==="landau_level_sample"){
    const {fieldIndex,level}=selection;
    if(!Number.isInteger(fieldIndex)||!Number.isInteger(level)||fieldIndex<0||level<0||
      fieldIndex>=analysis.fieldValues.length||level>=analysis.levelIndices.length)return null;
    return {kind:"landau_level_sample",fieldIndex,level,field:analysis.fieldValues[fieldIndex],
      energy:analysis.energies[fieldIndex][level],frequency:analysis.cyclotronFrequencies[fieldIndex],
      coarseError:analysis.coarseMaxErrors[fieldIndex],fineError:analysis.fineMaxErrors[fieldIndex]};
  }
  if(result.model.type==="nodal_line_two_band"&&analysis.kind==="nodal_line_two_band"&&selection.kind==="nodal_loop_sample"){
    const index=selection.index;
    if(!Number.isInteger(index)||index<0||index>=analysis.loopPositions.length)return null;
    return {kind:"nodal_loop_sample",index,q:analysis.loopPositions[index],lower:analysis.lowerBand[index],upper:analysis.upperBand[index]};
  }
  if(result.model.type==="weyl_minimal"&&analysis.kind==="weyl_minimal"&&selection.kind==="weyl_sphere_sample"){
    const index=selection.index;
    if(!Number.isInteger(index)||index<0||index>=analysis.positions.length)return null;
    return {kind:"weyl_sphere_sample",index,q:analysis.positions[index],lower:analysis.lowerBand[index],
      upper:analysis.upperBand[index],berry:analysis.berryCurvature[index]};
  }
  if(result.model.type==="kitaev_chain"&&analysis.kind==="kitaev_chain"){
    if(selection.kind==="kitaev_band"&&Number.isInteger(selection.index)&&selection.index>=0&&selection.index<analysis.kValues.length){
      const index=selection.index;
      return {kind:"kitaev_band",index,k:analysis.kValues[index],lower:analysis.lowerBand[index],upper:analysis.upperBand[index]};
    }
    if(selection.kind==="kitaev_site"&&Number.isInteger(selection.index)&&selection.index>=0&&selection.index<analysis.finite.siteDensity.length)
      return {kind:"kitaev_site",index:selection.index,density:analysis.finite.siteDensity[selection.index]};
  }
  if(result.model.type==="bbh"&&analysis.kind==="bbh"&&selection.kind==="bbh_cell"){
    const index=selection.index,c=analysis.finite.cells;
    if(!Number.isInteger(index)||index<0||index>=c*c)return null;
    return {kind:"bbh_cell",index,xIndex:Math.floor(index/c),yIndex:index%c,density:analysis.finite.midgapDensity[index]};
  }
  if(result.model.type==="ssh"&&analysis.kind==="ssh"){
    if(selection.kind==="ssh_band"&&Number.isInteger(selection.index)&&selection.index>=0&&selection.index<analysis.kValues.length){
      const k=analysis.kValues[selection.index],lower=analysis.lowerBand[selection.index],upper=analysis.upperBand[selection.index];
      return [k,lower,upper].every(Number.isFinite)?{kind:"ssh_band",index:selection.index,k,lower,upper}:null;
    }
    if(selection.kind==="ssh_site"&&Number.isInteger(selection.index)&&selection.index>=0&&selection.index<analysis.edgeDensity.length){
      const density=analysis.edgeDensity[selection.index];
      return Number.isFinite(density)?{kind:"ssh_site",index:selection.index,density}:null;
    }
  }
  if(result.model.type==="qwz"&&analysis.kind==="qwz"&&selection.kind==="qwz_cell"&&!analysis.gapClosed){
    const grid=result.model.parameters.grid,{xIndex,yIndex}=selection,index=xIndex*grid+yIndex;
    if(!Number.isInteger(xIndex)||!Number.isInteger(yIndex)||xIndex<0||xIndex>=grid||yIndex<0||yIndex>=grid||analysis.berryCurvature.length!==grid*grid)return null;
    const curvature=analysis.berryCurvature[index];
    const lower=analysis.lowerBand?.[index]??null,upper=analysis.upperBand?.[index]??null;
    return Number.isFinite(curvature)&&(lower===null||Number.isFinite(lower))&&(upper===null||Number.isFinite(upper))?
      {kind:"qwz_cell",xIndex,yIndex,curvature,lower,upper}:null;
  }
  if(result.model.type==="bhz_general"&&analysis.kind==="bhz_general"&&selection.kind==="bhz_ribbon_state"){
    const index=selection.index,state=analysis.edge.states[index];
    if(!Number.isInteger(index)||index<0||index>=analysis.edge.states.length||!state)return null;
    return {kind:"bhz_ribbon_state",index,k:analysis.edge.kValues[analysis.edge.selectedKIndex],
      energy:state.energy,edgeWeight:state.edgeWeight,density:state.density,spin:state.spin,amplitudes:state.amplitudes};
  }
  return null;
}
