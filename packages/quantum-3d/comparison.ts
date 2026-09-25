import type { EvolutionResult, SpectrumResult } from "../contracts";
import { EVOLUTION_COLUMNS } from "./evolution";

export interface SpectrumComparison {
  maxEnergyDifference: number;
  qutipRuntimeMs: number;
  nativeRuntimeMs: number;
}

export interface EvolutionComparison {
  maxObservableDifference: number;
  maxNormDriftQutip: number;
  maxNormDriftNative: number;
  minStateFidelity: number;
  finalStateFidelity: number;
  qutipRuntimeMs: number;
  nativeRuntimeMs: number;
}

export function compareSpectrum(
  qutip: SpectrumResult,
  native: SpectrumResult,
): SpectrumComparison {
  if (
    qutip.engine.name !== "qutip" ||
    native.engine.name !== "native" ||
    JSON.stringify(qutip.model) !== JSON.stringify(native.model)
  )
    throw new Error("Spectrum comparison needs matching QuTiP and native runs");
  return {
    maxEnergyDifference: Math.max(
      ...qutip.spectrum.eigenvalues.map((energy, i) =>
        Math.abs(energy - native.spectrum.eigenvalues[i]),
      ),
    ),
    qutipRuntimeMs: qutip.provenance.durationMs,
    nativeRuntimeMs: native.provenance.durationMs,
  };
}

export function compareEvolution(
  qutipResult: EvolutionResult,
  qutip: Float64Array,
  nativeResult: EvolutionResult,
  native: Float64Array,
): EvolutionComparison {
  if (
    qutipResult.engine.name !== "qutip" ||
    nativeResult.engine.name !== "native" ||
    JSON.stringify(qutipResult.model) !== JSON.stringify(nativeResult.model) ||
    JSON.stringify(qutipResult.solver) !==
      JSON.stringify(nativeResult.solver) ||
    JSON.stringify(qutipResult.initialState) !==
      JSON.stringify(nativeResult.initialState) ||
    qutip.length !== native.length ||
    qutip.length !== qutipResult.data.rows * EVOLUTION_COLUMNS ||
    native.length !== nativeResult.data.rows * EVOLUTION_COLUMNS
  )
    throw new Error(
      "Evolution comparison needs matching runs and binary shapes",
    );

  let maxObservableDifference = 0;
  let maxNormDriftQutip = 0;
  let maxNormDriftNative = 0;
  let minStateFidelity = 1;
  let finalStateFidelity = 1;
  for (let offset = 0; offset < qutip.length; offset += EVOLUTION_COLUMNS) {
    const t = qutip[offset];
    if (
      !Number.isFinite(t) ||
      !Number.isFinite(native[offset]) ||
      Math.abs(t - native[offset]) > 1e-10 * Math.max(1, Math.abs(t))
    )
      throw new Error("Evolution comparison time grids do not match");
    for (let column = 1; column <= 5; column++) {
      const difference = Math.abs(
        qutip[offset + column] - native[offset + column],
      );
      if (!Number.isFinite(difference))
        throw new Error("Evolution comparison contains non-finite observables");
      maxObservableDifference = Math.max(maxObservableDifference, difference);
    }
    const q0r = qutip[offset + 6],
      q0i = qutip[offset + 7];
    const q1r = qutip[offset + 8],
      q1i = qutip[offset + 9];
    const n0r = native[offset + 6],
      n0i = native[offset + 7];
    const n1r = native[offset + 8],
      n1i = native[offset + 9];
    const qNorm = q0r ** 2 + q0i ** 2 + q1r ** 2 + q1i ** 2;
    const nNorm = n0r ** 2 + n0i ** 2 + n1r ** 2 + n1i ** 2;
    if (
      !Number.isFinite(qNorm) ||
      !Number.isFinite(nNorm) ||
      qNorm <= 0 ||
      nNorm <= 0
    )
      throw new Error("Evolution comparison contains an invalid state norm");
    maxNormDriftQutip = Math.max(maxNormDriftQutip, Math.abs(qNorm - 1));
    maxNormDriftNative = Math.max(maxNormDriftNative, Math.abs(nNorm - 1));
    const overlapReal = q0r * n0r + q0i * n0i + q1r * n1r + q1i * n1i;
    const overlapImag = q0r * n0i - q0i * n0r + q1r * n1i - q1i * n1r;
    const fidelity = Math.min(
      1,
      (overlapReal ** 2 + overlapImag ** 2) / (qNorm * nNorm),
    );
    minStateFidelity = Math.min(minStateFidelity, fidelity);
    finalStateFidelity = fidelity;
  }
  return {
    maxObservableDifference,
    maxNormDriftQutip,
    maxNormDriftNative,
    minStateFidelity,
    finalStateFidelity,
    qutipRuntimeMs: qutipResult.provenance.durationMs,
    nativeRuntimeMs: nativeResult.provenance.durationMs,
  };
}
