# Rb87 Quantum Companion: Theory Lab integration roadmap

Status: source intake complete; app integration planned. This is a feature track for Theory Lab. It does not change Math3D's 2.0 release gates or the QI-40 paired-app qualification.

## Source and current product boundary

The user-supplied [seven-chapter companion](source-material/rb87-companion/README.md) is stored as unchanged PDF and TeX files with its SHA-256 manifest. The manifest verifies file identity, not scientific correctness or external references. Before publishing chapter text in the app, review attribution, dated experimental claims, equations, units, and bibliography against the supplied PDFs and independent sources. Preserve chapter and section locators in any UI citation.

Theory Lab already has a Theory tab, the 68-entry Hamiltonian Atlas, verified saved runs, hydrogenic single-electron orbitals, an Ising many-body lab, and Lindblad atom–cavity and damped-oscillator labs. Those are useful navigation anchors, but they do not compute Rb87 condensates, Bose–Hubbard bosons, fluorescence microscopy, or their measurements. The Atlas classifies `bose_hubbard` as reference-only with no Lab binding ([reconciliation](ATLAS_RECONCILIATION_R2_R5.md)). QVIS open lattice fixtures show geometry; they are not an interacting Bose gas.

| Chapters | Possible existing anchor | Gap that must remain explicit |
| --- | --- | --- |
| I–II: atomic structure, BEC, interference, time of flight | Hydrogenic orbital Theory; complex-field scene vocabulary | Hydrogenic is one electron, not an Rb87 atom or condensate; no trap, interacting BEC, or time-of-flight solver. |
| III–IV: optical lattice, Bose–Hubbard, quenches | Atlas `bose_hubbard` reference; QVIS lattice geometry; finite Ising saved-run patterns | No bosonic Fock basis, Bose–Hubbard engine, or bosonic quench result. Ising sites cannot stand in for bosons. |
| V–VI: correlations, entanglement, microscopy | Ising half-chain entropy and separately verified state artifact | No bosonic one-body density matrix, particle-number-resolved images, parity detector, or measurement likelihood. |
| VII: dephasing, loss, trajectories, fluorescence | Lindblad and damped-oscillator Theory and verified run patterns | Existing jump operators and Hilbert spaces differ from Rb87 lattice fluorescence and atom loss. No experimental readout model. |

## Build order

### RbC-0 — Preserve and index the source (done in this branch)

- Retain the PDFs, TeX, and supplied hash manifest without editing them.
- Record file identity, page counts, chapter subjects, and the coverage map here.
- Treat chapter prose and equations as reference material until editorial and scientific review; do not derive new model claims from the archive alone.

### RbC-1 — Read-only companion in the desktop Theory area (first app slice)

Add a **Rb87 Companion** library entry that opens a chapter index and a bounded PDF reader or an external PDF action from the packaged assets. The index should show chapter title, section list, source revision/hash, and a clear "reference material" label. A Theory-tab link may point to the relevant chapter section for the active model, but must explain the relationship: existing computation, analogy, or no corresponding Lab model. Begin with Chapter VII ↔ existing Lindblad Theory and Chapters III–IV ↔ reference-only `bose_hubbard`; those links test both a related model and a missing model. Keep the current Theory page and run selection intact when opening and closing the companion.

Acceptance: all seven chapters open after desktop packaging and restart; a missing or changed asset is reported and withheld; links restore the exact chapter/section; keyboard navigation and zoom work; no PDF load is required for model computation. The reader must not label a saved atom–cavity Lindblad run as an Rb87 fluorescence result. This slice needs no new worker job, result schema, or Math3D bridge.

### RbC-2 — Guided reading with source-qualified references

Add short, independently reviewed reading paths for atomic versus condensate degrees of freedom, lattice Hamiltonians, measurements versus inferred quantities, and open-system channels. Pin each note to chapter/section and file hash. Where an existing Lab result is linked, show its exact model, units, basis, and saved-run hash. A changed source or unavailable result withholds linked values. Validate the chapter II dated experiment discussion and provenance before surfacing it as factual guidance.

### RbC-3 — First new numerical model: finite Bose–Hubbard dimer

Only after RbC-1/2 review, implement a bounded two-site, fixed-particle-number Bose–Hubbard job under the Atlas `bose_hubbard` entry. Define hopping sign, on-site interaction, particle-number basis, energy units, boundary condition, and truncation in a versioned contract. Independently compare exact matrices/eigenpairs for small N; save source-qualified energies, occupations, number variance, and one-body coherence. Show finite-size crossover without claiming a thermodynamic phase transition. Add a quench only after static results, persistence, and restart pass.

### RbC-4 — Measurement and open-system extensions

Consider bosonic correlation/entanglement examples, parity versus number-resolved synthetic microscopy, and lattice dephasing/loss as separate bounded models. Specify the measured operators, detector imperfections, particle-number sectors, and jump channels before any visualization. Require independent numerical checks and explicit omissions for unrecorded observables. General BEC dynamics, experimental inference, and a Math3D scene bridge remain distinct future decisions.

## Release discipline

RbC-0 and RbC-1 are documentation/reader features. They add no installed QI-40 evidence and do not expand the current 2.0 claims. Each later compute slice must have its own contract, independent physics validation, saved-run integrity, restart test, and provenance review before Atlas binding or release advertising.
