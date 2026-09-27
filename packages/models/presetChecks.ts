import type { CavityResult, EvolutionResult, LindbladResult } from "../contracts";
import type { LaboratoryPreset } from "./presets";

export interface PresetCheck { maxAbsError: number; tolerance: number; passed: boolean }
export function evaluatePreset(preset: LaboratoryPreset | null | undefined,
  result: EvolutionResult | CavityResult | LindbladResult | null,
  data: Float64Array | null): PresetCheck | null {
  if (!preset || !result || !data ||
      (preset.kind === "evolution" ? result.operation !== "evolve" :
        preset.kind === "open" ? result.operation !== "lindblad" : result.operation !== "cavity") ||
      preset.id === "viii-landau-zener") return null;
  if (result.solver.tStart !== preset.solver.tStart || result.solver.tStop !== preset.solver.tStop ||
      result.solver.samples !== preset.solver.samples || result.data.rows !== preset.solver.samples) return null;
  if (JSON.stringify(result.model.source) !== JSON.stringify(preset.source)) return null;
  if (Object.entries(preset.parameters).some(([key, value]) =>
    (result.model.parameters as Record<string, number>)[key] !== value)) return null;
  const stride = preset.kind === "evolution" ? 10 : preset.kind === "cavity" ? 6 : 7;
  if (data.length !== result.data.rows * stride) return null;
  if (preset.kind === "evolution" && result.operation === "evolve" && result.initialState.index !== preset.initialIndex) return null;
  if (preset.kind === "cavity" && result.operation === "cavity" &&
      (result.initialState.qubit !== preset.initialState.qubit || result.initialState.photons !== preset.initialState.photons)) return null;
  if (preset.kind === "open" && result.operation === "lindblad" &&
      (result.initialState.qubit !== preset.initialState.qubit || result.initialState.photons !== preset.initialState.photons)) return null;
  let maximum = 0;
  for (let i = 0; i < result.data.rows; i++) {
    const t = data[i * stride] - result.solver.tStart;
    let differences: number[];
    switch (preset.id) {
      case "viii-resonant-rabi": differences = [Math.abs(data[i * 10 + 2] - Math.sin(t / 2) ** 2)]; break;
      case "viii-vacuum-rabi": differences = [Math.abs(data[i * 6 + 1] - Math.cos(.35 * t) ** 2)]; break;
      case "viii-t1-relaxation": differences = [Math.abs(data[i * 7 + 1] - Math.exp(-.35 * t))]; break;
      case "viii-dephasing": differences = [
        Math.abs(data[i * 7 + 4] - .5 * Math.exp(-.25 * t)),
        Math.abs(data[i * 7 + 3] - (1 + Math.exp(-.5 * t)) / 2),
      ]; break;
      case "viii-cavity-loss": differences = [Math.abs(data[i * 7 + 2] - 2 * Math.exp(-.18 * t))]; break;
      default: return null;
    }
    maximum = Math.max(maximum, ...differences);
  }
  const tolerance = 1e-3;
  return { maxAbsError: maximum, tolerance, passed: maximum <= tolerance };
}
