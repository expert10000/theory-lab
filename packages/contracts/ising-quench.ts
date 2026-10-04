export interface IsingQuenchRequest {targetTransverse:number;duration:number;samples:number}
export interface IsingQuenchArtifact {
  schema:"quantum-ising-quench/v1";
  source:{runId:string;jobSha256:string;resultSha256:string};
  initial:{sites:number;interaction:number;transverse:number;longitudinal:number;boundary:"open"|"periodic";groundEnergy:number;gap:number};
  targetTransverse:number;duration:number;samples:number;basis:"z-up-is-0-msb-first";
  columns:"time,site_magnetization,norm,energy";
  rows:{time:number;siteMagnetization:number[];norm:number;energy:number}[];
  maximumNormDrift:number;maximumEnergyDrift:number;
  provenance:{engine:"native";sourceEngine:"native"|"quspin";pythonVersion:string;workerVersion:string;computedAt:string};
}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const fields=(v:Record<string,unknown>,keys:readonly string[])=>
  Object.keys(v).length===keys.length&&keys.every(key=>Object.hasOwn(v,key));
const finite=(v:unknown)=>typeof v==="number"&&Number.isFinite(v);
const bounded=(v:unknown,min:number,max:number)=>typeof v==="number"&&Number.isFinite(v)&&v>=min&&v<=max;
export function isIsingQuenchArtifact(value:unknown):value is IsingQuenchArtifact{
  if(!record(value)||!fields(value,["schema","source","initial","targetTransverse","duration","samples","basis","columns","rows","maximumNormDrift","maximumEnergyDrift","provenance"])||
    value.schema!=="quantum-ising-quench/v1"||!record(value.source)||!fields(value.source,["runId","jobSha256","resultSha256"])||
    typeof value.source.runId!=="string"||!/^[A-Za-z0-9_-]{1,100}$/.test(value.source.runId)||
    ![value.source.jobSha256,value.source.resultSha256].every(hash=>typeof hash==="string"&&/^[a-f0-9]{64}$/.test(hash))||
    !record(value.initial)||!fields(value.initial,["sites","interaction","transverse","longitudinal","boundary","groundEnergy","gap"])||
    !Number.isInteger(value.initial.sites)||!bounded(value.initial.sites,2,8)||
    ![value.initial.interaction,value.initial.transverse,value.initial.longitudinal].every(v=>bounded(v,-10,10))||
    !["open","periodic"].includes(String(value.initial.boundary))||!finite(value.initial.groundEnergy)||!bounded(value.initial.gap,0,Infinity)||
    !bounded(value.targetTransverse,-10,10)||!bounded(value.duration,Number.MIN_VALUE,20)||
    !Number.isInteger(value.samples)||!bounded(value.samples,5,101)||
    value.basis!=="z-up-is-0-msb-first"||value.columns!=="time,site_magnetization,norm,energy"||
    !Array.isArray(value.rows)||!bounded(value.maximumNormDrift,0,1e-5)||!bounded(value.maximumEnergyDrift,0,1e-5)||
    !record(value.provenance)||!fields(value.provenance,["engine","sourceEngine","pythonVersion","workerVersion","computedAt"])||
    value.provenance.engine!=="native"||!["native","quspin"].includes(String(value.provenance.sourceEngine))||
    ![value.provenance.pythonVersion,value.provenance.workerVersion,value.provenance.computedAt].every(v=>typeof v==="string"&&v.length>0))return false;
  const artifact=value as unknown as IsingQuenchArtifact;
  const rows=artifact.rows,n=artifact.initial.sites,step=artifact.duration/(artifact.samples-1);
  if(rows.length!==artifact.samples||rows.some((row,i)=>!record(row)||!fields(row,["time","siteMagnetization","norm","energy"])||
    !bounded(row.time,0,20)||!Array.isArray(row.siteMagnetization)||row.siteMagnetization.length!==n||
    row.siteMagnetization.some(v=>!bounded(v,-1.000001,1.000001))||!bounded(row.norm,.99999,1.00001)||!finite(row.energy)||
    Math.abs(row.time-i*step)>1e-8||Math.abs(row.norm-1)>1e-5))return false;
  return Math.abs(rows[0].time)<1e-10&&Math.abs(rows.at(-1)!.time-artifact.duration)<1e-8&&
    Math.abs(artifact.maximumNormDrift-Math.max(...rows.map(row=>Math.abs(row.norm-1))))<1e-8&&
    Math.abs(artifact.maximumEnergyDrift-Math.max(...rows.map(row=>Math.abs(row.energy-rows[0].energy))))<1e-8;
}
export function isIsingQuenchRequest(value:unknown):value is IsingQuenchRequest{
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const v=value as Record<string,unknown>;
  return Object.keys(v).length===3&&typeof v.targetTransverse==="number"&&Number.isFinite(v.targetTransverse)&&Math.abs(v.targetTransverse)<=10&&
    typeof v.duration==="number"&&Number.isFinite(v.duration)&&v.duration>0&&v.duration<=20&&
    Number.isInteger(v.samples)&&typeof v.samples==="number"&&v.samples>=5&&v.samples<=101;
}
