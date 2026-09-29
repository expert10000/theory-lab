# Atlas reconciliation v1 — R2–R5 acceptance

Windows source acceptance, 2026-09-29, following R1 commit `03313df`.
This is an additive reconciliation delivery, not an installer release or
implementation of all 68 Hamiltonians. No Math3D or theory working-tree files
are changed; the supplied post-QLAB planning reference is preserved unchanged.

## Delivered scope

- R2: all 68 executable dispositions reviewed; nine tested bindings preserved
  with explicit parameter, basis, unit, approximation and truncation evidence.
  Zeeman signs and collective/dispersive frame-conversion algebra are checked,
  without enabling those candidate models or claiming source-runner acceptance.
- R3: all seven C2–C8 ideas retained and mapped to existing QVIS vocabulary.
  Supplied regular `[z][y][x]` density is reordered explicitly, with asymmetric
  grid, rejection and TS/Python scene verification tests. No normalization,
  interpolation, complex amplitude or topology is invented.
- R4: all entries classified exactly once: nine covered subspaces, two
  parameter-adapter candidates and 57 entries needing new model scope.
  Twelve additive backlog groups record priority, dependencies and acceptance.
- R5: strict `atlas-lab-reconciliation/v1` metadata plus schema, semantic
  validator, complete source/catalog/review digests and regeneration gates.
  Unknown versions/fields, source execution permissions, missing entries,
  changed bindings/host controls/scene coverage and digest drift are rejected.

All existing labs, operations, engines, host controls, scene formats and strict
validation/memory bounds are retained. The job/result/capabilities/resources
and scene JSON schemas have no changes in this delivery. Their semantic hashes
are recorded in [the review](ATLAS_RECONCILIATION_R2_R5.md). Freeze metadata is
not a job dispatcher or a new B/C workspace/visualization abstraction.

## UI access

Desktop: **Atlas → select an entry → Reconciled capabilities · R1–R5**.
The R2 executable review, R3 scene compatibility and R4 physics-gap details are
expandable. The R5 metadata version is visible above them.
**Roadmap → Atlas reconciliation** marks R1–R5 implemented as review milestones.

Web: the same Atlas inspector is available before authentication. Candidate,
related-only and reference entries still have no Load/Run action. Existing
authenticated computation and local read-only scene imports remain available.

## Acceptance evidence

| Gate | Result |
| --- | --- |
| TypeScript typecheck and source build | Passed |
| Regression/contract suite | 88 tests: 87 passed, 1 configured SSH skip |
| Python worker suite | 59 tests: 55 passed, 4 optional-engine/device skips |
| Electron acceptance and full restart | Passed; all existing lab/workspace/scene paths retained |
| Chrome web acceptance | Passed; authentication, worker results, offline scenes, R2–R5 inspector and disabled candidate actions |
| Independent scene renderer | Passed; strict CSP, verification, inspection, cancellation and WebGL fallback |
| Canonical Atlas, R1/R2–R5 reports and frozen metadata checks | Passed |
| Preserved supplied planning reference | Unchanged compared to R1 |

SSH is not configured for the optional remote test. Dynamiqs CUDA, QuSpin and
scqubits are unavailable here; their existing adapters/features are preserved,
not removed. The QuTiP matplotlib warning does not affect these numerical tests.
Candidate conversion algebra is evidence of a reviewed relationship, not proof
that missing model jobs, host controls or numerical adapters are implemented.

Commands to reproduce are in ATLAS_RECONCILIATION_R2_R5.md. Screenshots produced
by acceptance include `artifacts/desktop-atlas-r2-r5.png`,
`artifacts/web-atlas-r2-r5.png` and `artifacts/desktop-post-roadmap.png`.
Artifacts are local QA output, not a released installer or publisher signature.

Future work remains additive. A standalone 1D harmonic-oscillator lab is the
recommended bounded next physics milestone; it is not implemented by R2–R5.
