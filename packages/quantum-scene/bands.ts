import type { QuantumResult } from "../contracts";
import { consistentTopologyResult } from "../models/topology";
import { SceneBuilder } from "./builder";
import { addReciprocalGuides } from "./reciprocal";
import type { QuantumScene } from "./index";

export async function bandSceneFromResult(
  result: QuantumResult,
  resultSha256: string,
  digest: (bytes: Uint8Array) => Promise<string>,
) {
  if (
    result.operation !== "topology" ||
    !consistentTopologyResult(
      {
        schema: "quantum-job/v1",
        jobId: result.jobId,
        operation: "topology",
        engine: "native",
        model: result.model,
      },
      result,
    )
  )
    throw new Error("Bands require a verified SSH/QWZ topology result");
  const a = result.analysis,
    surface = a.kind === "qwz",
    lower = a.lowerBand,
    upper = a.upperBand;
  if (!lower || !upper || (a.kind === "qwz" && !a.bandKValues))
    throw new Error(
      "This older QWZ run has no supplied band arrays. Re-run the QWZ laboratory with the updated worker.",
    );
  const ks = a.kind === "ssh" ? a.kValues : a.bandKValues!,
    k = surface
      ? ks.flatMap((x) => ks.flatMap((y) => [x, y, 0]))
      : ks.flatMap((x) => [x, 0, 0]);
  const height = Math.max(1, ...upper.map(Math.abs)),
    unit = "normalized energy (hbar=1)";
  const scene: QuantumScene = {
    schema: "quantum-scene/v1",
    id: result.runId.length<=94 ? `${result.runId}-bands` : `bands-${resultSha256.slice(0,32)}`,
    title: `${a.kind.toUpperCase()} supplied energy bands`,
    provenance: {
      kind: "numerical-result",
      runId: result.runId,
      jobId: result.jobId,
      model: result.model.type,
      engine: result.engine.name,
      engineVersion: result.engine.version,
      computedAt: result.provenance.computedAt,
      resultSha256,
      adapter: "qvis/1",
      parameters: { ...result.model.parameters },
    },
    coordinates: {
      handedness: "right",
      axes: surface ? ["kx", "ky", "energy"] : ["k", "energy", "display z"],
      units: surface
        ? ["rad / lattice constant", "rad / lattice constant", unit]
        : ["rad / cell spacing", unit, "dimensionless"],
    },
    camera: {
      position: surface
        ? [9 + height, -8 - height, 7 + height]
        : [0, -height * 2, Math.max(8, height * 2)],
      target: [0, 0, 0],
      up: surface ? [0, 0, 1] : [0, 1, 0],
    },
    objects: [],
    datasets: [],
    annotations: [
      {
        id: "band-convention",
        text: "Original worker samples. Lines/triangles are display connections, not interpolated scientific values. No periodic seam or topology inference.",
        position: [0, 0, height],
      },
      {
        id: "band-gap",
        text: `Worker bulk gap ${a.bulkGap.toPrecision(7)}; sampled separations need not reach the exact global gap. Topology ${a.kind === "ssh" ? (a.winding ?? "undefined") : (a.chern ?? "undefined or unresolved")}.`,
        position: [0, 0, -height],
      },
    ],
  };
  const source = "source" in result.model ? result.model.source : undefined,
    pinned = source?.sourceRepository?.match(
      /^(https:\/\/github\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+)\/tree\/([a-f0-9]{40})$/,
    ),
    entryId = source?.exampleId?.match(/^Atlas ([A-Za-z0-9_-]+)$/)?.[1];
  if (pinned && entryId)
    scene.provenance.source = {
      repository: pinned[1],
      revision: pinned[2],
      entryId,
    };
  const b = new SceneBuilder(scene, digest),
    coordinates = await b.data(
      "band-k",
      k,
      3,
      surface ? "rad / lattice constant" : "rad / cell spacing",
    ),
    energies: string[] = [],
    objects: string[] = [],
    triangles: number[] = [];
  if (surface)
    for (let x = 0; x < ks.length - 1; x++)
      for (let y = 0; y < ks.length - 1; y++) {
        const i = x * ks.length + y;
        triangles.push(
          i,
          i + ks.length,
          i + 1,
          i + 1,
          i + ks.length,
          i + ks.length + 1,
        );
      }
  const indices = surface
    ? await b.data("band-triangles", triangles, 3, "vertex index")
    : undefined;
  for (const [j, values] of [lower, upper].entries()) {
    const id = `band-${j}`,
      e = await b.data(`band-energy-${j}`, values, 1, unit);
    const positions = await b.data(
      `band-positions-${j}`,
      values.flatMap((v, i) =>
        surface ? [k[i * 3], k[i * 3 + 1], v] : [k[i * 3], v, 0],
      ),
      3,
      "declared mixed scene units",
    );
    b.object(
      id,
      j === 0 ? "Lower band" : "Upper band",
      surface ? "mesh" : "polyline",
      positions,
      j === 0 ? "#f2b36f" : "#79d9c1",
      { scalars: e, ...(indices ? { indices } : {}) },
    );
    energies.push(e);
    objects.push(id);
  }
  scene.bands = {
    kind: surface ? "surface" : "path",
    coordinates,
    energies,
    objects,
    labels: ["Lower band", "Upper band"],
    energyUnit: unit,
    bulkGap: a.bulkGap,
    ...(surface ? { grid: [ks.length, ks.length] as [number, number] } : {}),
  };
  if (surface)
    await addReciprocalGuides(
      b,
      "square",
      "lattice constant a=1",
      "rad / lattice constant",
    );
  return b.finish();
}
