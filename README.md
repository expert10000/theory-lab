# Quantum Hamiltonian Lab

An Electron 44 + React/TypeScript desktop laboratory with a supervised Python/QuTiP worker. This first implementation completes **QLAB-000–004**: roadmap, secure workspace, versioned contracts, worker lifecycle, and a real two-level eigenspectrum.

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

## Architecture

```text
React renderer → narrow preload API → Electron main → JSON-RPC stdio → Python → QuTiP
                                      validates jobs                 validates jobs/results
                                      validates results ← quantum-result/v1
```

Renderer: sandboxed, context isolated, no Node integration, no filesystem/process APIs, restrictive CSP. Electron checks the originating frame of each IPC call, denies permissions, navigation, and popups. Python is local, has no listening port, and reserves stdout for bounded protocol messages. The supervisor checks hello/capabilities/health, applies timeouts, reports crashes, and gracefully shuts down or terminates its child. Recovery is user initiated.

The shared draft-07 JSON Schemas live in `packages/contracts/schemas`. AJV and Python jsonschema use the same files. Unsupported operations and contract versions are rejected. The two-number smoke spectrum travels inline. Large arrays will require the roadmap's binary artifact channel.

## Verify

```powershell
npm run typecheck
npm test
npm run test:worker
npm run build
npm run test:desktop
```

The desktop test starts the actual Electron app and worker; it checks the numerical path, stale results, invalid input, degeneracy, restart, tabs, renderer isolation and compact layout. Screenshots are saved to the ignored `artifacts/` directory. Python tests check the analytic answer, zero/negative/tiny/large parameters, contracts, JSON-RPC errors, and clean shutdown.

## Roadmap and scope

The complete supplied plan is preserved in [docs/ROADMAP.md](docs/ROADMAP.md); decisions and validation status are in [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md).

This milestone implements only the static two-level spectrum. Rabi dynamics, Landau–Zener, Stückelberg, strong drive, Floquet, Jaynes–Cummings, Quantum Rabi, Lindblad dynamics, sweeps and QuTiP/native comparison are subsequent V1 work. Layer-1 source examples were not present in this empty repository and have not been imported. Atoms, molecules and crystals are outside initial V1 scope.

Run IDs, engine versions, timestamps and parameters are returned for each calculation; run history is currently session-only. Durable provenance/workspaces/exports, binary data transfer, long-job progress/cancellation, installers, and Linux release acceptance remain later milestones. Optional Matplotlib is intentionally absent: React renders the spectrum; a QuTiP warning about Python plotting does not prevent calculation.
