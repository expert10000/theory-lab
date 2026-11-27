import type { LatticePairingJob, LatticePairingParameters, LatticePairingResult, LatticePairingSample } from "../contracts/lattice-pairing";

const close = (a: number, b: number) => Number.isFinite(a) && Math.abs(a-b) <= 2e-7*(1+Math.abs(b));
const nullableClose = (a: number|null, b: number|null) => a === null || b === null ? a === b : close(a,b);
const harmonic = (k: number) => { const value = Math.sin(k); return Math.abs(value) < 1e-12 ? 0 : value; };
export const latticePairingJob = (parameters: LatticePairingParameters, jobId: string): LatticePairingJob =>
  ({schema:"quantum-lattice-pairing-job/v1", jobId, model:{type:"square_lattice_px_py", parameters}});

/** Periodic [-π,π) grid, kx-major/ky-minor. t=a=1; finite samples cannot prove a bulk gap. */
export function latticePairingSamples({mu, amplitudeX, amplitudeY, relativePhaseRad, gridSize}: LatticePairingParameters): LatticePairingSample[] {
  const rows: LatticePairingSample[] = [];
  for (let ix=0; ix<gridSize; ix++) for (let iy=0; iy<gridSize; iy++) {
    const kx = -Math.PI + 2*Math.PI*ix/gridSize;
    const ky = -Math.PI + 2*Math.PI*iy/gridSize;
    const xi = -2*(Math.cos(kx)+Math.cos(ky))-mu;
    const deltaRe = amplitudeX*harmonic(kx)+amplitudeY*Math.cos(relativePhaseRad)*harmonic(ky);
    const deltaIm = amplitudeY*Math.sin(relativePhaseRad)*harmonic(ky);
    const gapMagnitude = Math.hypot(deltaRe,deltaIm);
    const energy = Math.hypot(xi,gapMagnitude);
    const node = energy <= 1e-10;
    rows.push({kx,ky,xi,deltaRe,deltaIm,gapMagnitude,
      phaseRad: gapMagnitude <= 1e-12 ? null : Math.atan2(deltaIm,deltaRe),
      eMinus: -energy,ePlus:energy,
      electronWeight: node ? null : (1+xi/energy)/2,
      holeWeight: node ? null : (1-xi/energy)/2,node});
  }
  return rows;
}

export function consistentLatticePairingResult(job: LatticePairingJob, result: LatticePairingResult): boolean {
  if (result.jobId !== job.jobId || result.status !== "completed" ||
      JSON.stringify(result.model) !== JSON.stringify(job.model) ||
      result.basis !== "spinless two-component Nambu lattice toy" ||
      result.grid.order !== "kx-major/ky-minor" || result.grid.domain !== "[-pi,pi)" ||
      !close(result.grid.spacing, 2*Math.PI/job.model.parameters.gridSize) ||
      result.units.momentum !== "rad/a" || result.units.energy !== "t=1" || result.units.phase !== "rad" ||
      Number.isNaN(Date.parse(result.provenance.computedAt))) return false;
  const expected = latticePairingSamples(job.model.parameters);
  const minimum = Math.min(...expected.map(row=>row.ePlus));
  return close(result.sampledMinimumEnergy,minimum) && result.sampledGapClosed === (minimum <= 1e-10) &&
    result.samples.length === expected.length && result.samples.every((row,i) => {
      const other = expected[i];
      return close(row.kx,other.kx) && close(row.ky,other.ky) && close(row.xi,other.xi) &&
        close(row.deltaRe,other.deltaRe) && close(row.deltaIm,other.deltaIm) &&
        close(row.gapMagnitude,other.gapMagnitude) && nullableClose(row.phaseRad,other.phaseRad) &&
        close(row.eMinus,other.eMinus) && close(row.ePlus,other.ePlus) &&
        nullableClose(row.electronWeight,other.electronWeight) &&
        nullableClose(row.holeWeight,other.holeWeight) && row.node === other.node;
    });
}
