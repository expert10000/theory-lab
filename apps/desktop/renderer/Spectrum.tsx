import React from "react";
import type { SpectrumResult } from "../../../packages/contracts";
export const format = (value: number) =>
  Math.abs(value) < 1e-5 && value !== 0
    ? value.toExponential(6)
    : value.toFixed(6);
export function Spectrum({ result }: { result: SpectrumResult }) {
  const [low, high] = result.spectrum.eigenvalues;
  const bound = Math.max(Math.abs(low), Math.abs(high), 0.1) * 1.55;
  const y = (energy: number) => 150 - (energy / bound) * 112;
  return (
    <svg
      className="spectrum"
      viewBox="0 0 640 300"
      role="img"
      aria-label={`Energy spectrum: E minus ${format(low)}, E plus ${format(high)}`}
    >
      <defs>
        <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path
            d="M 30 0 L 0 0 0 30"
            fill="none"
            stroke="#26323c"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect x="0" y="0" width="640" height="300" fill="url(#grid)" />
      <line x1="75" y1="22" x2="75" y2="270" stroke="#465360" />
      <text x="24" y="28" className="axis-label">
        E
      </text>
      <line
        x1="75"
        y1="150"
        x2="605"
        y2="150"
        stroke="#48535e"
        strokeDasharray="4 6"
      />
      <text x="50" y="155" className="axis-label">
        0
      </text>
      <line
        x1="175"
        y1={y(high)}
        x2="455"
        y2={y(high)}
        stroke="#f2b36f"
        strokeWidth="3"
      />
      <circle cx="175" cy={y(high)} r="4" fill="#f2b36f" />
      <text x="478" y={y(high) - (high === low ? 16 : 9)} fill="#f2b36f">
        E₊
      </text>
      <text
        x="478"
        y={y(high) + (high === low ? -1 : 28)}
        className="energy-label"
      >
        {format(high)}
      </text>
      <line
        x1="175"
        y1={y(low)}
        x2="455"
        y2={y(low)}
        stroke="#79d9c1"
        strokeWidth="3"
      />
      <circle cx="175" cy={y(low)} r="4" fill="#79d9c1" />
      <text x="478" y={y(low) + (high === low ? 25 : 9)} fill="#79d9c1">
        E₋
      </text>
      <text
        x="478"
        y={y(low) + (high === low ? 44 : 28)}
        className="energy-label"
      >
        {format(low)}
      </text>
      {high !== low && (
        <>
          <line
            x1="315"
            y1={y(high) + 8}
            x2="315"
            y2={y(low) - 8}
            stroke="#667884"
            strokeDasharray="3 5"
          />
          <text x="330" y="144" className="axis-label">
            gap {format(high - low)}
          </text>
        </>
      )}
      <text x="175" y="281" className="axis-label">
        {high === low ? "Degenerate eigenvalues" : "Two-level eigenspectrum"} ·
        normalized units
      </text>
    </svg>
  );
}
