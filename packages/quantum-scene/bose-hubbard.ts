import type { BoseHubbardResult } from "../contracts/bose-hubbard";
import { SceneBuilder, type SceneDigest } from "./builder";
import type { QuantumScene } from "./index";

/** A schematic display of exact observables from one saved finite-N eigenstate. */
export async function boseHubbardScene(result: BoseHubbardResult, resultSha256: string,
  stateIndex: number, digest: SceneDigest) {
  if (!Number.isInteger(stateIndex) || stateIndex < 0 || stateIndex >= result.states.length)
    throw new Error("Invalid dimer eigenstate index");
  const state = result.states[stateIndex], n = result.model.parameters.particles;
  const scene: QuantumScene = {
    schema: "quantum-scene/v1", id: `${result.runId}-state-${stateIndex}`,
    title: `Bose–Hubbard dimer · eigenstate ${stateIndex}`,
    provenance: { kind: "numerical-result", runId: result.runId, jobId: result.jobId,
      model: "bose_hubbard_dimer", engine: result.engine.name, engineVersion: result.engine.version,
      computedAt: result.provenance.computedAt, resultSha256, adapter: "qvis/1",
      parameters: { particles: n, interactionRatio: result.model.parameters.interactionRatio,
        hopping: 1, stateIndex, energyJ: result.spectrum.energies[stateIndex] } },
    coordinates: { handedness: "right", axes: ["schematic site", "display y", "occupation height"],
      units: ["site index", "dimensionless", result.units.occupation] },
    camera: { position: [1.5, -4.5, Math.max(3, n * 1.3)], target: [.5, 0, n / 2], up: [0, 0, 1] },
    datasets: [], objects: [], annotations: [
      { id: "scope", text: `Finite fixed-N dimer, open bond, J=1. Site positions and height are schematic; no physical length or Rb87 gas geometry. E=${result.spectrum.energies[stateIndex].toPrecision(7)} J.`, position: [.5, 0, n + .7] },
      { id: "coherence", text: `One-body coherence <b1† b2> = ${state.oneBodyCoherence.toPrecision(7)} ${result.units.oneBodyCoherence}; number variance = ${state.numberVariance.map(v => v.toPrecision(6)).join(", ")} ${result.units.numberVariance}.`, position: [.5, 0, n + .3] },
      { id: "basis", text: `Fock basis ${result.basis.ordering}; n_left = ${result.basis.leftOccupations.join(", ")}. Selected eigenstate index ${stateIndex}. Energy unit ${result.spectrum.energyUnits}.`, position: [.5, 0, n + 1.1] },
    ] },
    builder = new SceneBuilder(scene, digest);
  const sites = await builder.data("sites", [0, 0, 0, 1, 0, 0], 3, "schematic site position");
  const occupation = await builder.data("occupation", state.occupation, 1, result.units.occupation);
  await builder.data("number-variance", state.numberVariance, 1, result.units.numberVariance);
  builder.object("bond", "Open dimer bond (schematic)", "polyline", sites, "#617888");
  builder.object("occupations", "Site occupations (color)", "point-cloud", sites, "#79d9c1",
    { scalars: occupation, style: { color: "#79d9c1", opacity: 1, size: .32 } });
  builder.object("occupation-height", "Expected bosons per site (display height)", "vectors", sites, "#f2b36f",
    { values: await builder.data("occupation-vectors", state.occupation.flatMap(v => [0, 0, v]), 3, result.units.occupation),
      scalars: occupation });
  scene.annotations.push({ id: "site-left", text: `site 1: ${state.occupation[0].toPrecision(6)} ${result.units.occupation}; variance ${state.numberVariance[0].toPrecision(6)} ${result.units.numberVariance}`, position: [0, 0, -.4] });
  scene.annotations.push({ id: "site-right", text: `site 2: ${state.occupation[1].toPrecision(6)} ${result.units.occupation}; variance ${state.numberVariance[1].toPrecision(6)} ${result.units.numberVariance}`, position: [1, 0, -.4] });
  return builder.finish();
}
