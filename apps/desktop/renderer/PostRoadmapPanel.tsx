import React from "react";
import {
  POST_QVIS,
  SOURCE_PLAN_COVERAGE,
} from "../../../packages/models/roadmap";

export function PostRoadmapPanel() {
  return (
    <div data-testid="post-roadmap">
      <h2>After QLAB: Atlas, QVIS and Math3D.</h2>
      <p>
        The supplied post-QLAB plan is saved in
        docs/POST_QLAB_QVIS_M3D_ROADMAP.md with its original text and an
        implementation-status map. Historical QLAB-025–029 and QVIS-001–008 IDs
        are retained. The web client shipped as QLAB-029 here, not the reference
        plan's QLAB-025.
      </p>
      <p>
        Bounded generic lattice fixtures are now implemented. Reciprocal-space
        and portable-band workflows follow. Topology extensions, streaming and release
        follow as QVIS-011–013. These are plans, not implemented features.
        Math3D remains a separate track: QuantumResult → QuantumScene →
        independent viewers.
      </p>
      <h3>Planned Lab sequence</h3>
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
