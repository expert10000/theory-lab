import type { VerifiedSavedRun } from "../../../packages/contracts";

export type ValidationCheck = { name: string; status: "checked" | "warning" | "unavailable";
  detail: string };

/** Renderer-only diagnostics from an already reopened, hash-verified saved run. */
export function savedRunValidation(run: VerifiedSavedRun): ValidationCheck[] {
  const result = run.result;
  const checks: ValidationCheck[] = [
    { name: "Source integrity", status: "checked", detail: "Job, result and optional binary artifact were reopened through the saved-run verifier." },
  ];
  const rows = "data" in result && run.data && "columns" in result.data && "rows" in result.data &&
    run.data.byteLength === result.data.rows * result.data.columns.length * 8 ? {
      columns: result.data.columns as readonly string[], count: result.data.rows,
      values: new DataView(run.data.buffer, run.data.byteOffset, run.data.byteLength),
    } : null;
  const series = (name: string): number[] | null => {
    if (!rows) return null;
    const column = rows.columns.indexOf(name);
    return column < 0 ? null : Array.from({ length: rows.count }, (_, index) =>
      rows.values.getFloat64((index * rows.columns.length + column) * 8, true));
  };
  if (result.operation === "evolve") {
    const p0 = series("p0"), p1 = series("p1");
    if (p0 && p1) {
      const drift = Math.max(...p0.map((value, index) => Math.abs(value + p1[index] - 1)));
      checks.push({ name: "Normalization", status: drift <= 1e-6 ? "checked" : "warning",
        detail: `Maximum stored |P₀+P₁−1| = ${drift.toExponential(3)} across ${p0.length} samples.` });
    }
  }
  const trace = series("trace");
  if (trace?.length) {
    const drift = Math.max(...trace.map(value => Math.abs(value - 1)));
    checks.push({ name: "Trace", status: drift <= 2e-6 ? "checked" : "warning",
      detail: `Maximum stored |Tr ρ−1| = ${drift.toExponential(3)} across ${trace.length} samples.` });
  }
  if (result.operation === "diagonalize" && result.stateAnalysis?.status === "resolved") {
    const [a, b] = result.stateAnalysis.states.map(state => state.amplitudes);
    const overlap = Math.abs(a[0] * b[0] + a[1] * b[1]);
    checks.push({ name: "Orthogonality", status: overlap <= 1e-6 ? "checked" : "warning",
      detail: `Stored two-state |⟨u₀|u₁⟩| = ${overlap.toExponential(3)}; residuals ${result.stateAnalysis.states.map(state => state.residualNorm.toExponential(2)).join(" / ")}.` });
  }
  if (result.operation === "oscillator_damped" && rows) {
    const cutoff = result.model.parameters.cutoff;
    const position = (name: string) => rows.columns.indexOf(name);
    let maximum = 0, complete = true;
    for (let i = 0; i < cutoff; i++) for (let j = 0; j < cutoff; j++) {
      const re = position(`rho_${i}_${j}_re`), im = position(`rho_${i}_${j}_im`);
      const mirroredRe = position(`rho_${j}_${i}_re`), mirroredIm = position(`rho_${j}_${i}_im`);
      if (re < 0 || im < 0 || mirroredRe < 0 || mirroredIm < 0) { complete = false; break; }
      for (let sample = 0; sample < rows.count; sample++) {
        const at = (column: number) => rows.values.getFloat64((sample * rows.columns.length + column) * 8, true);
        maximum = Math.max(maximum, Math.hypot(at(re) - at(mirroredRe), at(im) + at(mirroredIm)));
      }
    }
    if (complete) checks.push({ name: "Hermiticity", status: maximum <= 2e-6 ? "checked" : "warning",
      detail: `Maximum stored |ρᵢⱼ−ρⱼᵢ*| = ${maximum.toExponential(3)} across ${rows.count} density matrices.` });
  }
  if (result.operation === "topology") {
    const analysis = result.analysis as { kind: string; gapClosed?: boolean; status?: string;
      converged?: boolean; meshResolved?: boolean; chern?: number | null; winding?: number | null };
    const unresolved = analysis.gapClosed || analysis.status === "unresolved" || analysis.status === "gap-closed";
    checks.push({ name: "Topological invariant", status: unresolved ? "warning" : "checked",
      detail: unresolved ? "Gap closure or unresolved status: no invariant is inferred." :
        `Producer analysis ${analysis.kind}; Chern ${analysis.chern ?? "not supplied"}, winding ${analysis.winding ?? "not supplied"}.` });
    if (analysis.converged !== undefined || analysis.meshResolved !== undefined)
      checks.push({ name: "Resolution diagnostic", status: analysis.converged === false || analysis.meshResolved === false ? "warning" : "checked",
        detail: `Recorded mesh resolved: ${analysis.meshResolved ?? "not supplied"}; finite-grid check: ${analysis.converged ?? "not supplied"}. This is not an infinite-grid proof.` });
  }
  if (result.operation === "circuit") checks.push({ name: "Cutoff sensitivity", status: "warning",
    detail: `Stored |ΔE₀₁| at larger charge cutoff = ${result.spectrum.cutoffDriftE01.toExponential(3)} GHz; inspect more cutoffs for convergence.` });
  if (!checks.some(check => check.name === "Hermiticity")) checks.push({ name: "Hermiticity", status: "unavailable",
    detail: "No full stored density matrix is available for a matrix-wide Hermiticity check." });
  if (!checks.some(check => check.name === "Normalization")) checks.push({ name: "Normalization", status: "unavailable",
    detail: "No directly comparable normalized population series is present in this saved result." });
  if (!checks.some(check => check.name === "Trace")) checks.push({ name: "Trace", status: "unavailable",
    detail: "No full stored trace series is present in this saved result." });
  if (!checks.some(check => check.name === "Orthogonality")) checks.push({ name: "Orthogonality", status: "unavailable",
    detail: "No resolved paired eigenvectors are stored for this result." });
  if (!checks.some(check => check.name === "Resolution diagnostic")) checks.push({ name: "Convergence", status: "unavailable",
    detail: "A separate refinement comparison is not recorded; no convergence claim is made." });
  return checks;
}
