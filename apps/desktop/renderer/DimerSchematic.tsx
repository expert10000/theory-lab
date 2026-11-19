import React, { useId } from "react";

/** Schematic modes and coupling only; circles do not represent measured atoms. */
export function DimerSchematic({ compact = false }: { compact?: boolean }) {
  const marker = useId().replaceAll(":", "");
  return <figure className={`dimer-schematic${compact ? " dimer-schematic-compact" : ""}`}>
    <div className="dimer-schematic-heading"><span>TWO MODES</span><strong>ONE OPEN BOND</strong></div>
    <svg role="img" aria-label="Schematic of two bosonic modes coupled by hopping J, with onsite interaction U" viewBox="0 0 640 270">
      <defs><marker id={marker} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <path d="M1 1 L7 4 L1 7" fill="none" stroke="#b7efd9" strokeWidth="1.5" />
      </marker></defs>
      <path className="dimer-well" d="M80 82 C100 180 108 220 188 220 C268 220 276 180 296 82" />
      <path className="dimer-well" d="M344 82 C364 180 372 220 452 220 C532 220 540 180 560 82" />
      <circle className="dimer-site-halo" cx="188" cy="157" r="58" />
      <circle className="dimer-site-halo" cx="452" cy="157" r="58" />
      <circle className="dimer-site" cx="188" cy="157" r="39" />
      <circle className="dimer-site" cx="452" cy="157" r="39" />
      <text className="dimer-site-label" x="188" y="165" textAnchor="middle">n₁</text>
      <text className="dimer-site-label" x="452" y="165" textAnchor="middle">n₂</text>
      <path className="dimer-hop" d="M255 129 H385" markerEnd={`url(#${marker})`} />
      <path className="dimer-hop" d="M385 177 H255" markerEnd={`url(#${marker})`} />
      <text className="dimer-hop-label" x="320" y="115" textAnchor="middle">J</text>
      <text className="dimer-onsite-label" x="188" y="71" textAnchor="middle">U</text>
      <text className="dimer-onsite-label" x="452" y="71" textAnchor="middle">U</text>
      <text className="dimer-base-label" x="188" y="253" textAnchor="middle">SITE 1</text>
      <text className="dimer-base-label" x="452" y="253" textAnchor="middle">SITE 2</text>
    </svg>
    <figcaption>Fixed N · mode occupations, not atom positions</figcaption>
  </figure>;
}
