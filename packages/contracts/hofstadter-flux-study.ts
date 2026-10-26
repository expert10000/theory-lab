export interface HofstadterFluxPlan {
  schema:"quantum-hofstadter-flux-plan/v1";studyId:string;
  hopping:number;grid:7|9|11;maxDenominator:number;occupiedBands:number|null;
}
export interface HofstadterFluxPoint {
  index:number;p:number;q:number;runId:string;resultSha256:string;
  energies:number[][];coarseBounds:[number,number][];fineBounds:[number,number][];
  extremaDrift:number[];converged:boolean;
  gaps:{occupiedBands:number;fineGap:number;status:"defined"|"gap-closed"|"mesh-unresolved"}[];
  filling:{occupiedBands:number;coarseGlobalGap:number;fineGlobalGap:number;
    gapStatus:"open"|"gap-closed"|"mesh-unresolved";
    conductance:number|null;status:"defined"|"gap-closed"|"mesh-unresolved"}|null;
}
export interface HofstadterFluxStudy {
  schema:"quantum-hofstadter-flux-study/v1";studyId:string;plan:HofstadterFluxPlan;
  status:"completed"|"cancelled";points:HofstadterFluxPoint[];computedAt:string;
}
export const reducedFluxes=(maxDenominator:number):{p:number;q:number}[]=>{
  if(!Number.isInteger(maxDenominator)||maxDenominator<3||maxDenominator>7)throw new Error("Flux denominator must be 3..7");
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
  return [{p:0,q:1},...Array.from({length:maxDenominator-1},(_,i)=>i+2)
    .flatMap(q=>Array.from({length:q-1},(_,i)=>({p:i+1,q})).filter(v=>gcd(v.p,v.q)===1))]
    .sort((a,b)=>a.p/a.q-b.p/b.q);
};
export function assertHofstadterFluxPlan(value:unknown):asserts value is HofstadterFluxPlan {
  const p=value as HofstadterFluxPlan;
  if(!p||typeof p!=="object"||Object.keys(p).sort().join()!==["schema","studyId","hopping","grid","maxDenominator","occupiedBands"].sort().join()||
    p.schema!=="quantum-hofstadter-flux-plan/v1"||typeof p.studyId!=="string"||!/^[A-Za-z0-9_-]{1,80}$/.test(p.studyId)||
    !Number.isFinite(p.hopping)||p.hopping<.25||p.hopping>2||![7,9,11].includes(p.grid)||
    !Number.isInteger(p.maxDenominator)||p.maxDenominator<3||p.maxDenominator>7||
    !(p.occupiedBands===null||(Number.isInteger(p.occupiedBands)&&p.occupiedBands>=1&&p.occupiedBands<p.maxDenominator)))
    throw new Error("Invalid bounded Hofstadter flux plan");
}
export function assertHofstadterFluxStudy(value:unknown):asserts value is HofstadterFluxStudy {
  const s=value as HofstadterFluxStudy;
  if(!s||typeof s!=="object"||Object.keys(s).sort().join()!==["schema","studyId","plan","status","points","computedAt"].sort().join())throw new Error("Invalid flux study");
  assertHofstadterFluxPlan(s.plan);
  const fluxes=reducedFluxes(s.plan.maxDenominator);
  if(s.schema!=="quantum-hofstadter-flux-study/v1"||s.studyId!==s.plan.studyId||
    (s.status!=="completed"&&s.status!=="cancelled")||!Array.isArray(s.points)||s.points.length>fluxes.length||
    (s.status==="completed")!==(s.points.length===fluxes.length)||!Number.isFinite(Date.parse(s.computedAt)))throw new Error("Invalid flux study");
  for(const [index,point] of s.points.entries()){
    const flux=fluxes[index],grid=s.plan.grid;
    if(!point||Object.keys(point).sort().join()!==["index","p","q","runId","resultSha256","energies","coarseBounds","fineBounds","extremaDrift","converged","gaps","filling"].sort().join()||
      point.index!==index||point.p!==flux.p||point.q!==flux.q||typeof point.runId!=="string"||!/^[A-Za-z0-9_-]{1,100}$/.test(point.runId)||
      typeof point.resultSha256!=="string"||!/^[a-f0-9]{64}$/.test(point.resultSha256)||
      !Array.isArray(point.energies)||point.energies.length!==flux.q||!point.energies.every(row=>Array.isArray(row)&&row.length===grid*grid&&row.every(Number.isFinite))||
      ![point.coarseBounds,point.fineBounds].every(bounds=>Array.isArray(bounds)&&bounds.length===flux.q&&bounds.every(row=>Array.isArray(row)&&row.length===2&&row.every(Number.isFinite)))||
      !Array.isArray(point.extremaDrift)||point.extremaDrift.length!==flux.q||!point.extremaDrift.every(Number.isFinite)||typeof point.converged!=="boolean"||
      !Array.isArray(point.gaps)||point.gaps.length!==flux.q-1||point.gaps.some((gap,i)=>gap.occupiedBands!==i+1||!Number.isFinite(gap.fineGap)||!["defined","gap-closed","mesh-unresolved"].includes(gap.status)))throw new Error("Invalid flux point");
    const f=point.filling,filled=s.plan.occupiedBands!==null&&s.plan.occupiedBands<flux.q;
    if(filled!==!!f)throw new Error("Invalid flux filling");
    if(f&& (f.occupiedBands!==s.plan.occupiedBands||!Number.isFinite(f.coarseGlobalGap)||!Number.isFinite(f.fineGlobalGap)||
      !["open","gap-closed","mesh-unresolved"].includes(f.gapStatus)||!["defined","gap-closed","mesh-unresolved"].includes(f.status)||
      !(f.conductance===null||Number.isInteger(f.conductance))||
      (f.status==="defined")!==(f.conductance!==null)))throw new Error("Invalid conditional Hall value");
  }
}
