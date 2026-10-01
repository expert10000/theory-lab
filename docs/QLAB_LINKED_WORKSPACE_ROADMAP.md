# Quantum Lab linked workspace roadmap

Status: QLAB-UI-1 and UI-2 partially implemented; remaining gates planned. Updated 2026-10-01. This roadmap translates
the supplied UI critique into an additive desktop plan after D1-020–022. It
changes how existing physics is explored, not the worker architecture or the
meaning of historical QLAB, QVIS and D1 milestones.

## Decision and current baseline

The next Lab investment should connect models, experiments, results and views
before adding another independent laboratory. The Electron app already has
React model controls, a typed preload, supervised Python jobs, saved runs,
Atlas definitions, presets and `quantum-scene/v1`. The desktop now renders six
model-aware workspace modes and separate Library/System entries; it previously
rendered 17 top-level tabs. A selected spectrum level is not a shared selection
across matrix, state and visualization views. These are UI and result-adapter
gaps, not evidence that existing physics needs to be rebuilt.

The proposed organizing chain is:

```text
Model → Experiment → immutable Run → verified result → linked views
```

For example, `Two-level system → Spectrum → Δ=1, Ω=0.8 → run-…` should keep
the same run and selected eigenstate in the spectrum, Bloch, matrix, state,
observables and provenance views. Editing parameters makes that run visibly
stale; it does not rewrite its result. A user can return to an older run or
compare two runs without losing their input provenance.

## Navigation and scientific language

The proposed primary workspace modes are **Explore, Dynamics, Sweeps,
Analysis, Scenes and Runs**. Explore hosts Spectrum, Hamiltonian, Eigenstates
and State views where supported. These are navigation concepts, not six new
worker operations. Presets and the pinned Atlas become a Library entry point;
Roadmap and Backend move under Help or System. Existing routes and saved
workspace snapshots must continue to open via compatibility mapping. A
model's available experiments come from the existing typed model/capability
metadata plus explicit view adapters, never from an untested generic claim.

The model navigator groups current entries without renaming their scientific
IDs:

| Group | Initial entries |
| --- | --- |
| Two-level | Two-level, driven Rabi, Landau–Zener, Stückelberg, Floquet/strong drive |
| Light–matter | Jaynes–Cummings, quantum Rabi |
| Open systems | Lindblad |
| Many-body | Ising chain |
| Topology | SSH and QWZ band workspaces |
| Atomic and continuous | Hydrogenic orbitals, harmonic/parametric/quartic oscillator modes |
| Circuits | Transmon |
| Library | Volume VIII presets and Hamiltonian Atlas references |

Groups should be collapsible and keyboard accessible. Runs and Scenes remain
workspace destinations rather than pretend model families. The current dark
scientific visual language stays. An active model and experiment should be
more distinct than inactive green navigation buttons; green can remain the
success/selection accent. Plot size, whitespace and secondary-label contrast
are measured and adjusted after the information hierarchy works. Compact
scientific badges such as `Hermitian`, `dim=2`, `closed system` and `exact
diagonalization` must be derived from a model/run, not copied into every lab.

The right inspector becomes **Parameters, Observables, Provenance**. Exact
numeric input remains authoritative. A slider may accompany a bounded
parameter but may not round or silently change the entered value; units and
conventions stay visible. Sweep affordances appear only for parameters with a
supported operation and range. Provenance separates the input recipe from
the environment that actually executed it.

## Shared interaction boundaries

These are proposed UI contracts, not a parallel quantum job registry.

- **Workspace context:** stable model ID, experiment kind, draft input,
  selected run ID and source preset/Atlas reference. Existing jobs/results
  remain authoritative for numerical content. Old `quantum-workspace/v1`
  snapshots are read through an explicit migration/compatibility layer.
- **Scientific selection:** a typed, renderer-side selection of parameter,
  Hamiltonian term, eigenvalue/eigenstate, sweep sample, observable or scene
  feature, always scoped to a run or draft. Selections carry stable IDs and
  resolve only against the verified result they name. Changing model/run
  clears or remaps incompatible selections; no fabricated state is displayed.
- **View adapters:** small, tested per-model adapters project existing
  contracts into spectrum, matrix, state, Bloch, observable and scene views.
  Unsupported views say why they are unavailable. An adapter cannot silently
  invoke another engine, infer missing eigenvectors, or present a generic
  Atlas entry as an executable binding.
- **Run lineage:** every derived sweep point, comparison or scene names the
  source job/result, engine, parameters, units and hashes where available.
  A click can populate a new draft without mutating the source run.

## Planned milestones and acceptance gates

QLAB-UI-1 is **Partial**: six-mode navigation, grouped native-keyboard model
disclosures, separate Library/System links, safe fragment routes, back/forward,
legacy snapshot mapping and the two-level persisted-run breadcrumb are tested.
Other labs still need run-context breadcrumb adapters; no result is inferred from
their inputs. QLAB-UI-2 is **Partial**: the two-level pilot now has typed
run-scoped energy references, draft parameter/operator references, keyboard
selection, linked highlights and invalidation on a new run or model. The Runs
view now reopens a hash-verified saved two-level spectrum from the existing
run store; only a selection naming that exact run survives reopening. A
different or missing run cannot inherit it, and no selection is invented after
an app restart. The `quantum-result/v1` spectrum has energies but no
eigenvectors, so the UI explicitly declines to display an eigenstate. Wider
model adapters remain future gates. UI-3 is **Partial**: new two-level runs
carry real normalized eigenvectors, populations, Bloch expectations and
eigenpair residuals from QuTiP or native diagonalization. An independent
Electron check validates them before display, persistence and reopening;
degenerate/near-degenerate results carry only gap and threshold, without an
arbitrary eigenvector. The inspector has Parameters, Observables and Provenance
views, and old energy-only saved results remain readable without invented
state data. The formula's parameter/operator buttons remain keyboard usable.
Wider model adapters and an optional bounded slider are still future work.
UI-4–8 are **Planned**. Their numbers are UI-specific and
do not relabel existing QLAB or QVIS commits. Implement them in order unless
an explicit dependency is split out and tested independently.

### QLAB-UI-1 Model workspace

Separate model/domain navigation from experiment/workspace navigation. Keep
legacy deep links, keyboard paths and `quantum-workspace/v1` restores working.
Introduce a breadcrumb such as `Two-level system / Spectrum / run-…`, using
the actual persisted run ID. Library, Roadmap and Backend gain a discoverable
home without disappearing. Start with the two-level workspace, then migrate
the other existing labs through adapters rather than a wholesale rewrite.

Acceptance: every currently reachable lab, preset, Atlas item, saved run and
scene remains reachable; old snapshots open to the equivalent model and
experiment; unsupported model/experiment pairs are visibly disabled with a
reason; keyboard focus and back/forward behavior are tested.

### QLAB-UI-2 Linked scientific selection

Introduce the typed selection context and event rules. In the two-level
pilot, selecting `E+` highlights its eigenstate, choosing `Ω` focuses the
transverse-coupling control, and choosing `σx` shows its operator matrix.
Term hover may temporarily highlight a contribution; persistent selection
must be distinct from hover. No view may infer a state from energies alone.

Acceptance: selections synchronize across open views; a new run or model
invalidates incompatible selections; saved-run reopening restores only
validated selection references; tests cover stale and missing references.

### QLAB-UI-3 Observable inspector and interactive Hamiltonian

Provide Parameters, Observables and Provenance inspector tabs. For the
two-level spectrum, inspect energy, gap, normalized eigenvector, populations,
Bloch expectations `⟨σx⟩`, `⟨σy⟩`, `⟨σz⟩`, degeneracy status and eigenpair
residual. Make the formula's parameters and operators selectable using
model-specific semantic metadata. Show the actual run's `Δ` and `Ω`, not
possibly edited draft values. Exact numeric input, optional slider, units
and validation must agree.

Acceptance: analytic and independent matrix checks validate expectations and
residuals; degenerate/near-degenerate states avoid unstable eigenvector
claims; no provenance field is invented when an older run lacks it; formula
selection remains keyboard usable.

### QLAB-UI-4 Universal sweep workspace

Make parameter, range, sampling, output quantity and engine explicit. The
first linked study is the two-level avoided crossing
`E±(Δ)=±sqrt(Δ²+Ω²)/2` at fixed `Ω`. Clicking a sampled point opens the
corresponding parameter draft or verified point result, then its linked
spectrum/state views. The existing sweep operation reports final-state
probability for selected dynamics models; it must not be relabeled as an
eigenenergy sweep. Add a bounded, versioned spectrum-sweep result path or
compose verified bounded spectrum jobs with clear lineage and cancellation.

Acceptance: sampled energies match direct two-level jobs and the analytic
formula within declared tolerance; zero-gap degeneracy is handled; each
point records exact parameters, engine and source; cancel/retry and maximum
sampling/compute budget are tested. Other models join only with their own
declared sweep parameters and observables.

### QLAB-UI-5 State visualization

Use the two-level Bloch sphere as the first linked state view. A selected
verified eigenvector determines its Bloch vector; selecting a sphere state
reveals coefficients and populations in a state view. The matrix, spectrum
and state views share the same run and basis convention. For larger Hilbert
spaces, start with bounded probability/amplitude views rather than implying
a Bloch representation. Reuse `quantum-scene/v1` where its frozen vocabulary
fits; a local UI view need not create a new scene schema.

Acceptance: normalization and basis/phase conventions are documented and
tested; global phase does not change physical Bloch observables; selected
levels match the spectrum/inspector; unsupported state visualizations are
explicitly unavailable.

### QLAB-UI-6 Run comparison

Allow users to pin two immutable runs and compare input, engine, units,
observables and numerical diagnostics side by side. Same-model comparisons
can align levels or time/sample coordinates only when their basis and units
are compatible. Cross-model comparisons may show metadata, not invented
physical deltas. A/B selection persists by run ID, not a copied plot.

Acceptance: delta definitions and alignment rules are displayed; changed
engines, cutoffs and model revisions are visible; a deleted or incompatible
run is handled without silently substituting another run; existing run
exports remain valid.

### QLAB-UI-7 Provenance and reproducible rerun

Consolidate job, model, solver, source preset/Atlas revision, worker/engine
versions, runtime, artifact hashes and export lineage in a provenance drawer.
“Re-run exactly” means reconstructing the stored input job. It does **not**
promise bitwise-identical results if the available worker/engine versions or
hardware differ; show that difference before execution. Never mutate the
original run or silently upgrade its schema.

Acceptance: rerun job bytes/semantics match the stored job after explicit
compatibility validation; new run has a new ID and links to its parent;
missing engine or unsupported old contract gives an actionable refusal;
hash-verified exports and imports retain source identity.

### QLAB-UI-8 Scene bridge

From a selected compatible run/state/result, build or open a portable
`quantum-scene/v1` through existing QVIS adapters, preview it in the Lab
viewer and preserve source-run provenance. Unsupported results do not get a
generic fabricated 3D scene. This milestone is Lab-side only. “Open in
Math3D” remains conditional on a verified importer and handoff in the
separate Math3D repository; no direct UI-to-worker or Lab-to-Math3D worker
call is introduced.

Acceptance: scene bundles validate under the current TS/Python schema,
round-trip in desktop and web read-only viewers, and retain source hashes;
existing QVIS fixtures do not change. The Math3D action appears only after
the external importer/handoff has its own compatibility tests.

## Delivery order and release gates

The useful first slice is UI-1 → UI-2 → UI-3 on the existing two-level
model, with no new physics solver. UI-4 and UI-5 then prove the linked
parameter → sweep → state workflow. UI-6 and UI-7 make results comparable
and reproducible; UI-8 connects only supported results to existing scenes.
After each slice, broaden model coverage by explicit adapters, preserving
the current direct lab entry points until equivalent paths pass acceptance.

Every milestone requires TypeScript/React tests, keyboard/accessibility and
desktop smoke, worker/contract tests when numerical schemas change, saved-run
and workspace compatibility checks, and regression of web/scene boundaries.
The release gate is not merely a cleaner screenshot: a user must be able to
select a model, run an experiment, inspect a scientifically verified state,
follow that selection across views, revisit or compare a saved run, and see
exactly which computation produced each display.

This roadmap does not authorize new Atlas bindings, change the 68 pinned
definitions, replace existing jobs, alter Math3D, or promise that every
model supports every experiment. Those remain separate scientific and
cross-repository decisions.
