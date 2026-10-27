/** Read-only comparison of independently saved Rice–Mele pump runs. */
export interface RiceMeleConvergencePlan {
  schema: "quantum-rice-mele-convergence-plan/v1";
  studyId: string;
  /** Ordered by increasing duration; all have the anchor's chain width. */
  durationRuns: string[];
  /** Ordered by increasing chain width; all have the anchor's duration. */
  widthRuns: string[];
  /** The one run shared by the two controlled series. */
  anchorRunId: string;
}
export interface RiceMeleConvergencePoint {
  runId: string; resultSha256: string; duration: number; chainCells: number;
  periodicCharge: number; chainCentralBondCharge: number;
  periodicStatus: "resolved" | "gap-closed" | "unresolved";
  chainStatus: "resolved" | "size-sensitive" | "unresolved";
  bulkTimeStepDrift: number; bulkMomentumDrift: number; bulkNormDrift: number;
  chainTimeStepDrift: number; chainWidthDrift: number;
  chainContinuityResidual: number; chainParticleDrift: number; chainNormDrift: number;
}
export interface RiceMeleConvergenceStudy {
  schema: "quantum-rice-mele-convergence-study/v1";
  studyId: string; plan: RiceMeleConvergencePlan; computedAt: string;
  cycle: {baseHopping:number;modulation:number;staggerAmplitude:number;staggerOffset:number;
    kSamples:number;phaseSamples:number;stepsPerPhase:number};
  sources: RiceMeleConvergencePoint[];
  durationRuns: string[]; widthRuns: string[];
  units: {duration:"inverse hopping energy";periodicCharge:"electron charge / cell";
    chainCentralBondCharge:"electron charge"};
}
const runId=/^[A-Za-z0-9_-]{1,100}$/;
const studyId=/^[A-Za-z0-9_-]{1,80}$/;
export function assertRiceMeleConvergencePlan(value:unknown):asserts value is RiceMeleConvergencePlan {
  const p=value as RiceMeleConvergencePlan;
  if(!p||p.schema!=="quantum-rice-mele-convergence-plan/v1"||typeof p.studyId!=="string"||
    !studyId.test(p.studyId)||typeof p.anchorRunId!=="string"||!runId.test(p.anchorRunId)||
    !Array.isArray(p.durationRuns)||!Array.isArray(p.widthRuns)||
    p.durationRuns.length<3||p.durationRuns.length>5||p.widthRuns.length<3||p.widthRuns.length>5||
    [...p.durationRuns,...p.widthRuns].some(id=>typeof id!=="string"||!runId.test(id))||
    p.durationRuns.filter(id=>id===p.anchorRunId).length!==1||
    p.widthRuns.filter(id=>id===p.anchorRunId).length!==1||
    new Set([...p.durationRuns,...p.widthRuns]).size!==p.durationRuns.length+p.widthRuns.length-1)
    throw new Error("Invalid bounded Rice–Mele convergence plan");
}
export function assertRiceMeleConvergenceStudy(value:unknown):asserts value is RiceMeleConvergenceStudy {
  const s=value as RiceMeleConvergenceStudy;
  if(!s||s.schema!=="quantum-rice-mele-convergence-study/v1")throw new Error("Invalid Rice–Mele convergence study");
  assertRiceMeleConvergencePlan(s.plan);
  if(s.studyId!==s.plan.studyId||!Number.isFinite(Date.parse(s.computedAt))||
    !s.cycle||Object.values(s.cycle).some(v=>typeof v!=="number"||!Number.isFinite(v))||
    !Array.isArray(s.sources)||s.sources.length!==s.plan.durationRuns.length+s.plan.widthRuns.length-1||
    s.sources.some(p=>!runId.test(p.runId)||!/^[a-f0-9]{64}$/.test(p.resultSha256)||
      Object.entries(p).some(([key,v])=>!["runId","resultSha256","periodicStatus","chainStatus"].includes(key)&&
        (typeof v!=="number"||!Number.isFinite(v))))||
    JSON.stringify(s.durationRuns)!==JSON.stringify(s.plan.durationRuns)||
    JSON.stringify(s.widthRuns)!==JSON.stringify(s.plan.widthRuns)||
    s.units?.duration!=="inverse hopping energy"||s.units.periodicCharge!=="electron charge / cell"||
    s.units.chainCentralBondCharge!=="electron charge")
    throw new Error("Invalid Rice–Mele convergence study");
}
