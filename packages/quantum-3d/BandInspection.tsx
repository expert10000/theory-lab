import React from "react";
import type { SceneBands } from "../quantum-scene";

// Selection is owned by SceneViewer: dropdown, plot, slider and 3D pick all
// address the same supplied vertex. No interpolated energies or inferred phase.
export function BandInspection({
  bands,
  kUnit,
  arrays,
  selected,
  index,
  onSelect,
}: {
  bands: SceneBands;
  kUnit: string;
  arrays: Map<string, Float64Array>;
  selected: string;
  index: number;
  onSelect: (id: string, index: number) => void;
}) {
  const active = bands.objects.indexOf(selected),
    k = arrays.get(bands.coordinates)!,
    energies = bands.energies.map((id) => arrays.get(id)!),
    n = k.length / 3;
  const i = active>=0 ? Math.max(0, Math.min(index, n - 1)) : 0,
    gaps = Array.from(
      { length: n },
      (_, j) => energies[energies.length - 1][j] - energies[0][j],
    );
  const minimum = Math.min(...gaps),
    max = Math.max(1, ...energies.flatMap((e) => [...e].map(Math.abs)));
  const x = (j: number) =>
      20 + (460 * (k[j * 3] - k[0])) / (k[(n - 1) * 3] - k[0]),
    y = (e: number) => 120 - (100 * e) / max;
  const select = (j: number) =>
    onSelect(active >= 0 ? selected : bands.objects[0], j);
  return (
    <div className="reciprocal-inspection" data-testid="band-inspection">
      <h3>Supplied energy bands · {bands.kind}</h3>
      <label>
        Band
        <select
          aria-label="Band"
          value={active >= 0 ? selected : ""}
          onChange={(e) => onSelect(e.target.value, i)}
        >
          <option value="" disabled>
            Choose a supplied band
          </option>
          {bands.objects.map((id, j) => (
            <option key={id} value={id}>
              {bands.labels[j]}
            </option>
          ))}
        </select>
      </label>
      {bands.grid && (
        <div className="scene-run-controls">
          {["kx", "ky"].map((axis, a) => (
            <label key={axis}>
              {axis} grid index
              <select
                aria-label={`Band ${axis} index`}
                value={
                  a === 0 ? Math.floor(i / bands.grid![1]) : i % bands.grid![1]
                }
                onChange={(e) =>
                  select(
                    a === 0
                      ? Number(e.target.value) * bands.grid![1] +
                          (i % bands.grid![1])
                      : Math.floor(i / bands.grid![1]) * bands.grid![1] +
                          Number(e.target.value),
                  )
                }
              >
                {Array.from({ length: bands.grid![a] }, (_, j) => (
                  <option value={j} key={j}>
                    {j}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      {bands.kind === "path" && (
        <svg
          className="band-plot"
          data-testid="band-plot"
          viewBox="0 0 500 240"
          role="img"
          aria-label="Supplied bands; click to select nearest stored k sample"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect(),
              target =
                k[0] +
                ((((e.clientX - r.left) / r.width) * 500 - 20) / 460) *
                  (k[(n - 1) * 3] - k[0]);
            let nearest = 0;
            for (let j = 1; j < n; j++)
              if (
                Math.abs(k[j * 3] - target) < Math.abs(k[nearest * 3] - target)
              )
                nearest = j;
            select(nearest);
          }}
        >
          <line x1="20" x2="480" y1="120" y2="120" stroke="#617888" />
          {energies.map((e, j) => (
            <polyline
              key={j}
              points={[...e].map((v, j) => `${x(j)},${y(v)}`).join(" ")}
              fill="none"
              stroke={j === 0 ? "#f2b36f" : "#79d9c1"}
              strokeWidth="2"
            />
          ))}
          {active >= 0 && (
            <line x1={x(i)} x2={x(i)} y1="10" y2="230" stroke="white" />
          )}
          <text x="22" y="237" fill="#a7bbc4">
            k: {k[0].toPrecision(5)} → {k[(n - 1) * 3].toPrecision(5)} {kUnit}
          </text>
        </svg>
      )}
      <p data-testid="band-sample">
        {active >= 0
          ? `Sample ${i} · k=(${[...k.slice(i * 3, i * 3 + 2)].map((v) => v.toPrecision(7)).join(", ")}) ${kUnit} · ${bands.labels[active]} E=${energies[active][i].toPrecision(7)} · lower/upper E=${energies[0][i].toPrecision(7)} / ${energies[energies.length - 1][i].toPrecision(7)} · separation=${gaps[i].toPrecision(7)} ${bands.energyUnit}`
          : "Choose a band to inspect its original Float64 energy and k-point."}
      </p>
      <p>
        Worker bulk gap: {bands.bulkGap.toPrecision(7)}; minimum supplied-sample
        separation: {minimum.toPrecision(7)} {bands.energyUnit}. A finite mesh
        may miss a gap-closing point. Neither lines nor triangles define extra
        numerical samples or a topological invariant.
      </p>
    </div>
  );
}
