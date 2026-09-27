import React from "react";
import type { CavityResult, EvolutionResult, LindbladResult } from "../../../packages/contracts";
import { evaluatePreset } from "../../../packages/models/presetChecks";
import type { LaboratoryPreset } from "../../../packages/models/presets";

export function PresetCheck({ preset, result, data }: {
  preset?: LaboratoryPreset | null;
  result: EvolutionResult | CavityResult | LindbladResult | null;
  data: Float64Array | null;
}) {
  if (!preset || !result || !data) return null;
  const check = evaluatePreset(preset, result, data);
  const asymptotic = preset.id === "viii-landau-zener";
  return <div className="preset-check" data-testid="preset-check">
    <span>VOLUME VIII / {preset.source.exampleId}</span>
    <strong>{check ? (check.passed ? "ANALYTIC CHECK PASSED" : "ANALYTIC CHECK FAILED") :
      asymptotic ? "ASYMPTOTIC REFERENCE ONLY" : "REFERENCE CONFIGURATION CHANGED"}</strong>
    <small>{check ? `Maximum absolute error ${check.maxAbsError.toExponential(3)} · tolerance ${check.tolerance.toExponential(1)}` :
      asymptotic ? "The infinite-time formula is shown separately; a finite-window run is not judged against it." :
      "The pinned analytic check applies only to the exact preset parameters and initial state."}</small>
  </div>;
}
