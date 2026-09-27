# Quantum Hamiltonian Lab

An Electron 44 + React/TypeScript desktop laboratory with a supervised Python worker. QLAB-000–017 form the tested v0.1 source release: two-level dynamics, cavity QED, Lindblad open systems, parameter sweeps, source-linked Volume VIII presets, QuTiP/native comparison, and durable workspaces/runs.

## Run on Windows

Install Node.js 24 LTS and Python 3.12, then from this repository:

```powershell
npm ci
npm run setup:python
npm run build
npm start
```

`npm run desktop:shortcut` creates **Quantum Hamiltonian Lab** on your Windows Desktop. It launches the built app directly, without a terminal. Keep the repository in place; this is a development checkout, not a standalone installer. Rebuild after source changes. `npm run dev` builds and launches; it does not hot reload.

On Linux, create `.venv` with `python3.12 -m venv .venv`, then `.venv/bin/python -m pip install -c workers/quantum-python/requirements.lock -e workers/quantum-python`, followed by `npm ci`, `npm run build`, and `npm start`. Ubuntu 22.04 under WSL2/WSLg passed the v0.1 desktop acceptance suite; see [the release record](docs/RELEASE_V0.1.md) for the tested environment and caveats. `QLAB_PYTHON` may specify an alternate interpreter.

## First experiment

The startup example automatically computes the static Hamiltonian **H = (Δ σz + Ω σx)/2**, in normalized energy units with **ħ = 1**. Δ = 1 and Ω = 0.8 give **E± = ±0.640312423743…**. QuTiP builds the operator and computes its eigenenergies. The renderer compares them with the exact formula ±√(Δ² + Ω²)/2.

Edit Δ or Ω, then select **Run spectrum**. Existing results are marked **OUT OF DATE** until recalculated. Select QuTiP, Native, or Compare in the inspector; Compare runs both engines for the same Hamiltonian and reports the maximum eigenvalue difference and each runtime. The Hamiltonian tab shows the draft matrix; the spectrum always identifies the parameters actually used. Roadmap shows milestones, while Backend explains the methods and formats. **Restart worker** recovers a failed Python process.

## Rabi evolution

Open **Dynamics**, set detuning Δ, drive amplitude A, frequency ω, phase φ, end time, samples and |0⟩ or |1⟩, then select **Run evolution**. The Hamiltonian is **H(t) = Δ σz/2 + A cos(ωt + φ) σx/2**. Select QuTiP, Native, or Compare; the worker reports progress for either engine. **Cancel job** sets a worker-side cancellation flag; no completed data file is published after cancellation.

The result shows P₀(t), P₁(t), ⟨σx⟩, ⟨σy⟩ and ⟨σz⟩ alongside a Three.js Bloch sphere and trajectory. Drag the time cursor or click the plot to inspect one exact saved sample: the plot marker, Bloch vector, populations, complex state amplitudes and derived density matrix update together. The density matrix is ρ = |ψ⟩⟨ψ| for the pure states produced by the current Schrödinger solver. A zero-frequency, zero-detuning, unit-amplitude run provides the exact check P₁(t) = sin²(t/2). Changed inputs mark a completed plot **OUT OF DATE**.

Compare mode runs both engines on the same time grid. It reports the largest absolute difference among the five observables, maximum norm drift for each engine, minimum and final phase-independent state fidelity, and both runtimes. The plot and Bloch sphere show the QuTiP result in Compare mode. Native evolution uses SciPy DOP853 without renormalizing its output, so the norm-drift diagnostic is informative. These runtimes include result generation and are not controlled benchmark measurements.

## Model registry and Landau–Zener

The shared `packages/models` registry supplies model labels, parameter definitions, defaults, Hamiltonian descriptions, supported operations, observables, initial state, and optional Volume VIII provenance fields. React generates parameter controls from this metadata. Both engines use the same contract model IDs and parameter conventions.

Select **Landau–Zener** in the laboratory list to sweep H(t) = (vt + ε₀)σz/2 + gσx/2 from the default t = −10 to t = +10. Change sweep rate v, coupling gap g and bias ε₀, then run the evolution. A zero-gap reference must preserve the initial diabatic population. The result displays the finite-window final population beside the infinite-sweep asymptotic formula exp(−πg²/2|v|), labelled as a reference rather than an exact prediction for this run.

Select **Stückelberg** for a smooth double passage: ε(t) = v(t² − τ²)/(2τ) + ε₀, with H(t) = ε(t)σz/2 + gσx/2. At zero bias the two crossings occur at t = ±τ. The same QuTiP/Native/Compare controls and synchronized dynamics views apply; the result shows the crossing positions and return population. The model's interference comes from phase accumulated between passages. Tests cover zero coupling, normalization and cross-engine agreement.

Select **Floquet / strong drive** to compute the one-period propagator of the periodically driven two-level model. The result includes folded quasienergies, Floquet modes at t = 0, a 9×13 five-cycle transition-probability map, and a clearly marked weak-drive Bloch–Siegert estimate. Both engines are checked against each other; the map is a fixed preview, separate from general sweeps.

## Parameter sweeps

The **Sweeps** workspace varies one or two parameters of Rabi, Landau–Zener, Stückelberg, or strong-drive evolution and maps final P₁. Select QuTiP or native SciPy, a time window, axes and resolution (up to 10,000 cells), then run. A 1D curve or clickable 2D heatmap displays the result. Completed cells are cached by model, grid and engine version; cancel and rerun unchanged settings to resume. The result reports reused and newly computed cells. A sweep is a separate job, not the fixed Floquet preview map.

## Volume VIII presets

Open **Presets** for six source-pinned configurations from the inspected `theory` QuTiP examples: resonant Rabi, Landau–Zener, Jaynes–Cummings vacuum Rabi, T₁ relaxation, pure dephasing, and damped cavity occupation. A card loads the existing lab; review its values, choose QuTiP or native, and run. Five presets show a full-trajectory analytic error and a pass/fail threshold; Landau–Zener shows only the asymptotic reference because its run has finite endpoints. Source revision, basis/frame mappings, and exclusions are detailed in [docs/PRESETS.md](docs/PRESETS.md). Editing a loaded preset creates a variant and disables the exact-preset analytic check.

## Saved workspaces and runs

**Save workspace** records the selected tab, preset and all laboratory controls; **Restore** reopens that snapshot after edits or an app restart. Every completed calculation also creates a durable job/result/manifest record under Electron's application user-data directory, with a hash-verified copy of any binary data. Open **Runs** to inspect provenance and export a numerical CSV, an SVG figure, or a JSON manifest using a native save dialog. Stored artifacts are checked again before export. These are development-checkout files; back up the app's user-data directory if you need long-term archival.

## Cavity QED

Select **Jaynes–Cummings** for the excitation-conserving atom–cavity model, or **Quantum Rabi** for the full coupling including counter-rotating terms. Both labs show a sorted dressed spectrum, excited-qubit population, mean photon number, and a synchronized time cursor. The result also reports norm and parity drift plus the maximum occupation at the top Fock level; raise the cutoff if that boundary population grows. Choose QuTiP or native NumPy for either model.

The Jaynes–Cummings default is mapped to [the Volume VIII Commit 691 QuTiP adapter](https://github.com/expert10000/theory/blob/development/examples/python/qutip/adapters/jaynes_cummings.py): atom-first |g⟩=|0⟩, |e⟩=|1⟩, resonant g=0.35. The worker checks the reference's analytic vacuum-Rabi oscillation and dressed-doublet splitting. The reference uses a cavity-rotating frame, while this desktop displays lab-frame energies; the populations and splitting agree without an energy-offset adjustment. [The Commit 687 two-level example](https://github.com/expert10000/theory/blob/development/examples/python/qutip/labs/two_level_dynamics.py) now supplies explicit provenance for the Landau–Zener asymptotic formula. The linked tree has no direct Floquet, Stückelberg, or full quantum-Rabi implementation, so those remain independently implemented and tested here.

## Open system

The **Open system** tab solves a rotating-frame atom–cavity Lindblad master equation. Independent non-negative rates control qubit relaxation γ₁, pure dephasing γφ, and cavity loss κ; a coherent cavity drive makes the stationary state nontrivial. The density-matrix plot shows excited population, photon number, purity and qubit coherence. A separate steady-state solve is reported only when both relaxation and cavity loss are positive, avoiding an unsupported uniqueness claim for undamped sectors. The maximum top-Fock-level occupation diagnoses cutoff leakage. QuTiP and an independent NumPy/SciPy Liouvillian implementation are checked against analytic exponential decay limits from the Volume VIII [open two-level](https://github.com/expert10000/theory/blob/development/examples/python/qutip/labs/open_system_dynamics.py) and [damped cavity](https://github.com/expert10000/theory/blob/development/examples/python/qutip/adapters/bosonic.py) examples.

The local Chapter 58 file remains an architecture-only placeholder. The Landau–Zener entry now cites the separate Volume VIII Commit 687 QuTiP example for its asymptotic reference; the other chapter-only tags remain provisional. No external example code is imported into the worker at runtime.

## Architecture

```text
React renderer → narrow preload API → Electron main → JSON-RPC stdio → Python → QuTiP / Native
                                      validates jobs                 validates jobs/results
                                      validates results ← quantum-result/v1
```

Renderer: sandboxed, context isolated, no Node integration, no filesystem/process APIs, restrictive CSP. Electron checks the originating frame of each IPC call, denies permissions, navigation, and popups. Python is local, has no listening port, and reserves stdout for bounded protocol messages. The supervisor checks hello/capabilities/health, applies timeouts, reports crashes, and gracefully shuts down or terminates its child. Recovery is user initiated.

The shared draft-07 JSON Schemas for Python-bound jobs/results live in `packages/contracts/schemas`; AJV and Python jsonschema use the same files. The desktop also validates versioned workspace snapshots before saving/restoring. Unsupported operations and contract versions are rejected. The two-number smoke spectrum travels inline. Evolution samples use a separate little-endian Float64 artifact (`quantum-data/v1`, ten columns per row). Cavity samples use `quantum-cavity-data/v1` with six columns per row; Lindblad density-matrix observables use `quantum-lindblad-data/v1` with seven. Parameter grids use `quantum-sweep-data/v1` with row-major little-endian Float64 cells. JSON carries only the path, shape, SHA-256 hash, run metadata, and progress notifications. Electron verifies file hashes before passing bytes to React or exporting a run. Completed records live under Electron user data; automatic retention is not yet implemented.

The model contract has optional `sourceRepository`, `sourceModule`, `volume`, `chapter`, and `exampleId` fields so Layer-1 examples can be mapped later. No claim is made that the example IDs in test fixtures correspond to an imported book manifest.

## Verify

```powershell
npm run typecheck
npm test
npm run test:worker
npm run build
npm run test:desktop
```

The desktop test starts the actual Electron app and worker; it checks QuTiP/Native/Compare for spectrum and dynamics, the Backend tab, synchronized time selection, stale results, invalid input, degeneracy, restart, cancellation, renderer isolation and compact layout. Screenshots are saved to the ignored `artifacts/` directory. Python and TypeScript tests check analytic Rabi values, norms, phase-independent fidelity, binary integrity, density reconstruction, progress and cancellation, as well as the original spectrum and protocol.

## Roadmap and scope

The complete supplied plan is preserved in [docs/ROADMAP.md](docs/ROADMAP.md); decisions and validation status are in [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md).

This milestone implements a static two-level spectrum, driven two-level Rabi evolution, Landau–Zener and Stückelberg passages, strong-drive Floquet analysis, Jaynes–Cummings and Quantum Rabi cavity dynamics, Lindblad open-system dynamics, 1D/2D parameter sweeps, the dynamics/Bloch workspace, and QuTiP/native comparison. The separate `theory` development branch supplies explicit reference examples where mapped, but is not a runtime dependency. Atoms, molecules and crystals are outside initial V1 scope.

Run IDs, engine versions, timestamps and parameters are retained with each calculation. Standalone installers remain a later milestone; Windows and WSLg acceptance results are recorded in [the v0.1 release record](docs/RELEASE_V0.1.md). Optional Matplotlib is intentionally absent: React renders the plots; a QuTiP warning about Python plotting does not prevent calculation.
