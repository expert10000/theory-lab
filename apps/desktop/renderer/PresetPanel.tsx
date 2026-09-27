import React from "react";
import { PRESETS, THEORY_REVISION, type LaboratoryPreset } from "../../../packages/models/presets";

export function PresetPanel({ open }: { open: (preset: LaboratoryPreset) => void }) {
  return <section className="preset-page" data-testid="preset-page">
    <div className="panel preset-intro"><p className="eyebrow">VOLUME VIII / QLAB-015</p>
      <h2>Reference experiments, ready to run.</h2>
      <p>Six configurations mapped to inspected QuTiP examples in the theory repository. Open one in its existing laboratory, review the parameters, then run it with either engine. The source revision is pinned; Python example code is not imported into this app.</p>
      <code>theory @ {THEORY_REVISION.slice(0, 12)}</code>
    </div>
    <div className="preset-grid">{PRESETS.map(preset => <article className="panel preset-card" key={preset.id} data-testid={`preset-${preset.id}`}>
      <p className="eyebrow">{preset.kind === "evolution" ? "TWO-LEVEL DYNAMICS" : preset.kind === "cavity" ? "CAVITY QED" : "OPEN SYSTEM"}</p>
      <h2>{preset.title}</h2><p>{preset.description}</p>
      <div className="preset-reference"><span>REFERENCE CHECK</span><strong>{preset.reference}</strong></div>
      <p className="preset-convention">{preset.convention}</p>
      <small>{preset.source.exampleId} · {preset.source.sourceModule}</small>
      <button type="button" className="run-button" aria-label={`Open ${preset.title}`} onClick={() => open(preset)}>Open in lab →</button>
    </article>)}</div>
    <p className="scope-note">The coherent-state, thermal and g² sections of Commit 690, and unsupported Floquet/Stückelberg/quantum-Rabi references, are not presented as reproduced presets.</p>
  </section>;
}
