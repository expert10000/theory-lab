import React from "react";
import { reconcileAtlas } from "../atlas/reconciliation";
import { executableReview } from "../atlas/executable-review";
import "./atlas-capabilities.css";

/** Shared read-only explanation. Never creates a Run action or worker job. */
export function AtlasCapabilities({ id }: { id: string }) {
  const row = reconcileAtlas(id);
  if (!row) return null;
  const lab = row.lab;
  const review = executableReview(id)!;
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
      <p>
        Generic scene primitives do not mean this Hamiltonian has a numerical
        result adapter. No new worker or Math3D connection.
      </p>
    </section>
  );
}
