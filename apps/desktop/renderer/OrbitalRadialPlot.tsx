import React, { useState } from "react";
import type { OrbitalResult } from "../../../packages/contracts";
export function OrbitalRadialPlot({ result,selectedIndex,onSelect }: { result: OrbitalResult;selectedIndex?:number|null;onSelect?:(index:number)=>void }) {
  const [full, setFull] = useState(false),
    a = result.analysis;
  const maximum = full
    ? a.radialRadii[400]
    : Math.min(a.radialRadii[400], 3 * a.meanRadius);
  const max = Math.max(...a.radialProbability),
    nodes = a.radialNodes;
  const maximumIndex=a.radialRadii.findIndex(value=>value>maximum);
  const lastIndex=maximumIndex<0?a.radialRadii.length-1:maximumIndex-1;
  const points = a.radialProbability
    .flatMap((v, i) =>
      a.radialRadii[i] <= maximum
        ? [
            `${50 + (710 * a.radialRadii[i]) / maximum},${220 - (180 * v) / max}`,
          ]
        : [],
    )
    .join(" ");
  return (
    <div className="sweep-visual">
      <p className="eyebrow">RADIAL PROBABILITY r²|R(r)|² / NOT 3D DENSITY</p>
      <label>
        <input
          type="checkbox"
          checked={full}
          onChange={(e) => setFull(e.target.checked)}
        />{" "}
        Full stored radial range (otherwise 0…3⟨r⟩)
      </label>
      <svg
        viewBox="0 0 800 260"
        role="img"
        aria-label="Orbital radial probability"
      >
        <path d="M50 20 V220 H760" stroke="#526875" fill="none" />
        <polyline
          points={points}
          fill="none"
          stroke="#79d9c1"
          strokeWidth="2"
        />
        {nodes
          ?.filter((r) => r <= maximum)
          .map((r, i) => {
            const x = 50 + (710 * r) / maximum;
            return (
              <g key={r}>
                <path
                  data-testid="radial-node-marker"
                  d={`M${x} 25 V220`}
                  stroke="#f2b36f"
                  strokeDasharray="4 4"
                />
                <text x={x + 3} y={34 + i * 14} fill="#f2b36f" fontSize="12">
                  N{i + 1}
                </text>
              </g>
            );
          })}
        <text x="50" y="245" fill="#a7bbc4" fontSize="12">
          r = 0
        </text>
        <text x="610" y="245" fill="#a7bbc4" fontSize="12">
          r = {maximum.toPrecision(4)} a₀
        </text>
      </svg>
      {onSelect&&<label>Stored radial sample <input aria-label="Orbital radial sample" type="range" min="0" max={lastIndex} value={selectedIndex!==null&&selectedIndex!==undefined?Math.min(selectedIndex,lastIndex):0} onChange={event=>onSelect(Number(event.target.value))}/></label>}
      {selectedIndex!==null&&selectedIndex!==undefined&&<p data-testid="orbital-radial-selection">r = {a.radialRadii[selectedIndex].toFixed(6)} a₀ · radial probability = {a.radialProbability[selectedIndex].toFixed(6)}</p>}
      <p data-testid="orbital-radial-nodes">
        Radial nodes r &gt; 0:{" "}
        {nodes === undefined
          ? "not recorded in this older result"
          : nodes.length
            ? nodes.map((r) => r.toPrecision(7)).join(" / ") + " a₀"
            : "none"}
        . Origin and angular nodal planes are not counted as radial nodes.
      </p>
    </div>
  );
}
