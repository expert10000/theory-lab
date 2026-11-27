import type { BdGSectorJob, BdGSectorParameters, BdGSectorResult, BdGSectorSample } from "../contracts/bdg-sector";

const close = (a: number, b: number) => Number.isFinite(a) && Math.abs(a-b) <= 2e-7*(1+Math.abs(b));
export const bdgSectorJob = (parameters: BdGSectorParameters, jobId: string): BdGSectorJob =>
  ({ schema: "quantum-bdg-sector-job/v1", jobId, model: { type: "reduced_bdg_2x2", parameters } });

/** Analytic spectrum in a reduced Nambu sector; no material dispersion is inferred. */
export function bdgSectorSpectrum({extent, delta, phaseRad, points}: BdGSectorParameters): BdGSectorSample[] {
  return Array.from({length: points}, (_, i) => {
    const xi = extent*(2*i/(points-1)-1);
    const energy = Math.hypot(xi, delta);
    const node = energy === 0;
    return { xi, eMinus: -energy, ePlus: energy,
      electronWeight: node ? null : (1+xi/energy)/2,
      holeWeight: node ? null : (1-xi/energy)/2,
      pairingPhaseRad: delta === 0 ? null : phaseRad, node };
  });
}

export function consistentBdGSectorResult(job: BdGSectorJob, result: BdGSectorResult): boolean {
  if (result.jobId !== job.jobId || result.status !== "completed" ||
      JSON.stringify(result.model) !== JSON.stringify(job.model) ||
      result.basis !== "reduced two-component Nambu sector" ||
      result.units.xi !== "dimensionless" || result.units.energy !== "dimensionless" ||
      result.units.phase !== "rad" || Number.isNaN(Date.parse(result.provenance.computedAt))) return false;
  const expected = bdgSectorSpectrum(job.model.parameters);
  const minimum = Math.min(...expected.map(row => row.ePlus));
  return close(result.minimumPositiveEnergy, minimum) && result.gapClosed === (minimum <= 1e-10) &&
    result.samples.length === expected.length && result.samples.every((row, i) => {
      const other = expected[i];
      const nullableClose = (a: number|null, b: number|null) => a === null || b === null ? a === b : close(a,b);
      return close(row.xi, other.xi) && close(row.eMinus, other.eMinus) && close(row.ePlus, other.ePlus) &&
        nullableClose(row.electronWeight, other.electronWeight) &&
        nullableClose(row.holeWeight, other.holeWeight) &&
        nullableClose(row.pairingPhaseRad, other.pairingPhaseRad) && row.node === other.node;
    });
}
