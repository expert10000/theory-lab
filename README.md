# Quantum Hamiltonian Lab

An Electron 44 + React/TypeScript desktop laboratory with a supervised Python/QuTiP worker. **QLAB-000–005** cover the roadmap, secure workspace, versioned contracts, worker lifecycle, two-level spectrum, and driven Rabi evolution with progress, cancellation, and binary results.

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

Edit Δ or Ω, then select **Run spectrum**. Existing results are marked **OUT OF DATE** until recalculated. The Hamiltonian tab shows the draft matrix; the spectrum always identifies the parameters actually used. The Roadmap tab shows the delivery milestones. **Restart worker** recovers a failed Python process.

## Rabi evolution

Open **Dynamics**, set detuning Δ, drive amplitude A, frequency ω, phase φ, end time, samples and |0⟩ or |1⟩, then select **Run evolution**. The Hamiltonian is **H(t) = Δ σz/2 + A cos(ωt + φ) σx/2**. The worker steps QuTiP's Schrödinger solver and reports progress after sample batches. **Cancel job** sets a worker-side cancellation flag; no completed data file is published after cancellation.

The result shows P₀(t), P₁(t), ⟨σx⟩, ⟨σy⟩ and ⟨σz⟩. It also stores the complex state amplitudes for the later Bloch/time-cursor workspace. A zero-frequency, zero-detuning, unit-amplitude run provides the exact check P₁(t) = sin²(t/2). Changed inputs mark a completed plot **OUT OF DATE**.

## Architecture

```text
React renderer → narrow preload API → Electron main → JSON-RPC stdio → Python → QuTiP
                                      validates jobs                 validates jobs/results
                                      validates results ← quantum-result/v1
```

Renderer: sandboxed, context isolated, no Node integration, no filesystem/process APIs, restrictive CSP. Electron checks the originating frame of each IPC call, denies permissions, navigation, and popups. Python is local, has no listening port, and reserves stdout for bounded protocol messages. The supervisor checks hello/capabilities/health, applies timeouts, reports crashes, and gracefully shuts down or terminates its child. Recovery is user initiated.

The shared draft-07 JSON Schemas live in `packages/contracts/schemas`. AJV and Python jsonschema use the same files. Unsupported operations and contract versions are rejected. The two-number smoke spectrum travels inline. Evolution samples use a separate little-endian Float64 artifact (`quantum-data/v1`, ten columns per row). JSON carries only the path, shape, SHA-256 hash, run metadata, and progress notifications. Electron verifies the file hash before passing bytes to the renderer. Files are currently retained under Electron's user-data `artifacts` directory; retention and run manifests arrive with QLAB-016.

The model contract has optional `sourceRepository`, `sourceModule`, `volume`, `chapter`, and `exampleId` fields so Layer-1 examples can be mapped later. No claim is made that the example IDs in test fixtures correspond to an imported book manifest.

## Verify

```powershell
npm run typecheck
npm test
npm run test:worker
npm run build
npm run test:desktop
```

The desktop test starts the actual Electron app and worker; it checks both calculations, stale results, invalid input, degeneracy, restart, cancellation, tabs, renderer isolation and compact layout. Screenshots are saved to the ignored `artifacts/` directory. Python and TypeScript tests check analytic Rabi values, norm, binary integrity, progress and cancellation, as well as the original spectrum and protocol.

## Roadmap and scope

The complete supplied plan is preserved in [docs/ROADMAP.md](docs/ROADMAP.md); decisions and validation status are in [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md).

This milestone implements a static two-level spectrum and a driven two-level Rabi preview. The full Dynamics/Bloch workspace, model registry, Landau–Zener, Stückelberg, strong drive, Floquet, Jaynes–Cummings, Quantum Rabi, Lindblad dynamics, sweeps and QuTiP/native comparison remain subsequent V1 work. Layer-1 source examples were not present in this repository and have not been imported. Atoms, molecules and crystals are outside initial V1 scope.

Run IDs, engine versions, timestamps and parameters are returned for each calculation; run history is currently session-only. Durable provenance/workspaces/exports, installers, and Linux release acceptance remain later milestones. Optional Matplotlib is intentionally absent: React renders both plots; a QuTiP warning about Python plotting does not prevent calculation.
