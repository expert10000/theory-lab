import type { QuantumResult } from "../contracts";
import { consistentTopologyResult } from "../models/topology";
import { SceneBuilder } from "./builder";
import type { QuantumScene } from "./index";

/** The geometry and energies come exclusively from a verified producer result. */
export async function nodalSceneFromResult(result: QuantumResult, resultSha256: string,
  digest: (bytes: Uint8Array) => Promise<string>) {
  if (result.operation !== "topology" || result.model.type !== "nodal_line_two_band" ||
      result.analysis.kind !== "nodal_line_two_band" ||
      !consistentTopologyResult({ schema: "quantum-job/v1", jobId: result.jobId, operation: "topology",
        engine: "native", model: result.model }, result))
    throw new Error("Nodal scene requires a verified continuum run");
  const a = result.analysis, p = result.model.parameters;
  const pinned = result.model.source?.sourceRepository?.match(/^(https:\/\/github\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+)\/tree\/([a-f0-9]{40})$/);
  const extent = Math.max(a.ringRadius ?? 0, p.loopCenter + p.loopRadius, .5);
  const scene: QuantumScene = {
    schema: "quantum-scene/v1", id: `${result.runId}-nodal`,
    title: "Continuum nodal ring · linking Berry loop",
    provenance: { kind: "numerical-result", runId: result.runId, jobId: result.jobId,
      model: result.model.type, engine: result.engine.name, engineVersion: result.engine.version,
      computedAt: result.provenance.computedAt, resultSha256, adapter: "qvis/1", parameters: { ...p },
      ...(pinned ? { source: { repository: pinned[1], revision: pinned[2], entryId: "nodal_line_two_band" } } : {}) },
    coordinates: { handedness: "right", axes: ["kx", "ky", "kz"],
      units: ["inverse length", "inverse length", "inverse length"] },
    camera: { position: [2.4 * extent, -3 * extent, 2 * extent], target: [0, 0, 0], up: [0, 0, 1] },
    datasets: [], objects: [], annotations: [
      { id: "continuum-scope", text: "Atlas continuum two-band model. Ring and loop are producer-supplied samples; no surface or drumhead state is calculated.", position: [0, 0, extent * 1.25] },
      { id: "loop-diagnostic", text: `Loop Berry phase ${a.berryPhase === null ? "undefined" : a.berryPhase.toPrecision(7)}; status ${a.status}; minimum gap ${a.loopGap.toPrecision(7)}.`, position: [0, 0, -extent * .8] } ],
    topology: { quantities: [], invariants: [
      { id: "linking-berry-phase", label: "Occupied-band linking-loop Berry phase", value: a.berryPhase,
        status: a.status === "defined" ? "verified" : a.status === "gap-closed" ? "undefined" : "unresolved",
        method: "Gauge-invariant occupied-band Wilson loop; independent d-vector winding; doubled-sample convergence" },
      { id: "d-vector-winding", label: "Independent loop d-vector winding", value: a.winding,
        status: a.status === "defined" ? "verified" : a.status === "gap-closed" ? "undefined" : "unresolved",
        method: "Unwrapped polar angle of (m-B k_perp², v kz) on the declared radial-z loop" } ],
      limitations: ["Continuum bulk model only; no surface or drumhead-state calculation.",
        "At a loop degeneracy the occupied-band phase is undefined."] } };
  const b = new SceneBuilder(scene, digest);
  if (a.ringPositions.length) {
    const ring = await b.data("ring-positions", [...a.ringPositions.flat(), ...a.ringPositions[0]], 3, "inverse length");
    b.object("nodal-ring", "Producer-supplied nodal ring", "polyline", ring, "#79d9c1");
    const ringSamples = await b.data("ring-samples", a.ringPositions.flat(), 3, "inverse length");
    b.object("nodal-ring-samples", "Stored ring coordinates", "point-cloud", ringSamples, "#79d9c1",
      { style: { color: "#79d9c1", opacity: 1, size: .045 * extent } });
  }
  const loop = await b.data("loop-positions", [...a.loopPositions.flat(), ...a.loopPositions[0]], 3, "inverse length");
  const samples = await b.data("loop-samples", a.loopPositions.flat(), 3, "inverse length");
  const lower = await b.data("loop-lower-band", a.lowerBand, 1, "normalized energy");
  const upper = await b.data("loop-upper-band", a.upperBand, 1, "normalized energy");
  b.object("linking-loop", "Producer-supplied closed radial-z path", "polyline", loop, "#f2b36f");
  b.object("linking-loop-samples", "Exact stored loop samples (color = upper band)", "point-cloud", samples, "#f2b36f",
    { scalars: upper, style: { color: "#f2b36f", opacity: 1, size: .06 * extent } });
  scene.annotations.push({ id: "sample-energy", text: `Exact lower and upper energies are stored in ${lower} and ${upper}; select a loop sample to inspect its supplied value.`, position: [p.loopCenter, 0, p.loopRadius + .2 * extent] });
  return b.finish();
}
