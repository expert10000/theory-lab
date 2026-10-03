/** Delivery IDs are historical; imported-plan coverage must not relabel them. */
export interface RoadmapEntry {
  id: string;
  title: string;
  state: string;
  detail: string;
}
export const DELIVERED_QVIS: RoadmapEntry[] = [
  {
    id: "QVIS-001",
    title: "Portable quantum-scene/v1 contract",
    state: "Implemented",
    detail: "Strict TS/Python validation and bounded binary artifacts.",
  },
  {
    id: "QVIS-002",
    title: "Reusable scene renderer & verified bundle export",
    state: "Implemented",
    detail:
      "Shared desktop/web viewers; verified desktop export and read-only browser imports.",
  },
  {
    id: "QVIS-003",
    title: "Scalar/complex fields, isosurfaces & slices",
    state: "Implemented",
    detail: "Bounded regular grids, not large-data streaming.",
  },
  {
    id: "QVIS-004",
    title: "Hydrogenic orbital fields & radial diagnostics",
    state: "Implemented",
    detail: "Analytic single-electron 1s–3d, not many-electron chemistry.",
  },
  {
    id: "QVIS-005",
    title: "SSH bonds, Ising magnetization & QWZ axes",
    state: "Implemented",
    detail: "Existing-model scenes, not a generic crystal framework.",
  },
  {
    id: "QVIS-006",
    title: "Read-only verified scene bundle import",
    state: "Implemented",
    detail:
      "This delivered ID is not the supplied plan's reciprocal-space milestone.",
  },
  {
    id: "QVIS-007",
    title: "Orbital convergence studies & radial nodes",
    state: "Implemented",
    detail:
      "This delivered ID is not the supplied plan's portable-band milestone.",
  },
  {
    id: "QVIS-008",
    title: "Generic lattice cells & bounded supercell fixtures",
    state: "Implemented",
    detail:
      "Square, honeycomb and simple cubic; explicit basis, bonds and translations. Geometry is not a computed physics run.",
  },
  {
    id: "QVIS-009",
    title: "Reciprocal basis & Brillouin-zone inspection",
    state: "Implemented",
    detail:
      "Supplied high-symmetry points/paths, boundaries and k-point inspection.",
  },
  {
    id: "QVIS-010",
    title: "Portable band paths & surfaces",
    state: "Implemented",
    detail:
      "Verified supplied SSH/QWZ energies, synchronized band/k-point/gap inspection and offline bundles. No inferred topology.",
  },
  {
    id: "QVIS-011",
    title: "Supplied Berry/vector/topology scene extensions",
    state: "Implemented",
    detail:
      "Display supplied quantities; do not infer invariants or invent unsupported physics models.",
  },
  {
    id: "QVIS-012",
    title: "Chunked artifacts, lazy verification & LOD",
    state: "Implemented",
    detail:
      "Separate bounded multilevel bundles, lazy 64 KiB chunks, 4 MiB cache, retained verified view on cancellation and explicit display subsets.",
  },
  {
    id: "QVIS-013",
    title: "Portable visualization v0.1 release gate",
    state: "Implemented",
    detail:
      "Bounded v0.1 acceptance: desktop/web Scenes, offline imports, strict CSP, compatibility, integrity and documented limits.",
  },
];
export const POST_QVIS: RoadmapEntry[] = [];
export const D1_OSCILLATOR_STEPS: RoadmapEntry[] = [
  {id:"D1-001",title:"Bounded oscillator contracts and typed model",state:"Implemented",detail:"Append-only job/result variants; original schema branches fingerprint-tested against R5."},
  {id:"D1-002",title:"QuTiP/native stationary oscillator worker",state:"Implemented",detail:"Independent Fock operators, zero-point ladder, quadrature moments; shared analytic Hermite plotting."},
  {id:"D1-003",title:"Electron oscillator lab and persistence",state:"Implemented",detail:"Density/amplitude plots, engine comparison, strict IPC, stale labels, saved CSV/SVG/manifest and workspace restore."},
  {id:"D1-004",title:"Reviewed oscillator Atlas binding and acceptance",state:"Implemented",detail:"Tenth bounded binding; all 68 references and nine original bindings retained. Desktop-first, dimensionless q, no new scene/Math3D path."},
  {id:"D1-005",title:"Bounded free oscillator dynamics worker",state:"Implemented",detail:"Append-only contracts; QuTiP integration and native spectral phases; verified complex amplitudes, moments, norm/energy drift, projection loss and cancellation."},
  {id:"D1-006",title:"Electron free dynamics and comparison",state:"Implemented",detail:"Fock/projected-coherent controls, moving density/time cursor, q/p trajectories and reference curves; stale labels, independent engine comparison and cancellation."},
  {id:"D1-007",title:"Durable dynamics, exports and acceptance",state:"Implemented",detail:"Verified saved amplitudes/provenance, q/p SVG and CSV/manifest, optional backward-compatible workspace draft/mode; restart and regression acceptance. No driven/anharmonic/ND or scene/Math3D expansion."},
  {id:"D1-008",title:"Bounded monochromatic driven oscillator worker",state:"Implemented",detail:"Append-only contracts; independent QuTiP lab-frame integration/native rotating eigensystem; analytic displacement and independent finite-amplitude, energy/power checks. Explicit omega/2 Atlas offset."},
  {id:"D1-009",title:"Electron driven oscillator mode",state:"Implemented",detail:"Complex drive controls, moving density, q/p, occupation, work/cutoff diagnostics, independent comparison and cancellation alongside static/free modes."},
  {id:"D1-010",title:"Driven Atlas binding, durability and acceptance",state:"Implemented",detail:"Eleventh restricted Atlas mapping with explicit Lab preset, all ten preceding bindings unchanged; verified exports, optional input/mode restoration, restart/regression and release record. No arbitrary envelope, damping, parametric/anharmonic/ND, web compute or Math3D extension."},
  {id:"D1-011",title:"Bounded Gaussian oscillator pulse worker",state:"Implemented",detail:"Append-only pulse contracts; independent QuTiP/DOP853 evolution, scalar displacement quadrature, finite RK4 host verification, bounded integration and endpoint/work diagnostics."},
  {id:"D1-012",title:"Electron pulse controls and convergence inspection",state:"Implemented",detail:"Separate Gaussian mode in the shared oscillator lab; declared-drive plot, synchronized sample cursor, independent comparison and bounded cutoff/maxStep studies with explicit initial-projection differences."},
  {id:"D1-013",title:"Durable pulse runs and acceptance",state:"Implemented",detail:"Verified coefficients/envelope/provenance, CSV/q-p SVG/manifest, optional input/mode restoration and restart/regression; all eleven Atlas load presets unchanged. Gaussian preset is an explicit Lab choice, not arbitrary waveforms, web compute or Math3D integration."},
  {id:"D1-014",title:"Bounded thermal Lindblad oscillator engines",state:"Implemented",detail:"Append-only master-equation contracts; independent QuTiP and SciPy density-matrix evolution with loss/thermal excitation, full verified matrix samples and strict numerical bounds."},
  {id:"D1-015",title:"Electron damped oscillator inspection",state:"Implemented",detail:"Existing Oscillator lab gains damping/bath controls, occupation, purity, trace, positivity, coherence, engine comparison and same-engine cutoff sensitivity."},
  {id:"D1-016",title:"Durable open-oscillator runs and acceptance",state:"Implemented",detail:"Independent host propagation check, scientific/hash-verified density matrices and exports, optional input-only workspace restoration and regression acceptance. No Atlas preset, web compute, scene or Math3D change."},
  {id:"D1-017",title:"Bounded parametric oscillator engines",state:"Implemented",detail:"Append-only vacuum quadratic-coupling job, independent QuTiP and native SciPy finite-Fock solvers, full complex amplitudes and independent propagation/readout validation."},
  {id:"D1-018",title:"Desktop squeezing and cutoff inspection",state:"Implemented",detail:"Existing Oscillator lab gains complex-coupling controls, quadrature-variance curves, stable Bogoliubov reference, engine comparison and N-to-N+8 sensitivity."},
  {id:"D1-019",title:"Durable parametric runs and acceptance",state:"Implemented",detail:"Scientifically verified saved amplitudes, CSV/variance SVG/manifest exports, optional input-only workspace restoration and regression acceptance. The eleven reviewed Atlas bindings, web permissions, scene vocabulary and Math3D boundary remain unchanged."},
  {id:"D1-020",title:"Bounded quartic oscillator eigenpairs",state:"Implemented",detail:"Append-only m=1 confining quartic job; independent QuTiP/native finite-Fock eigensolvers, full low-state coefficients and host residual/orthogonality/moment verification."},
  {id:"D1-021",title:"Electron quartic spectrum inspection",state:"Implemented",detail:"Existing oscillator tab gains λ controls, harmonic-baseline level shifts, ⟨x²⟩/⟨x⁴⟩, engine comparison and N-to-N+8 cutoff sensitivity."},
  {id:"D1-022",title:"Durable quartic runs and acceptance",state:"Implemented",detail:"Reopen-time eigenpair verification, CSV/SVG/manifest exports, input-only workspace restoration and desktop/scientific acceptance. Eleven Atlas bindings, web/scene and Math3D boundaries unchanged."},
];
/** Linked-workspace roadmap: UI-1–5 delivered for declared adapters; UI-6–8 planned. */
export const QLAB_UI_STEPS: RoadmapEntry[] = [
  {id:"QLAB-UI-1",title:"Model workspace and navigation",state:"Implemented",detail:"Six modes, grouped model navigation, legacy routes and exact persisted-run breadcrumbs cover every currently reachable lab, including orbitals and all seven oscillator operations. Verified Runs reopening is distinct from input-only workspace restore."},
  {id:"QLAB-UI-2",title:"Linked scientific selection",state:"Implemented",detail:"Run-scoped energy, time, grid, topology, orbital voxel/radial and oscillator sample selections link only recorded values. Reopening clears unavailable selections; another run, absent state, unrecorded trajectory or comparison partner is never inferred."},
  {id:"QLAB-UI-3",title:"Observable inspector and interactive Hamiltonian",state:"Implemented",detail:"Model-specific run-backed inspectors distinguish immutable inputs from drafts and show stored observables, diagnostics and provenance across all current labs. State claims follow each artifact: no Transmon eigenvectors, full Ising state, sweep-cell trajectory, generic topology eigenvectors or unsupported oscillator wavefunction."},
  {id:"QLAB-UI-4",title:"Universal sweep workspace",state:"Implemented",detail:"The model-selected Sweeps workspace keeps dynamics final-P₁ sweeps distinct from the two-level E± avoided-crossing study. A bounded versioned plan composes 3–31 verified spectrum runs; atomic study checkpoints support reopen, cancellation and resume without repeating points. Every sample links to its exact saved run or a parameter draft. Unsupported model/output pairs remain gated until declared adapters exist."},
  {id:"QLAB-UI-5",title:"Linked state visualization",state:"Implemented",detail:"A verified two-level Bloch x-z great-circle view projects stored eigenvectors, links spectrum/inspector/Analysis selection and reveals basis amplitudes, populations, Pauli expectations and residuals. Legacy energy-only and degenerate runs explicitly withhold a unique state; saved runs reopen without inventing selection. Complex global-phase invariance and QuTiP/native acceptance are tested. Larger-Hilbert linked adapters remain future extensions."},
  {id:"QLAB-UI-6",title:"Run comparison",state:"Planned",detail:"Pin immutable A/B runs; compare compatible inputs, observables and numerical diagnostics with explicit units and alignment."},
  {id:"QLAB-UI-7",title:"Provenance and reproducible rerun",state:"Planned",detail:"Expose exact stored inputs, engine/environment and hashes; rerun as a new linked run while disclosing version differences."},
  {id:"QLAB-UI-8",title:"Verified scene bridge",state:"Planned",detail:"Selected compatible run to existing quantum-scene/v1 and Lab viewer; Math3D handoff only after separate importer acceptance."},
];
export const ATLAS_RECONCILIATION_STEPS: RoadmapEntry[] = [
  {
    id: "R1",
    title: "Canonical Atlas ↔ existing Lab capability inventory",
    state: "Implemented",
    detail:
      "Pinned 68 entries; seven source-example references; nine preserved tested bindings; full model/UI/gateway/scene map. No new physics or parallel infrastructure.",
  },
  {
    id: "R2",
    title: "Executable Atlas mappings to existing jobs/labs",
    state: "Implemented",
    detail:
      "68 reviewed dispositions; nine unchanged bindings with coefficient/basis/unit evidence; two restricted adapter candidates remain disabled. No new solver is claimed.",
  },
  {
    id: "R3",
    title: "C2–C8 ideas mapped to quantum-scene/v1",
    state: "Implemented",
    detail:
      "Seven compatibility reviews and tested regular-grid reordering. Existing scenes unchanged; nonuniform grids, chemistry and periodic-crystal semantics remain additive gaps.",
  },
  {
    id: "R4",
    title: "Genuinely missing physics and model inventory",
    state: "Implemented",
    detail:
      "All 68 IDs classified: nine covered subspaces, two adapter candidates, 57 new-model entries in 12 ranked groups with acceptance criteria. Review completed, not 59 new solvers.",
  },
  {
    id: "R5",
    title: "Reconciled Atlas ↔ Lab contract freeze",
    state: "Implemented",
    detail:
      "Strict additive atlas-lab-reconciliation/v1 metadata, complete coverage/digests and compatibility gates. Existing scientific protocols retained; future additions remain possible.",
  },
];
export const SOURCE_PLAN_COVERAGE: RoadmapEntry[] = [
  {
    id: "QVIS-001",
    title: "Scene contract",
    state: "Implemented (bounded)",
    detail: "Strict shared schema, IDs, units, references and verification.",
  },
  {
    id: "QVIS-002",
    title: "Reusable renderer",
    state: "Implemented (bounded)",
    detail:
      "Shared renderer, desktop export and product web Scenes with read-only saved views/offline imports.",
  },
  {
    id: "QVIS-003",
    title: "Scalar/complex visualization",
    state: "Implemented (bounded)",
    detail:
      "Regular fields, density/phase/sign, slices and threshold surfaces.",
  },
  {
    id: "QVIS-004",
    title: "Atomic orbital laboratory",
    state: "Implemented (bounded)",
    detail: "Analytic single-electron hydrogenic examples only.",
  },
  {
    id: "QVIS-005",
    title: "Generic lattice/crystal primitives",
    state: "Partial",
    detail:
      "Square/honeycomb/cubic open supercells, basis and translations now exist. Arbitrary crystals and periodic bonds are not implemented.",
  },
  {
    id: "QVIS-006",
    title: "Reciprocal-space and Brillouin zones",
    state: "Partial",
    detail:
      "Square/honeycomb/cubic primitive fixtures and QWZ guides now have explicit dual bases, named points and paths. No arbitrary-crystal BZ construction.",
  },
  {
    id: "QVIS-007",
    title: "Portable band integration",
    state: "Implemented (bounded)",
    detail:
      "Portable SSH paths and QWZ surfaces with supplied worker energies, shared selection and offline inspection; no arbitrary-crystal bands.",
  },
  {
    id: "QVIS-008",
    title: "Berry/topology visualization",
    state: "Partial",
    detail:
      "Supplied scalar/vector/phase quantities and reported invariants; SSH/QWZ plus explicit vector fixtures. Additional model engines remain future work.",
  },
  {
    id: "QVIS-009",
    title: "Large-data streaming and LOD",
    state: "Implemented (bounded)",
    detail:
      "Separate multilevel bundles with lazy verified chunks and cache/cancellation; current per-level grid/memory bounds remain. No unlimited volumes or time player.",
  },
  {
    id: "QVIS-010",
    title: "Visualization release freeze",
    state: "Implemented (bounded)",
    detail:
      "Windows Electron/Chrome acceptance and compatibility/limits recorded in RELEASE_QVIS_V0.1.md; no Math3D or unlimited-volume claim.",
  },
  {
    id: "M3D-Q01–Q10",
    title: "Separate Math3D integration track",
    state: "External / not assessed",
    detail:
      "No Math3D implementation is claimed or changed by this Lab roadmap update.",
  },
  {
    id: "Track A",
    title: "Atlas metadata unification",
    state: "Partial",
    detail:
      "R1–R5 reconcile 68 canonical entries, preserve nine tested bindings, review C2–C8/gaps and freeze additive metadata. Broader physics implementation remains planned, not reduced or replaced.",
  },
];
