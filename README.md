# Quantum Hamiltonian Lab

An Electron 44 + React/TypeScript desktop laboratory with a supervised Python worker. **QLAB-000–009** add QuTiP and native NumPy/SciPy engines, the two-level and driven laboratories, a synchronized Bloch workspace, and numerical comparison.

## Run on Windows

Install Node.js 24 LTS and Python 3.12, then from this repository:

```powershell
npm ci
npm run setup:python
npm run build
npm start
```

`npm run desktop:shortcut` creates **Quantum Hamiltonian Lab** on your Windows Desktop. It launches the built app directly, without a terminal. Keep the repository in place; this is a development checkout, not a standalone installer. Rebuild after source changes. `npm run dev` builds and launches; it does not hot reload.

On Linux, create `.venv` with `python3 -m venv .venv`, then `.venv/bin/python -m pip install -c workers/quantum-python/requirements.lock -e workers/quantum-python`, followed by `npm ci`, `npm run build`, and `npm start`. Linux support is not yet verified. `QLAB_PYTHON` may specify an alternate interpreter.

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

Select **Floquet / strong drive** to compute the one-period propagator of the periodically driven two-level model. The result includes folded quasienergies, Floquet modes at t = 0, a 9×13 five-cycle transition-probability map, and a clearly marked weak-drive Bloch–Siegert estimate. Both engines are checked against each other; the map is a fixed preview, while general sweeps are planned for QLAB-014.

## Cavity QED

Select **Jaynes–Cummings** for the excitation-conserving atom–cavity model, or **Quantum Rabi** for the full coupling including counter-rotating terms. Both labs show a sorted dressed spectrum, excited-qubit population, mean photon number, and a synchronized time cursor. The result also reports norm and parity drift plus the maximum occupation at the top Fock level; raise the cutoff if that boundary population grows. Choose QuTiP or native NumPy for either model.

The Jaynes–Cummings default is mapped to [the Volume VIII Commit 691 QuTiP adapter](https://github.com/expert10000/theory/blob/development/examples/python/qutip/adapters/jaynes_cummings.py): atom-first |g⟩=|0⟩, |e⟩=|1⟩, resonant g=0.35. The worker checks the reference's analytic vacuum-Rabi oscillation and dressed-doublet splitting. The reference uses a cavity-rotating frame, while this desktop displays lab-frame energies; the populations and splitting agree without an energy-offset adjustment. [The Commit 687 two-level example](https://github.com/expert10000/theory/blob/development/examples/python/qutip/labs/two_level_dynamics.py) now supplies explicit provenance for the Landau–Zener asymptotic formula. The linked tree has no direct Floquet, Stückelberg, or full quantum-Rabi implementation, so those remain independently implemented and tested here.

The local Chapter 58 file remains an architecture-only placeholder. The Landau–Zener entry now cites the separate Volume VIII Commit 687 QuTiP example for its asymptotic reference; the other chapter-only tags remain provisional. No external example code is imported into the worker at runtime.

## Architecture

```text
React renderer → narrow preload API → Electron main → JSON-RPC stdio → Python → QuTiP / Native
                                      validates jobs                 validates jobs/results
                                      validates results ← quantum-result/v1
```

Renderer: sandboxed, context isolated, no Node integration, no filesystem/process APIs, restrictive CSP. Electron checks the originating frame of each IPC call, denies permissions, navigation, and popups. Python is local, has no listening port, and reserves stdout for bounded protocol messages. The supervisor checks hello/capabilities/health, applies timeouts, reports crashes, and gracefully shuts down or terminates its child. Recovery is user initiated.

The shared draft-07 JSON Schemas live in `packages/contracts/schemas`. AJV and Python jsonschema use the same files. Unsupported operations and contract versions are rejected. The two-number smoke spectrum travels inline. Evolution samples use a separate little-endian Float64 artifact (`quantum-data/v1`, ten columns per row). Cavity samples use `quantum-cavity-data/v1` with six columns per row. JSON carries only the path, shape, SHA-256 hash, run metadata, and progress notifications. Electron verifies the file hash before passing bytes to the renderer. Files are currently retained under Electron's user-data `artifacts` directory; retention and run manifests arrive with QLAB-016.

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

This milestone implements a static two-level spectrum, driven two-level Rabi evolution, Landau–Zener and Stückelberg passages, strong-drive Floquet analysis, Jaynes–Cummings and Quantum Rabi cavity dynamics, the dynamics/Bloch workspace, and QuTiP/native comparison. Lindblad dynamics and general sweeps remain subsequent V1 work. The separate `theory` development branch supplies explicit reference examples where mapped, but is not a runtime dependency. Atoms, molecules and crystals are outside initial V1 scope.

Run IDs, engine versions, timestamps and parameters are returned for each calculation; run history is currently session-only. Durable provenance/workspaces/exports, installers, and Linux release acceptance remain later milestones. Optional Matplotlib is intentionally absent: React renders both plots; a QuTiP warning about Python plotting does not prevent calculation.
