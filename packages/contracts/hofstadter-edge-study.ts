/** A bounded comparison of one periodic Harper run and two finite strips. */
export interface HofstadterEdgePlan {
  schema:"quantum-hofstadter-edge-plan/v1";studyId:string;p:number;q:number;
  hopping:number;grid:7|9|11;occupiedBands:number;stripSamples:17|31;
  widths:[number,number];
  /** When set, 17- and 31-point strips are paired at each width. */
  convergenceSamples?:17;
}
export interface EdgeSource {role:string;runId:string;resultSha256:string}
export interface EdgeCrossing {
  side:"left"|"right";stateIndex:number;interval:number;ky:number;direction:-1|1;
  minimumWeight:number;
}
export interface EdgeWidthEvidence {
  cells:number;crossings:EdgeCrossing[];leftFlow:number;rightFlow:number;
}
export interface TrackedEdgeCrossing extends EdgeCrossing {
  targetStateIndex:number;overlap:number;margin:number;
}
export interface TrackedEdgeWidthEvidence {
  cells:number;ambiguousCandidates:number;crossings:TrackedEdgeCrossing[];
  leftFlow:number;rightFlow:number;
}
export interface HofstadterEdgeStudy {
  schema:"quantum-hofstadter-edge-study/v1";studyId:string;plan:HofstadterEdgePlan;
  sources:EdgeSource[];
  bulk:{gapStatus:"open"|"gap-closed"|"mesh-unresolved";globalGap:number;
    fermiEnergy:number|null;hall:number|null;samplingConverged:boolean};
  widths:[EdgeWidthEvidence,EdgeWidthEvidence];
  /** Present only when both source strips saved overlap-validated continuation evidence. */
  tracking?:{method:"maximum-eigenvector-overlap/hungarian-v1";
    widths:[TrackedEdgeWidthEvidence,TrackedEdgeWidthEvidence];
    status:"consistent"|"undefined";reason:string;maximumKyDrift:number|null};
  convergence?:{method:"matched-termination-two-grid/v1";
    terminations:[{cells:number;origin:number;leftPhase:number;rightPhase:number},
      {cells:number;origin:number;leftPhase:number;rightPhase:number}];
    grids:[17,31];
    widths:{cells:number;coarseAmbiguous:number;fineAmbiguous:number;
      coarseCrossings:TrackedEdgeCrossing[];fineCrossings:TrackedEdgeCrossing[];
      coarseSeam:{minimumOverlap:number;minimumMargin:number;maximumEnergyDrift:number;ambiguousStates:number}|null;
      fineSeam:{minimumOverlap:number;minimumMargin:number;maximumEnergyDrift:number;ambiguousStates:number}|null;
      maximumKyDrift:number|null}[];
    status:"consistent"|"undefined";reason:string;maximumKyDrift:number|null};
  comparison:{status:"consistent"|"undefined";reason:string;maximumKyDrift:number|null};
  computedAt:string;
}
const id=/^[A-Za-z0-9_-]{1,80}$/;
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
export function assertHofstadterEdgePlan(value:unknown):asserts value is HofstadterEdgePlan {
  const p=value as HofstadterEdgePlan;
  if(!p||typeof p!=="object"||p.schema!=="quantum-hofstadter-edge-plan/v1"||
    typeof p.studyId!=="string"||!id.test(p.studyId)||!Number.isInteger(p.p)||
    !Number.isInteger(p.q)||p.q<3||p.q>7||p.p===0||Math.abs(p.p)>=p.q||gcd(Math.abs(p.p),p.q)!==1||
    !Number.isFinite(p.hopping)||p.hopping<.25||p.hopping>2||![7,9,11].includes(p.grid)||
    !Number.isInteger(p.occupiedBands)||p.occupiedBands<1||p.occupiedBands>=p.q||
    ![17,31].includes(p.stripSamples)||!Array.isArray(p.widths)||p.widths.length!==2||
    p.widths[0]!==18|| (p.convergenceSamples===undefined?
      p.widths[1]!==24:
      p.convergenceSamples!==17||p.stripSamples!==31||p.widths[1]!==18+p.q))
    throw new Error("Invalid bounded Hofstadter edge plan");
}
export function assertHofstadterEdgeStudy(value:unknown):asserts value is HofstadterEdgeStudy {
  const s=value as HofstadterEdgeStudy;
  if(!s||typeof s!=="object")throw new Error("Invalid Hofstadter edge study");
  assertHofstadterEdgePlan(s.plan);
  if(s.schema!=="quantum-hofstadter-edge-study/v1"||s.studyId!==s.plan.studyId||
    !Number.isFinite(Date.parse(s.computedAt))||!Array.isArray(s.sources)||
    s.sources.length!==(s.plan.convergenceSamples?5:3)||
    s.sources.some((v,i)=>v.role!==["bulk",...s.plan.widths.map(w=>`strip-${w}`),
      ...(s.plan.convergenceSamples?s.plan.widths.map(w=>`strip-${w}-coarse`):[])][i]||
      typeof v.runId!=="string"||!/^[A-Za-z0-9_-]{1,100}$/.test(v.runId)||
      typeof v.resultSha256!=="string"||!/^[a-f0-9]{64}$/.test(v.resultSha256))||
    !s.bulk||!Number.isFinite(s.bulk.globalGap)||
    !(s.bulk.fermiEnergy===null||Number.isFinite(s.bulk.fermiEnergy))||
    !(s.bulk.hall===null||Number.isInteger(s.bulk.hall))||
    !["open","gap-closed","mesh-unresolved"].includes(s.bulk.gapStatus)||
    typeof s.bulk.samplingConverged!=="boolean"||
    !Array.isArray(s.widths)||s.widths.length!==2||
    s.widths.some((w,i)=>w.cells!==s.plan.widths[i]||!Number.isInteger(w.leftFlow)||
      !Number.isInteger(w.rightFlow)||!Array.isArray(w.crossings)||w.crossings.length>2*w.cells*s.plan.stripSamples||
      w.crossings.some(c=>!["left","right"].includes(c.side)||
        !Number.isInteger(c.stateIndex)||c.stateIndex<0||c.stateIndex>=w.cells||
        !Number.isInteger(c.interval)||c.interval<0||c.interval>=s.plan.stripSamples-1||
        !Number.isFinite(c.ky)||![-1,1].includes(c.direction)||
        !Number.isFinite(c.minimumWeight)||c.minimumWeight<0||c.minimumWeight>1))||
    !s.comparison||!["consistent","undefined"].includes(s.comparison.status)||
    typeof s.comparison.reason!=="string"||s.comparison.reason.length>160||
    !(s.comparison.maximumKyDrift===null||Number.isFinite(s.comparison.maximumKyDrift)))
    throw new Error("Invalid Hofstadter edge study");
  if(s.tracking!==undefined){
    const t=s.tracking;
    if(t.method!=="maximum-eigenvector-overlap/hungarian-v1"||
      !["consistent","undefined"].includes(t.status)||typeof t.reason!=="string"||t.reason.length>160||
      !(t.maximumKyDrift===null||Number.isFinite(t.maximumKyDrift))||
      !Array.isArray(t.widths)||t.widths.length!==2||
      t.widths.some((w,i)=>w.cells!==s.plan.widths[i]||!Number.isInteger(w.ambiguousCandidates)||
        w.ambiguousCandidates<0||w.ambiguousCandidates>2*w.cells*s.plan.stripSamples||
        !Number.isInteger(w.leftFlow)||!Number.isInteger(w.rightFlow)||
        !Array.isArray(w.crossings)||w.crossings.length>2*w.cells*s.plan.stripSamples||
        w.crossings.some(c=>!["left","right"].includes(c.side)||
          !Number.isInteger(c.stateIndex)||c.stateIndex<0||c.stateIndex>=w.cells||
          !Number.isInteger(c.targetStateIndex)||c.targetStateIndex<0||c.targetStateIndex>=w.cells||
          !Number.isInteger(c.interval)||c.interval<0||c.interval>=s.plan.stripSamples-1||
          !Number.isFinite(c.ky)||![-1,1].includes(c.direction)||
          !Number.isFinite(c.minimumWeight)||c.minimumWeight<.35||c.minimumWeight>1||
          !Number.isFinite(c.overlap)||c.overlap<.5||c.overlap>1||
          !Number.isFinite(c.margin)||c.margin<.02||c.margin>1)))
      throw new Error("Invalid tracked Hofstadter edge evidence");
  }
  if(s.plan.convergenceSamples!==undefined){
    const c=s.convergence;
    if(!c||c.method!=="matched-termination-two-grid/v1"||c.grids[0]!==17||c.grids[1]!==31||
      c.terminations.length!==2||c.terminations.some((t,i)=>t.cells!==s.plan.widths[i]||
        t.origin!==0||t.leftPhase!==0||t.rightPhase!==(t.cells-1)%s.plan.q)||
      c.terminations[0].rightPhase!==c.terminations[1].rightPhase||
      c.widths.length!==2||c.widths.some((w,i)=>w.cells!==s.plan.widths[i]||
        !Number.isInteger(w.coarseAmbiguous)||!Number.isInteger(w.fineAmbiguous)||
        !Array.isArray(w.coarseCrossings)||!Array.isArray(w.fineCrossings)||
        ![w.coarseSeam,w.fineSeam].every(seam=>seam===null||Number.isFinite(seam.minimumOverlap)&&
          Number.isFinite(seam.minimumMargin)&&Number.isFinite(seam.maximumEnergyDrift)&&
          Number.isInteger(seam.ambiguousStates))||
        !(w.maximumKyDrift===null||Number.isFinite(w.maximumKyDrift)))||
      !["consistent","undefined"].includes(c.status)||typeof c.reason!=="string"||c.reason.length>160||
      !(c.maximumKyDrift===null||Number.isFinite(c.maximumKyDrift)))
      throw new Error("Invalid Hofstadter edge convergence evidence");
  }else if(s.convergence!==undefined)throw new Error("Legacy study cannot claim grid convergence");
}
