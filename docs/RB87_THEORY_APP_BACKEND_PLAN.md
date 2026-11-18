# Rb87 Companion: Theory app and backend delivery plan

Planning companion to the [feature roadmap](RB87_COMPANION_ROADMAP.md). The [supplied chapters](source-material/rb87-companion/README.md) are reference inputs. This plan assigns the next work to the current app architecture and defines a testable order; it does not claim the physics is implemented.

## Architecture already present

| Layer | Current route | Use for this feature |
| --- | --- | --- |
| Theory UI | `apps/desktop/renderer/TheoryPanel.tsx` renders the selected `WorkspaceModel`; `App.tsx` owns the Theory tab | Add a separate Companion library route and optional contextual chapter links without replacing the active model or run. |
| Navigation | `ModelNavigator.tsx`, the Library area, and Atlas navigation are separate | Place Companion beside existing library entries; keep `bose_hubbard` reference-only until a new job passes acceptance. |
| Desktop bridge | `packages/contracts/index.ts` `QuantumBridge`, `apps/desktop/preload/index.ts`, trusted `ipcMain` handlers | Expose only chapter IDs and structured status. Never accept a renderer file path or arbitrary URL. |
| Packaging | `scripts/build.mjs` builds the renderer; `electron-builder.config.cjs` lists packaged resources | Copy PDFs and a pinned metadata manifest to `extraResources`; system PDF viewers need real files outside `app.asar`. |
| Compute and saved runs | `packages/contracts` job/result schemas, `quantum_worker/main.py`, engine modules, main-process job handlers and run store | Add a new, bounded Bose–Hubbard operation later. Reuse the protocol and saved-run lifecycle, not the Ising or cavity physics. |

## Decision 1: read-only chapter library (RbC-1)

1. Add a curated chapter catalog with stable IDs `rb87-i`…`rb87-vii`, title, PDF filename, expected SHA-256 from the supplied manifest, and relationship labels. Generate or check the catalog against the unchanged source files during build.
2. Package the seven PDFs and manifest as desktop resources. In development resolve the same allowlisted source directory; in the installer resolve the packaged resource directory. Record the resolved catalog version in the UI, not a user-controlled path.
3. Add `listCompanionChapters()` and `openCompanionChapter(id)` to the typed preload bridge. Main validates the ID against the catalog, verifies the PDF hash before opening, and returns a structured `opened / missing / changed / viewer-error` status. Use Electron's system PDF open action on the verified file; do not navigate the renderer to a `file://` URL.
4. Add a Library **Rb87 Companion** route with seven chapter cards, short subject summaries, a PDF action, and source status. Preserve the selected Lab model, draft and run when opening and closing it. Show a model link only with an explicit relationship label: `related theory`, `analogy`, or `not implemented`.
5. Include a direct route from Lindblad Theory to Chapter VII and a reference-only route from the Atlas Bose–Hubbard entry to Chapters III–IV. The existing hydrogenic orbital route may link Chapter I only as a distinction between a one-electron orbital and an Rb87/BEC system.

**Acceptance:** source/packaged hash parity; all seven PDFs open from an unpacked app and the exact installer after restart; tampering or removing one PDF blocks that chapter without blocking the Lab; invalid IDs and arbitrary paths are rejected; keyboard focus returns to the invoking chapter card; current saved run and draft survive reader navigation. No Python worker, numerical schema, or QI-40 claim changes in this slice.

## Decision 2: reviewed reading paths (RbC-2)

1. Review chapter/section titles and PDF page locators by hand. Store a versioned section catalog with chapter hash and a short, authored synopsis; do not render raw TeX as trusted HTML.
2. Add guided routes for internal versus center-of-mass degrees of freedom (I), coherence versus time-of-flight inference (II), optical lattice versus electronic crystal (III–IV), measured versus inferred correlation (V–VI), and jump/dephasing/loss channels (VII).
3. A link to a saved Lab result records the result ID, result hash, model, basis, units, and chapter/section source hash. On reopen, check both sides. If either changed or is absent, show citation metadata and an omission instead of values.
4. Independently review dated experimental statements and bibliographic references, especially Chapter II, before using them in UI copy. The guide may quote only short, attributed excerpts and should otherwise paraphrase reviewed content.

**Acceptance:** section links restore after restart; a changed PDF invalidates its section link; a changed run withholds numerical values; a reader can see why a link is an analogy rather than a simulation. No derived physical values are calculated from the chapter text.

## Decision 3: bounded Bose–Hubbard compute path (RbC-3)

### Contract and engine first

- Add a versioned job/result contract for an unbiased, two-site, fixed-N Bose–Hubbard dimer. Proposed first bounds: `2 ≤ N ≤ 8`, `J = 1` energy unit, `0 ≤ U/J ≤ 20`, open dimer, and a stated basis `|n, N-n⟩`. Confirm bounds in scientific review before freezing the schema.
- State the Hamiltonian `H = -J(a†₁a₂ + a†₂a₁) + (U/2)∑ᵢ nᵢ(nᵢ-1)` and the exact matrix convention. Persist the requested inputs, basis order, engine, eigenvalue ordering, normalization, and tolerances.
- Implement independent small-N references (hand-checked N=2 matrix and a second numerical route, such as QuTiP) before exposing a Lab button. Check Hermiticity, number conservation, residuals, ground-state symmetry, and limiting cases `U=0` and large `U/J`.
- Save low eigenpairs or a separately hash-verified state sidecar only when needed for occupations, variance, and one-body coherence. A result without that state must omit those values rather than reconstructing them from energies.

### Desktop integration second

- Add a distinct capability/operation, trusted main-process job handler, cancellation/progress path, exact result validation, run persistence, Runs reopening, and report/export metadata. Do not reuse `many_body` merely because it is already a worker route.
- Add a model entry and Theory page with the fixed-N basis, unit convention and finite-size limit. The result view selects stored eigenstates and reports only stored or verified derived observables. Keep chapter III/IV references visibly separate from run evidence.
- Consider a quench in a separate slice after static eigenpairs, restart and cross-engine parity pass; do not call a finite dimer crossover a thermodynamic phase transition.

**Acceptance:** contract round trips; independent N=2/3 reference matrices and eigenpairs; native/second-route parity within specified tolerances; tamper refusal; saved-run reopen after restart; no Atlas executable binding until the complete path passes. Packaging must expose the operation only when its engine is available.

## Decision 4: measurement and open-system follow-ons (RbC-4)

Split synthetic parity/number readout, correlation and entanglement, and lattice dephasing/loss into separate jobs with declared Hilbert spaces and operators. A microscope image is a sampled measurement with a detector model, not a visualization of a wavefunction. Fluorescence, recoil heating, loss and continuous monitoring need explicit channels and approximation limits. Each new job repeats the contract → independent engine check → saved run → UI → installed acceptance sequence.

## Delivery checkpoints and scope

| Checkpoint | Reviewable result | Gate |
| --- | --- | --- |
| RbC-1A | Catalog, packaged assets, restricted IPC, chapter index | Seven PDFs and tamper/missing tests pass in dev and unpacked app. |
| RbC-1B | Installed reader and navigation | Exact installer opens PDFs after restart; active model/run is preserved. |
| RbC-2 | Section reading paths and source-qualified links | Editorial/source review plus restart/change tests. |
| RbC-3A | Frozen dimer contract and independent engine | Matrix, limits, and parity tests pass before UI claims. |
| RbC-3B | Saved dimer Study and Theory route | Verified state/observables reopen and tamper refusal pass. |
| RbC-4 | Separately specified measurement/open-system jobs | Per-model scientific and installed gates. |

Math3D 2.0 and the existing QI-40 installed pair keep their own gates. No RbC checkpoint is evidence that those gates passed.
