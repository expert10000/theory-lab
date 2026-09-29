import React from "react";
import { reconcileAtlas } from "../atlas/reconciliation";
import { executableReview } from "../atlas/executable-review";
import { SCENE_COMPATIBILITY_REVIEWS } from "../atlas/scene-review";
import { physicsGapReview, PHYSICS_GAP_GROUPS } from "../atlas/physics-gaps";
import "./atlas-capabilities.css";

/** Shared read-only explanation. Never creates a Run action or worker job. */
export function AtlasCapabilities({ id }: { id: string }) {
  const row = reconcileAtlas(id);
  if (!row) return null;
  const lab = row.lab;
  const review = executableReview(id)!;
  const gap = physicsGapReview(id)!;
  const group = PHYSICS_GAP_GROUPS.find(g => g.id === gap.groupId);
  return (
    <section
      className="atlas-binding atlas-bridge atlas-capabilities"
      data-testid="atlas-capabilities"
    >
      <h3>Reconciled capabilities · R1</h3>
      <p data-testid="atlas-capability-status">
        Reference: available · Theory example:{" "}
        {row.sourceExample ? row.sourceExample.kind : "not declared"} · Lab
        executable binding: {lab ? "tested subspace" : "none"}
      </p>
      {row.sourceExample && (
        <>
          <p>
            Theory-side paths checked at the pinned revision; not Lab execution
            permissions or a numerical acceptance claim.
          </p>
          <p>
            <code>{row.sourceExample.adapter}</code>
            <br />
            <code>{row.sourceExample.example}</code>
          </p>
          <p>{row.sourceExample.notes}</p>
        </>
      )}
      {lab && (
        <>
          <p data-testid="atlas-lab-coverage">
            Lab model: {lab.modelId} · Bound operation: {lab.operation} ·
            Desktop control: available · Web compute control:{" "}
            {lab.implementation.webControl ? "available" : "not available"} ·
            Gateway bound operation:{" "}
            {lab.implementation.gatewayOperations.includes(lab.operation)
              ? "accepted"
              : "not accepted"}{" "}
            · Saved scene views:{" "}
            {lab.implementation.sceneViews.join(", ") || "none"}
          </p>
          <p>
            Existing implementation: <code>{lab.implementation.module}</code>.
            Engines: {lab.implementation.engines.join(", ")}; actual
            availability comes from worker capabilities.
          </p>
        </>
      )}
      {row.relatedLabs.map((related) => (
        <p key={related.modelId}>
          Related existing lab: {related.modelId} — {related.limitation} No
          Load/Run action is enabled by this relationship.
        </p>
      ))}
      <p>{row.gap}</p>
      <details data-testid="atlas-executable-review">
        <summary>R2 executable mapping review · {review.disposition}</summary>
        {review.scientificMapping && <>
          <p>{review.scientificMapping.conversion}</p>
          <p>{review.scientificMapping.basis}</p>
          <p>{review.scientificMapping.boundedScope}</p>
        </>}
        <p>{review.nextRequirement}</p>
      </details>
      <details data-testid="atlas-gap-review">
        <summary>R4 physics gaps · {gap.status}{group ? ` · priority ${gap.priority}` : ""}</summary>
        <p>{gap.scope}</p>
        {group && <>
          <h4>{group.id} · {group.title}</h4>
          <p>Reuse: {group.reuse}</p>
          <p>Missing: {group.missing}</p>
          <p>Acceptance requirements: {group.acceptance.join(" · ")}</p>
        </>}
        <p>Reviewed backlog only; no existing feature removed or new Run action enabled.</p>
      </details>
      <details data-testid="atlas-scene-review">
        <summary>R3 scene compatibility · C2–C8 retained</summary>
        {SCENE_COMPATIBILITY_REVIEWS.map(idea => <div key={idea.id}>
          <h4>{idea.id} · {idea.title}</h4>
          <p>{idea.compatibleScope}</p>
          <p>{idea.requiredConversion}</p>
          <p>Additive gap: {idea.remainingGap}</p>
        </div>)}
      </details>
      <p>
        Generic scene primitives do not mean this Hamiltonian has a numerical
        result adapter. No new worker or Math3D connection.
      </p>
    </section>
  );
}
