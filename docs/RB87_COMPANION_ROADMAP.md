# Rb87 Quantum Companion: Theory Lab integration roadmap

Status: source intake complete; bounded dimer core started on this feature branch. The separate dimer contract, worker solver, and independent checks exist; the desktop Lab, saved-run path, scene, and installed handoff remain planned. This is a feature track for Theory Lab. It does not change Math3D's 2.0 release gates or the QI-40 paired-app qualification.

The [Theory UI and backend delivery plan](RB87_THEORY_APP_BACKEND_PLAN.md) assigns each slice to the existing renderer, Electron main process, contracts, and Python worker.

## Source and current product boundary

The user-supplied [seven-chapter companion](source-material/rb87-companion/README.md) is stored as unchanged PDF and TeX files with its SHA-256 manifest. The manifest verifies file identity, not scientific correctness or external references. Before publishing chapter text in the app, review attribution, dated experimental claims, equations, units, and bibliography against the supplied PDFs and independent sources. Preserve chapter and section locators in any UI citation. The PDFs support the working system; they are not the product's only view.

Theory Lab already has a Theory tab, the 68-entry Hamiltonian Atlas, verified saved runs, scene export and Math3D handoff, hydrogenic single-electron orbitals, an Ising many-body lab, and Lindblad atom–cavity and damped-oscillator labs. That is substantial infrastructure, but it does not compute Rb87 condensates, Bose–Hubbard bosons, fluorescence microscopy, or their measurements. The Atlas classifies `bose_hubbard` as reference-only with no Lab binding ([reconciliation](ATLAS_RECONCILIATION_R2_R5.md)). The current `many_body` engine is Ising spin-½. QVIS open lattice fixtures show geometry; they are not an interacting Bose gas. Keep the canonical 68-entry Atlas unchanged; use its existing `bose_hubbard` entry and add an executable binding only after acceptance.

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

### RbC-1 — First working system: finite Bose–Hubbard dimer

Build one complete path from the existing Atlas `bose_hubbard` reference to a bounded two-site, fixed-particle-number job, saved result, Theory guide, and verified scene. Define the hopping sign, interaction, particle-number basis, energy units, boundary, and solver limits in a versioned contract. Independently compare small-N matrices/eigenpairs. Save energies, occupations, number variance and one-body coherence only with the state evidence needed to support them. Show finite-size crossover without claiming a thermodynamic phase transition. The first core commit uses separate `quantum-bose-hubbard-job/v1` and result schemas and a dedicated worker RPC; the frozen shared `quantum-job/v1`, `quantum-result/v1`, capabilities, and 68-entry Atlas remain unchanged.

The UI should let a reader choose N and U/J, run the job, inspect a selected eigenstate and its source-qualified values, save/reopen it, and open a two-site scene. Scene sites and bond are schematic; occupations or coherence use recorded values and explicit units. The scene must be derived from the verified result, export as `.qscene`, and reopen through the existing scene/Math3D path. Keep the Atlas entry reference-only until the whole route passes. Chapters III–IV supply linked theory, with the PDF available from the Study.

Acceptance: independent physics checks, worker capability gate, schema and run integrity, restart, tamper refusal, scene round trip, exact source hashes and units, and an unpacked then installed two-app handoff. See the [layer-by-layer plan](RB87_THEORY_APP_BACKEND_PLAN.md).

### RbC-2 — Companion library and guided theory

Add a **Rb87 Companion** library entry with a chapter index and hash-checked packaged PDFs. Link the dimer Theory page to Chapters III–IV; links to other current labs must say whether they are a related model, analogy, or unimplemented system. Add reviewed reading paths for atomic versus condensate degrees of freedom, lattice Hamiltonians, measurements versus inferred quantities, and open-system channels. Pin notes to chapter/section and file hash; changed sources withhold linked values. Review dated Chapter II claims and provenance before surfacing them as factual guidance.

### RbC-3 — Broaden the working lattice study

After the dimer's saved-state and scene path passes, add a separately bounded static chain or quench, then bosonic correlation/entanglement observables with explicit sector and operator conventions. A time-dependent scene must use recorded time samples, never interpolated or inferred states without a declared method. Each extension receives a new validation and restart gate.

### RbC-4 — Measurement and open-system extensions

Consider parity versus number-resolved synthetic microscopy and lattice dephasing/loss as separate bounded models. Specify measured operators, detector imperfections, particle-number sectors, and jump channels before visualization. Require independent numerical checks and explicit omissions for unrecorded observables. General BEC dynamics, experimental inference, and an Rb87 fluorescence model remain distinct future decisions.

## Release discipline

RbC-0 is source intake. RbC-1 is a new numerical feature and cannot be advertised before its independent physics, saved-run, scene, installed-app, and provenance gates pass. None of these steps supplies QI-40 evidence or expands the current Math3D 2.0 claims.
