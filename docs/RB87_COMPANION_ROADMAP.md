# Rb87 Quantum Companion: Theory Lab integration roadmap

Status: source intake, bounded dimer core, saved-run UI, two-site scene, an in-app Rb87 Companion Library page, and a dedicated dimer Theory view are complete on this feature branch. The Theory view explains the finite Hamiltonian, basis, units, saved observables, and limits; it rechecks an exact saved run before displaying eigenstate values. Library, Atlas, and Runs link to it. Its guide links Chapters III–IV as checked sources and offers the seven-chapter index. The Atlas pane first shows a model brief with formula, basis, parameters, assumptions, observables, and capability status; opening its details exposes the finite dimer controls and source guide. The main Runs view lists verified dimer runs under their separate contract, rechecks a selected result before showing values, and routes the exact run to Atlas, Theory, or Scenes. Scenes exports `.qscene` and offers Math3D launch. Atlas formulas render as MathML. Local restart, source-hash, unit, scene round-trip, reader, Theory-route, and tamper-refusal tests pass. The [installed Lab acceptance](RB87_INSTALL_QUALIFICATION.md) covers the Companion Library page, checked PDF reader, and a real launch to the local Math3D checkout; a two-installed-app check remains for Math3D's final release work. This feature track does not change Math3D's 2.0 release gates or QI-40 qualification.

The [Theory UI and backend delivery plan](RB87_THEORY_APP_BACKEND_PLAN.md) assigns each slice to the existing renderer, Electron main process, contracts, and Python worker.

## Source and current product boundary

The user-supplied [seven-chapter companion](source-material/rb87-companion/README.md) is stored as unchanged PDF and TeX files with its SHA-256 manifest. The manifest verifies file identity, not scientific correctness or external references. Before publishing chapter text in the app, review attribution, dated experimental claims, equations, units, and bibliography against the supplied PDFs and independent sources. Preserve chapter and section locators in any UI citation. The PDFs support the working system; they are not the product's only view.

Theory Lab already has a Theory tab, the 68-entry Hamiltonian Atlas, verified saved runs, scene export and Math3D handoff, hydrogenic single-electron orbitals, an Ising many-body lab, Lindblad atom–cavity and damped-oscillator labs, and an experimental finite Bose–Hubbard dimer. It does not compute Rb87 condensates, extended Bose–Hubbard chains, fluorescence microscopy, or their measurements. The Atlas classifies `bose_hubbard` as reference-only with no formal Lab binding ([reconciliation](ATLAS_RECONCILIATION_R2_R5.md)). The shared `many_body` engine is Ising spin-½. QVIS open lattice fixtures show geometry; they are not an interacting Bose gas. Keep the canonical 68-entry Atlas unchanged; add an executable binding only after acceptance.

| Chapters | Possible existing anchor | Gap that must remain explicit |
| --- | --- | --- |
| I–II: atomic structure, BEC, interference, time of flight | Hydrogenic orbital Theory; complex-field scene vocabulary | Hydrogenic is one electron, not an Rb87 atom or condensate; no trap, interacting BEC, or time-of-flight solver. |
| III–IV: optical lattice, Bose–Hubbard, quenches | Atlas `bose_hubbard` reference; experimental finite-N dimer and schematic QVIS scene | The two-site dimer is not a bosonic chain, quench, condensate, or measured Rb87 system. Ising sites cannot stand in for bosons. |
| V–VI: correlations, entanglement, microscopy | Ising half-chain entropy and separately verified state artifact | No bosonic one-body density matrix, particle-number-resolved images, parity detector, or measurement likelihood. |
| VII: dephasing, loss, trajectories, fluorescence | Lindblad and damped-oscillator Theory and verified run patterns | Existing jump operators and Hilbert spaces differ from Rb87 lattice fluorescence and atom loss. No experimental readout model. |

## Build order

### RbC-0 — Preserve and index the source (done in this branch)

- Retain the PDFs, TeX, and supplied hash manifest without editing them.
- Record file identity, page counts, chapter subjects, and the coverage map here.
- Treat chapter prose and equations as reference material until editorial and scientific review; do not derive new model claims from the archive alone.

### RbC-1 — First working system: finite Bose–Hubbard dimer

Build one complete path from the existing Atlas `bose_hubbard` reference to a bounded two-site, fixed-particle-number job, saved result, Theory guide, and verified scene. Define the hopping sign, interaction, particle-number basis, energy units, boundary, and solver limits in a versioned contract. Independently compare small-N matrices/eigenpairs. Save energies, occupations, number variance and one-body coherence only with the state evidence needed to support them. Show finite-size crossover without claiming a thermodynamic phase transition. The first core commit uses separate `quantum-bose-hubbard-job/v1` and result schemas and a dedicated worker RPC; the frozen shared `quantum-job/v1`, `quantum-result/v1`, capabilities, and 68-entry Atlas remain unchanged.

The experimental Atlas pane lets a reader choose N and U/J, run the job, inspect a selected eigenstate and its units, and save/reopen the exact result. Every selected Atlas entry first presents a model brief before details or executable controls appear. The main Runs view lists the dimer's separate verified records and opens the exact saved result. The dedicated Theory view opens from Library, Atlas, or Runs, and verifies a saved result before displaying its values; its route and workspace selection survive restart. The selected eigenstate opens in Scenes; its two sites and bond are schematic, and occupations, variance, coherence, energy, basis and units come from the verified result. The separate adapter preserves the frozen shared result contract. Scenes can export a `.qscene` and launch Math3D after rechecking the saved source. The dimer guide covers the finite matrix and interpretation limits, with Chapter III–IV source links and a seven-chapter index. The installed Lab PDF reader and installed Lab to Math3D checkout handoff passed; a two-installed-app check remains. Keep the Atlas entry reference-only until the whole route passes.

Acceptance: independent physics checks, worker capability gate, schema and run integrity, restart, tamper refusal, scene round trip, exact source hashes and units, and an unpacked then installed two-app handoff. See the [layer-by-layer plan](RB87_THEORY_APP_BACKEND_PLAN.md).

### RbC-2 — Companion library and guided theory

The **Rb87 Companion** entry is in the Library navigation. It presents the working two-site dimer, [reviewed Chapter I](RB87_CHAPTER_I_REVIEW.md) and [Chapter II](RB87_CHAPTER_II_REVIEW.md) reading paths, a [reviewed Chapters III–IV lattice-to-dimer path](RB87_CHAPTER_III_IV_REVIEW.md), and routes to Atlas controls and saved Runs. Chapter I distinguishes the many-electron atom, whole-atom motional modes, and condensate occupation; its orbital-lab link is labeled `related theory`. A source-gated schematic distinguishes an atom's internal electron cloud from a shared whole-atom motional mode. Chapter II separates recorded fringes and images from inferred phase, momentum spread, column density, and equivalent expansion temperature; its dated case study was checked against the November 2026 publication. Source-gated visuals distinguish recorded imaging pixels from inferred optical depth and illustrate a time-of-flight width sequence with the ballistic model assumptions shown at the inference boundary. The dimer section shows an interactive exact N=2 energy curve in units of J, separate from Rb87 electronic energies. The reading paths are withheld if their pinned PDFs fail the source check. The guide also includes a seven-chapter index. The PDFs are configured as desktop resources; installed open/restart and changed-source refusal passed in the isolated Lab candidate before these reading-path UI additions. Next, add reviewed paths for measurement and correlation limits and open-system channels. Link other current labs only with labels such as `related theory`, `analogy`, or `not implemented`. Pin notes to chapter/section and file hash; changed sources withhold linked values.

The Library energy visual can also open a saved dimer run. Its level list highlights the selected exact eigenenergy and shows site occupations, number variances, and one-body coherence from the verified saved result. Every state change reloads the run through the host's hash and scientific-consistency checks; failed verification clears the displayed values. The analytic N=2 curve remains an independent model preview.

### RbC-3 — Broaden the working lattice study

After the dimer's saved-state and scene path passes, add a separately bounded static chain or quench, then bosonic correlation/entanglement observables with explicit sector and operator conventions. A time-dependent scene must use recorded time samples, never interpolated or inferred states without a declared method. Each extension receives a new validation and restart gate.

### RbC-4 — Measurement and open-system extensions

Consider parity versus number-resolved synthetic microscopy and lattice dephasing/loss as separate bounded models. Specify measured operators, detector imperfections, particle-number sectors, and jump channels before visualization. Require independent numerical checks and explicit omissions for unrecorded observables. General BEC dynamics, experimental inference, and an Rb87 fluorescence model remain distinct future decisions.

## Release discipline

RbC-0 is source intake. RbC-1 is a new numerical feature and cannot be advertised before its independent physics, saved-run, scene, installed-app, and provenance gates pass. None of these steps supplies QI-40 evidence or expands the current Math3D 2.0 claims.
