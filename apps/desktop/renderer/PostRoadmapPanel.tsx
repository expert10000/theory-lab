import React from "react";
import {
  POST_QVIS,
  SOURCE_PLAN_COVERAGE,
  ATLAS_RECONCILIATION_STEPS,
  D1_OSCILLATOR_STEPS,
} from "../../../packages/models/roadmap";

export function PostRoadmapPanel() {
  return (
    <div data-testid="post-roadmap">
      <h2>After QLAB: Atlas, QVIS and Math3D.</h2>
      <p>
        The supplied post-QLAB plan is saved in
        docs/POST_QLAB_QVIS_M3D_ROADMAP.md with its original text and an
        implementation-status map. Historical QLAB-025–029 and QVIS-001–013 IDs
        are retained. The web client shipped as QLAB-029 here, not the reference
        plan's QLAB-025.
      </p>
      <p>
        Bounded lattice and primitive reciprocal-space fixtures are implemented.
        Portable SSH/QWZ bands, supplied topology quantities and bounded chunked
        loading are implemented. QVIS-013 closes the bounded v0.1 release gate,
        including web Scenes and read-only imports. Compatibility and limits are
        recorded in docs/RELEASE_QVIS_V0.1.md. Math3D remains a separate track:
        QuantumResult → QuantumScene → independent viewers.
      </p>
      <h3>
        {POST_QVIS.length
          ? "Planned Lab sequence"
          : "Bounded QVIS v0.1 delivered"}
      </h3>
      {!POST_QVIS.length && (
        <p data-testid="qvis-release-status">
          QVIS-001–013 implemented. Broader physics and separate Math3D
          integration remain outside this release.
        </p>
      )}
      {POST_QVIS.map((entry) => (
        <div
          className="roadmap-row"
          key={entry.id}
          data-testid={`planned-${entry.id}`}
          title={entry.detail}
        >
          <code>{entry.id}</code>
          <span>{entry.title}</span>
          <small>{entry.state}</small>
        </div>
      ))}
      <h3>Atlas reconciliation · existing architecture</h3>
      <p>
        R1 maps the 68-entry canonical Atlas to existing Lab code. Theory
        examples are not Lab worker permissions; no second model/workspace layer
        is introduced. Full inventory: docs/ATLAS_RECONCILIATION_R1.md.
      </p>
      <p data-testid="reconciliation-freeze-status">
        R2–R5 reviews and additive metadata freeze are implemented. All existing
        labs and features are retained. Reviewed model gaps are not newly
        implemented solvers. Complete review: docs/ATLAS_RECONCILIATION_R2_R5.md.
      </p>
      {ATLAS_RECONCILIATION_STEPS.map((entry) => (
        <div
          className="roadmap-row"
          key={entry.id}
          data-testid={`reconciliation-${entry.id}`}
          title={entry.detail}
        >
          <code>{entry.id}</code>
          <span>{entry.title}</span>
          <small>{entry.state}</small>
        </div>
      ))}
      <h3>D1 · standalone harmonic oscillator</h3>
      <p>Static 1D Fock spectrum and stationary number-state density are implemented. Dimensionless q, ℏ=1; no driven/anharmonic/ND dynamics, oscillator 3D scene or Math3D connection. See docs/D1_OSCILLATOR.md.</p>
      {D1_OSCILLATOR_STEPS.map(entry=><div className="roadmap-row" key={entry.id} data-testid={`oscillator-${entry.id}`} title={entry.detail}><code>{entry.id}</code><span>{entry.title}</span><small>{entry.state}</small></div>)}
      <details data-testid="source-plan-coverage">
        <summary>
          Coverage of the supplied plan — different numbering/scopes
        </summary>
        <p>
          “Implemented” above describes delivered milestones. The reference plan
          uses QVIS-005–007 for broader, different features. Its acceptance
          checkmarks are targets. Partial means only the subset described here
          exists. Optional engines still require installed
          dependencies/configuration.
        </p>
        {SOURCE_PLAN_COVERAGE.map((entry) => (
          <div
            className="roadmap-row"
            key={entry.id}
            data-testid={`plan-coverage-${entry.id}`}
            title={entry.detail}
          >
            <code>Plan {entry.id}</code>
            <span>
              {entry.title}: {entry.detail}
            </span>
            <small>{entry.state}</small>
          </div>
        ))}
      </details>
    </div>
  );
}
