# Rb87 Companion: Theory app and backend delivery plan

Planning companion to the [feature roadmap](RB87_COMPANION_ROADMAP.md). The [supplied chapters](source-material/rb87-companion/README.md) are reference inputs. This plan assigns the next work to the current app architecture and defines a testable order; it does not claim the physics is implemented.

## Architecture already present

| Layer | Current route | Use for this feature |
| --- | --- | --- |
| Theory UI | `apps/desktop/renderer/TheoryPanel.tsx` renders the selected `WorkspaceModel`; `App.tsx` owns the Theory tab | Add the working Bose–Hubbard model, Theory guide, result view, and Companion references while preserving active runs. |
| Navigation | `ModelNavigator.tsx`, the Library area, and Atlas navigation are separate | Use the existing `bose_hubbard` Atlas entry; enable its Lab binding only after the full compute, persistence, and scene path passes. |
| Desktop bridge | `packages/contracts/index.ts` `QuantumBridge`, `apps/desktop/preload/index.ts`, trusted `ipcMain` handlers | Add a dedicated typed Bose–Hubbard bridge and saved-run store, then allowlisted chapter actions; never accept an arbitrary renderer file path or URL. |
| Packaging | `scripts/build.mjs` builds the renderer; `electron-builder.config.cjs` lists packaged resources | Copy PDFs and a pinned metadata manifest to `extraResources`; system PDF viewers need real files outside `app.asar`. |
| Compute and saved runs | `packages/contracts` job/result schemas, `quantum_worker/main.py`, engine modules, main-process job handlers and run store | Use the separate `quantum-bose-hubbard-*` contracts and `quantum.boseHubbard` worker RPC. Extend the saved-run lifecycle with its own verified record type; keep frozen v1 schemas and Ising/cavity physics unchanged. |

## Decision 1: one executable Atlas → Lab → saved run → scene path (RbC-1)

The first product milestone is a working finite Bose–Hubbard dimer, not a PDF reader. Its separate worker RPC and experimental Atlas pane compute and save verified finite results; a separate scene adapter now exposes selected eigenstates through Scenes. The current shared `many_body` job remains an Ising spin chain. The canonical 68 Atlas definitions stay fixed; `bose_hubbard` remains reference-only until the full path passes.

### RbC-1A — Contract and independent physics engine

- Add a versioned job/result contract for an unbiased, two-site, fixed-N Bose–Hubbard dimer. Proposed first bounds: `2 ≤ N ≤ 8`, `J = 1` energy unit, `0 ≤ U/J ≤ 20`, open dimer, and basis `|n, N-n⟩`; confirm bounds during scientific review before freezing the schema.
- State `H = -J(a†₁a₂ + a†₂a₁) + (U/2)∑ᵢ nᵢ(nᵢ-1)` and exact matrix/basis order. Persist inputs, engine, eigenvalue order, normalization, units, tolerances, and source hashes.
- Use the separate `packages/contracts/bose-hubbard.ts` job/result schemas and `quantum.boseHubbard` worker method. The frozen shared worker capabilities schema cannot advertise a new operation; the desktop bridge will gate this method on the native engine and its own versioned contract. Do not relabel or reuse Ising `many_body` results.
- Check a hand-derived N=2 matrix, independent N=2/3 eigenpairs, Hermiticity, particle-number conservation, residuals, ground-state symmetry, and `U=0`/large-`U/J` limits. Use a genuinely separate numerical implementation for parity where available.
- Store low eigenpairs or a verified state sidecar if occupation, number variance, and one-body coherence are shown. Missing state data means those values are omitted.

### RbC-1B — Working Theory and result UI

- Use the existing Atlas `bose_hubbard` entry to navigate to a new dimer Lab form once the engine is ready. Expose N and U/J, a bounded Run action, progress/cancel, and explicit engine availability.
- Add a model-specific Theory page with the fixed-N basis, units, finite-size limit, and a Chapter III/IV reference. The selected eigenstate inspector shows only saved or verified derived values; draft edits never rewrite a saved run.
- Add trusted main-process handling, exact result validation, a separately versioned saved-run record, Runs reopening, report/export metadata, and restart/tamper refusal. Promote the Atlas entry to an executable binding only when the path is qualified.

### RbC-1C — Verified scene and handoff

- Use a separate `packages/quantum-scene/bose-hubbard.ts` adapter gated on a verified saved result, since this result has its own contract. Draw two schematic sites and a hopping bond; encode site occupation and variance as datasets and one-body coherence as a labelled annotation. Never imply atom positions or a measured microscope image.
- Carry basis, energy and site units, selected eigenstate index, result hash, and source run into the scene. Reuse Scenes, `.qscene` export, sample selection, and Math3D handoff without changing their contracts silently.
- Local scene round trip, restart, tampered result refusal, and unit-label tests pass. Qualify an unpacked then installed two-app handoff before accepting this checkpoint. The scene is a view of recorded dimer data, not a new solver.

**RbC-1 acceptance:** a user can start from Atlas, run the dimer, inspect an eigenstate, save/reopen its exact values, open its scene, and return to the run. Independent physics and end-to-end installed checks pass before advertising an Rb87-related working system. This bounded dimer is not yet a condensate, gas microscope, or full Rb87 atom model.

## Decision 2: chapter library supports the system (RbC-2)

1. Add a curated chapter catalog with stable IDs `rb87-i`…`rb87-vii`, title, PDF filename, and expected SHA-256. Check it against the unchanged source files during build.
2. The seven PDFs and manifest are configured as desktop resources outside `app.asar`. Development and installer paths are fixed by main. `listCompanionChapters()` and `openCompanionChapter(id)` use a typed preload bridge; main verifies the exact hash before opening the system PDF viewer. Build-time catalog/source verification and local missing/changed-source tests pass. Installed qualification remains pending.
3. The dimer guide and seven-chapter index are available in Atlas, with Chapters III–IV linked by section. Next, put the Companion index beside existing Library entries and add links to other labs labelled `related theory`, `analogy`, or `not implemented`. Preserve the active model, draft, run, and scene when opening and closing the reader.

**Acceptance:** seven PDFs open after packaging and restart; changed/missing assets are withheld; invalid IDs and paths are rejected; keyboard focus returns to the invoking card. The reader adds no new worker operation or scientific claim.

## Decision 3: reviewed reading paths and broader working models (RbC-3)

Review section/page locators and add source-qualified notes for atomic versus condensate degrees of freedom (I), coherence and time of flight (II), lattice many-body physics (III–IV), measurement and correlation limits (V–VI), and open-system channels (VII). Links to saved results retain chapter and result hashes, model, basis, units, and omissions; changed sources withhold current values. Review dated Chapter II statements before UI publication.

After the dimer, specify a bounded chain or quench as a separate contract and job. Add time scenes only from recorded states. Bosonic correlation or entanglement views require explicit operators and saved state evidence. Neither Ising entropy nor the static dimer supplies a gas-microscopy observation.

## Decision 4: measurement and open-system follow-ons (RbC-4)

Split synthetic parity/number readout, correlation and entanglement, and lattice dephasing/loss into separate jobs with declared Hilbert spaces and operators. A microscope image is a sampled measurement with a detector model, not a visualization of a wavefunction. Fluorescence, recoil heating, loss and continuous monitoring need explicit channels and approximation limits. Each new job repeats the contract → independent engine check → saved run → UI → installed acceptance sequence.

## Delivery checkpoints and scope

| Checkpoint | Reviewable result | Gate |
| --- | --- | --- |
| RbC-1A | Separate dimer contract, worker RPC, independent engine (core implemented) | Matrix, limits, parity, and schema tests pass; desktop capability gate and UI remain RbC-1B. |
| RbC-1B | Experimental Atlas pane and exact saved runs implemented; dedicated Theory page and main Runs route pending | Desktop smoke reopens after restart and withholds changed values; complete navigation and theory gate before promotion. |
| RbC-1C | Result-backed dimer scene and Math3D handoff | Hash/units, selection, round trip, and installed two-app checks. |
| RbC-2 | Packaged PDFs, restricted IPC, contextual theory links | Seven chapters open after restart; missing/changed source refused. |
| RbC-3 | Reviewed reading paths and separately bounded chain/quench | Editorial review plus per-model physics, saved-run, and scene gates. |
| RbC-4 | Separately specified measurement/open-system jobs | Per-model scientific and installed gates. |

Math3D 2.0 and the existing QI-40 installed pair keep their own gates. No RbC checkpoint is evidence that those gates passed.
