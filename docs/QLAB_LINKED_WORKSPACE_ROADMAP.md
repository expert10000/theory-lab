# Quantum Lab linked workspace roadmap

Status (2026-10-03): QLAB-UI-4–5 implemented for declared adapters; UI-1–3 partial; UI-6–8 planned. This roadmap translates
the supplied UI critique into an additive desktop plan after D1-020–022. It
changes how existing physics is explored, not the worker architecture or the
meaning of historical QLAB, QVIS and D1 milestones.

## Delivery status and next work

| State | Milestones | What this means now |
| --- | --- | --- |
| Done | QLAB-UI-4 | The model-selected Sweeps workspace has a bounded two-level eigenenergy study, verified point runs, durable study checkpoints, reopen and resume. Existing dynamics sweeps still mean final `P₁`. This gate is complete for declared adapters, not a claim that every model supports every output. |
| Done | QLAB-UI-5 | The verified two-level eigenvectors drive a linked Bloch x-z great circle and state readout. Spectrum, inspector and Analysis share exact-run selection; legacy and degenerate results show why a unique state is unavailable. This is not a Bloch claim for larger Hilbert spaces. |
| Partially done | QLAB-UI-1 | Six-mode navigation, grouped model access, history and legacy restore work; two-level, evolution, cavity, Lindblad, Transmon and Ising labs have saved-run breadcrumbs. Other labs need adapters. |
| Partially done | QLAB-UI-2 | Exact-run spectrum, time, Transmon-level and Ising-level/site selections link only stored values; these supported runs reopen. Other model adapters remain. |
| Partially done | QLAB-UI-3 | Run-backed two-level, evolution, cavity, Lindblad, Transmon and Ising inspectors distinguish stored inputs from drafts. Other model-specific inspectors remain. |
| Next | Design remaining UI-1–3 adapters | The [remaining-lab audit](QLAB_UI_1_3_REMAINING_LABS_AUDIT.md) leaves sweeps, SSH/QWZ topology, orbitals and multi-mode oscillators for separate designs and acceptance gates. Do not infer unrecorded states. |
| Later | QLAB-UI-6–8 | Immutable A/B run comparison, provenance-aware rerun, then the verified Lab-side scene bridge. Math3D handoff remains a separate acceptance boundary. |

UI-5 is complete for the verified two-level adapter. UI-1–3 become complete
only after their wider adapter/interaction gaps pass the individual acceptance
gates below. Add other sweep-capable
models through declared parameter/observable adapters, without reopening the
completed UI-4 gate or implying universal physics support.

The UI-1–3 evolution slice now covers driven two-level Rabi, Landau–Zener,
Stückelberg and strong drive. Each breadcrumb names the completed saved run;
an exact-run sample selection synchronizes the chart, Bloch state, density and
observable readouts. Their inspectors read immutable result inputs and the
selected binary row. Draft edits mark the displayed result out of date without
replacing stored values. The Runs page reopens SHA-256-checked evolution
results and data after restart, starting at the first recorded sample. The
passage inspectors distinguish finite-run final population from asymptotic or
crossing references; strong drive displays only recorded Floquet analysis and
labels its weak-drive estimate. Other lab families still need adapters.

The completed cavity UI-1–3 slice covers Jaynes–Cummings and quantum Rabi cavity QED.
Their saved-run breadcrumbs and exact-run cursors link the plot to recorded
excited population, mean photon number, boundary probability, norm and parity.
The inspector keeps stored inputs separate from the edited draft, reports
cutoff and drift diagnostics from saved rows, and shows the vacuum-Rabi
reference only for an applicable Jaynes–Cummings `|e,0⟩` run. Both models
reopen from hash-verified artifacts after restart. Six-column cavity data do
not contain a full state vector or Bloch vector, and the UI makes no such claim.
The Lindblad UI-1–3 slice now adds a saved-run breadcrumb, hash-verified
reopening and a run-scoped time cursor over all seven recorded columns. Its
inspector separates immutable inputs from the edited draft, reports selected
population, photon, purity, coherence, boundary and trace values, and shows
recorded-row diagnostics, optional steady-state readout and provenance. The
artifact does not retain a density matrix, state vector or amplitudes; neither
the plot nor inspector claims one. UI-1–3 remain Partial until the other lab
families are assessed against their own acceptance gates.

The bounded inline-result slice now covers Transmon and Ising chain. Both
reopen after restart with job/result hash verification and manifest checks, clearing
selection rather than inventing one. Transmon selection names a stored GHz
energy level; its inspector shows exact inputs, transitions, charge-matrix
element magnitude, ncut+2 E₀₁ drift and provenance, but no eigenvectors.
Ising selection names a stored low-energy level or site magnetization; its
inspector shows finite-size gap, ground energy, half-chain entropy and
provenance, but no full ground-state vector or excited-state observables.
An optional comparison computation is a separate saved run and is not
silently reattached when a single result is reopened. The audited sweep,
topology, orbital and oscillator families remain outside these adapters.

## Decision and current baseline

The next Lab investment should connect models, experiments, results and views
before adding another independent laboratory. The Electron app already has
React model controls, a typed preload, supervised Python jobs, saved runs,
Atlas definitions, presets and `quantum-scene/v1`. The desktop now renders six
model-aware workspace modes and separate Library/System entries; it previously
rendered 17 top-level tabs. The two-level pilot links spectrum, matrix,
Hamiltonian, inspector and Bloch/state references; wider model views still need
declared adapters. These are UI and result-adapter
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

The current primary workspace modes are **Explore, Dynamics, Sweeps,
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

The two-level right inspector has **Parameters, Observables, Provenance**;
other models need explicit adapters. Exact
numeric input remains authoritative. A slider may accompany a bounded
parameter but may not round or silently change the entered value; units and
conventions stay visible. Sweep affordances appear only for parameters with a
supported operation and range. Provenance separates the input recipe from
the environment that actually executed it.

## Shared interaction boundaries

These are UI boundaries at different delivery stages, not a parallel quantum
job registry.

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

## Milestone detail and acceptance gates

QLAB-UI-1 is **Partial**: six-mode navigation, grouped native-keyboard model
disclosures, separate Library/System links, safe fragment routes, back/forward,
legacy snapshot mapping and the two-level, four evolution, two cavity and Lindblad persisted-run breadcrumbs are tested.
Transmon and Ising persisted-run breadcrumbs are also tested.
Other labs still need run-context breadcrumb adapters; no result is inferred from
their inputs. QLAB-UI-2 is **Partial**: the two-level pilot now has typed
run-scoped energy references, draft parameter/operator references, keyboard
selection, linked highlights and invalidation on a new run or model. The Runs
view now reopens a hash-verified saved two-level spectrum from the existing
run store; only a selection naming that exact run survives reopening. A
different or missing run cannot inherit it, and no selection is invented after
an app restart. Legacy energy-only `quantum-result/v1` spectra do not acquire
invented eigenvectors; new two-level results have independently checked state
diagnostics. The linked Bloch/state view is delivered in UI-5; wider model
adapters remain future gates. All four two-state evolution models add typed
exact-run time-sample selection, synchronized numerical/state views and
saved-run reopening without inventing a retained selection. The two cavity
models similarly link only recorded six-column observables to an exact run and
time index; no state amplitude or Bloch selection is implied. Lindblad links
only its seven recorded time-series values and optional separate steady-state
readout, not a retained density matrix. Transmon levels and Ising levels/sites
add exact-run selections without claiming saved eigenvectors or a full
spin-chain wavefunction. UI-3 is **Partial**: new two-level runs carry real
normalized eigenvectors, populations, Bloch expectations and
eigenpair residuals from QuTiP or native diagonalization. An independent
Electron check validates them before display, persistence and reopening;
degenerate/near-degenerate results carry only gap and threshold, without an
arbitrary eigenvector. The inspector has Parameters, Observables and Provenance
views, and old energy-only saved results remain readable without invented
state data. The formula's parameter/operator buttons remain keyboard usable.
Bounded coarse Δ/Ω sliders now mirror the exact draft without clamping
out-of-range numeric inputs. Evolution inspectors expose stored solver/engine
inputs and selected saved-data samples, with a distinct stale-draft notice.
Landau–Zener and Stückelberg show recorded final population beside labeled
model-derived references; strong drive shows recorded Floquet diagnostics
only when present, without claiming an independent interference phase.
Both cavity inspectors show stored cutoff, selected observables, maximum
boundary/norm/parity diagnostics and provenance; only applicable
Jaynes–Cummings runs show their existing vacuum-Rabi reference.
The Lindblad inspector shows trace, purity and boundary diagnostics, stored
input/provenance and steady-state availability without claiming a stored
density matrix or state vector.
Transmon and Ising inspectors show only the saved scalar/array diagnostics,
inputs and provenance, with stale drafts explicitly separated.
Wider model adapters are still future work.
UI-4 is **Implemented for declared adapters**: the two-level Sweeps view plots
E₋/E₊ against Δ at fixed Ω from separately verified, saved spectrum runs.
Keyboard-selectable points open their exact saved run or populate an
uncomputed draft. The original dynamics sweep remains final P₁. A durable
study-level manifest is checkpointed after every verified point and can be
reopened or resumed after cancellation or restart. Workspace restore keeps
bounded inputs, without inventing a completed study. Other model/output
adapters and broader sweep comparison remain future extensions. UI-5 is
**Implemented for the verified two-level adapter**; UI-6–8 are **Planned**.
Their numbers are UI-specific and
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

Implementation choice: a separate `quantum-spectrum-study/v1` plan now composes
3–31 existing verified `diagonalize` jobs, one durable run per sampled Δ.
Each point records its exact coordinate and source run ID; cancellation is
between points. This adds no new worker operation or change to the existing
final-`P₁` sweep. The interactive Lab view links plotted points to their saved
spectra or to fresh parameter drafts. The Electron main process atomically
checkpoints a versioned, SHA-256-protected study manifest after each verified
point. Reopening checks every source run, exact model parameters, engine,
sample coordinate and analytic energy. Cancelled/interrupted studies can resume
from that verified prefix without recomputing previous points; workspace
restore remains input-only, with saved studies reopened explicitly.

Acceptance: sampled energies match direct two-level jobs and the analytic
formula within declared tolerance; zero-gap degeneracy is handled; each
point records exact parameters, engine and source; cancel/retry and maximum
sampling/compute budget are tested. Other models join only with their own
declared sweep parameters and observables.

Status: **Implemented for declared sweep-capable models.** The shared Sweeps
workspace routes two-level models to eigenenergy studies and existing dynamics
models to final-`P₁` sweeps. It does not present unsupported models or silently
reinterpret an observable. The 3–31-point cap is the computation budget for
this adapter; additional model/output adapters are future extensions, not a
prerequisite to the current gate.

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

Status: **Implemented for verified two-level states.** QuTiP/native eigenvectors
already pass independent host checks before display or persistence. A local SVG
shows only the two saved real eigenstates on the y = 0 Bloch great circle;
selecting a point, spectrum level or inspector level shares one run-scoped
selection across Explore and Analysis. A separate stored-run matrix makes its
Hamiltonian inputs explicit beside the state, while the editable draft matrix
stays labeled as a draft. The state readout shows the stored
computational-basis amplitudes in a documented real sign gauge, probabilities,
Pauli expectations and residual. A changed draft is labeled stale without
changing the immutable state; reopening a saved run validates its result and
never invents a selected level after restart. Legacy energy-only and
degenerate/near-degenerate runs explicitly withhold a unique point. Tests cover
normalization, complex global-phase invariance, keyboard selection and both
scientific engines. Larger-Hilbert linked state adapters remain future work;
their existing bounded probability/amplitude plots are not relabeled Bloch
spheres. No worker operation or scene schema was added.

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

The two-level UI-1–3 pilots and the UI-4–5 sweep/state gates are delivered to
the extent stated above. Next close the remaining UI-1–3 adapter gaps with
verified cross-lab run context and view projections. Then proceed to UI-6 and UI-7 comparison and
reproducibility, and finally UI-8 for compatible scenes. After each slice,
broaden model coverage by explicit adapters, preserving
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
