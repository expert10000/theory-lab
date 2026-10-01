# Quantum Hamiltonian Lab

Additive Atlas reconciliation R1–R5 is implemented: all 68 executable
dispositions, C2–C8 scene compatibility, ranked model gaps and strict frozen
metadata. The nine existing tested bindings and all Lab features are retained;
no source runner is auto-enabled and no unbound solver is claimed implemented.
See [the R2–R5 review](docs/ATLAS_RECONCILIATION_R2_R5.md).

An Electron 44 + React/TypeScript desktop laboratory with a supervised Python worker. QLAB-000–017 form the tested v0.1 source release: two-level dynamics, cavity QED, Lindblad open systems, parameter sweeps, source-linked Volume VIII presets, QuTiP/native comparison, and durable workspaces/runs. QLAB-018–021 add optional Dynamiqs GPU evolution and sweeps plus a finite Ising-chain laboratory with optional QuSpin.

The [delivery roadmap](docs/ROADMAP.md) and
[post-QLAB plan/status map](docs/POST_QLAB_QVIS_M3D_ROADMAP.md) distinguish
implemented QVIS-001–013 from broader future physics and visualization work.
The supplied Math3D plan is preserved as a separate
track; it is not a claim that integration is already implemented.

**R1 Atlas reconciliation** pins 68 canonical definitions and maps all entries
to the existing Lab capabilities. Seven theory-side example references are
distinct from nine tested Lab bindings; reference/related entries never gain
Run actions from source flags. Both Atlas UIs show the coverage. See the
[complete reconciliation map](docs/ATLAS_RECONCILIATION_R1.md). R2–R5 reviews
and additive metadata freeze are implemented; no new physics or parallel
model/worker layer is introduced. See the
[acceptance record](docs/RELEASE_ATLAS_RECONCILIATION_V1.md).

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

## Portable scenes (QVIS-001–013)

Open **Scenes** or **Portable scenes** in the sidebar to preview saved Dynamics,
SSH or QWZ runs. Orbit the geometry, inspect Float64 samples, toggle objects and
export a verified `quantum-scene/v1` bundle to a new `.qscene` folder. Math3D is
unchanged; a separate importer comes later. See [the scene contract and usage](docs/QUANTUM_SCENE.md).
The web client's **Portable scenes** uses the same viewers for authenticated
saved runs and read-only local `.qscene` folder imports, including fields,
lattices, reciprocal guides, bands and supplied topology. Imports never upload
files or create runs and need no token. Desktop also exports/imports chunked
LOD bundles with lazy verification, cancellation and retained previews.
See the [bounded QVIS v0.1 release record](docs/RELEASE_QVIS_V0.1.md).

**Scenes → Bounded lattice examples** previews square, honeycomb and simple-cubic
open supercells with basis sites, nearest-neighbor bonds, cell outlines and
translation vectors. Inspect stable cell/basis identities and export verified
geometry bundles without creating worker runs. See
[lattice/reciprocal/band scope](docs/LATTICE_RECIPROCAL_BANDS.md).

**Geometry view → Primitive reciprocal zone** adds explicit dual bases, named
symmetry points/paths and square, hexagonal or cubic boundaries. For a saved SSH
or QWZ run, choose **Saved view → SSH / QWZ energy bands** for portable energy
paths/surfaces, shared sample selection and gap inspection. New QWZ calculations
include band arrays; older saved QWZ results require a re-run for this view.
The Roadmap tab marks QVIS-001–013 implemented; no Math3D files are changed.

## First experiment

The desktop Oscillator lab also includes **Damped / thermal** (D1-014–016):
a bounded finite-Fock Lindblad model with independent QuTiP/native evolution,
density-matrix diagnostics, cutoff inspection and verified saved runs. See
[the delivered scope](docs/D1_DAMPED_OSCILLATOR.md). It does not add web
oscillator computation, an Atlas preset or a Math3D connection.

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

The **Sweeps** workspace varies one or two parameters of Rabi, Landau–Zener, Stückelberg, or strong-drive evolution and maps final P₁. Select QuTiP, native SciPy, or available Dynamiqs GPU, a time window, axes and resolution (up to 10,000 cells), then run. A 1D curve or clickable 2D heatmap displays the result. Completed cells are cached by model, grid, engine version and GPU device; cancel and rerun unchanged settings to resume. The GPU scheduler solves up to 32 Hamiltonians per batch and checkpoints each batch. The result reports reused and newly computed cells. A sweep is a separate job, not the fixed Floquet preview map.

## Optional Dynamiqs GPU evolution and sweeps (QLAB-018–019)

On a Linux or WSL2 CUDA 12 setup with a compatible NVIDIA driver, install the optional stack *after* the base Python worker requirements:

```sh
.venv/bin/python -m pip install -r workers/quantum-python/requirements-dynamiqs-gpu.txt
```

Restart the worker. The **Backend** tab reports the actual JAX device; **Dynamics** and **Sweeps** enable Dynamiqs only if the pinned package imports and JAX sees a GPU. Evolution uses `sesolve` for the four two-level models and produces the verified ten-column artifact. Sweeps batch up to 32 Hamiltonians in one solve and retain the existing verified row-major data and resume cache. Cancellation is checked between GPU chunks/batches. Cavity QED, Lindblad, Dynamiqs Floquet analysis, and a Windows-native CUDA worker remain out of scope. The published Dynamiqs 0.3.6 wheel failed import in our Python 3.12/JAX 0.11.2 test; the optional file pins an inspected upstream commit that fixes that issue. The GPU path is an architectural adapter, not a speedup claim for a two-state problem.

## Optional QuSpin adapter (QLAB-020)

Install the optional Python dependency with `.venv/bin/python -m pip install -r workers/quantum-python/requirements-quspin.txt` on Linux (or the corresponding `.venv\Scripts\python.exe` on Windows), then restart the worker. The Backend tab reports QuSpin availability. The versioned `many_body` job solves an open or periodic spin-½ Ising chain of 2–8 sites with QuSpin or an independent dense NumPy reference. It returns up to the lowest eight energies, finite-size gap, ground-state site magnetizations, and half-chain von Neumann entropy. The full basis avoids assumptions about symmetry sectors; no thermodynamic-limit claim is made. QLAB-021 exposes the job in the interactive Many-body workspace.

## Optional scqubits adapter (QLAB-022)

Install `workers/quantum-python/requirements-scqubits.txt` into the worker's `.venv`, then restart. The versioned `circuit` job computes a bounded charge-basis Transmon spectrum with scqubits or an independent NumPy matrix. EJ and EC are entered as E/h in GHz; the result includes E₀₁, E₁₂, anharmonicity, |⟨0|n|1⟩|, and the change in E₀₁ when `ncut` increases by two. This is a cutoff diagnostic, not proof of convergence. QLAB-023 exposes these values in a Circuit tab with Native/scqubits/Compare modes, saved drafts, and durable run exports.

## Volume VIII presets

Open **Presets** for six source-pinned configurations from the inspected `theory` QuTiP examples: resonant Rabi, Landau–Zener, Jaynes–Cummings vacuum Rabi, T₁ relaxation, pure dephasing, and damped cavity occupation. A card loads the existing lab; review its values, choose QuTiP or native, and run. Five presets show a full-trajectory analytic error and a pass/fail threshold; Landau–Zener shows only the asymptotic reference because its run has finite endpoints. Source revision, basis/frame mappings, and exclusions are detailed in [docs/PRESETS.md](docs/PRESETS.md). Editing a loaded preset creates a variant and disables the exact-preset analytic check.

## Hydrogenic orbitals and sampled fields (QVIS-003–004)

Open **Orbitals** / **Atomic orbitals**, select 1s, 2s, 2p, 3s, 3p or 3d, and
**Compute orbital**. The existing native Python worker generates analytic
single-electron Coulomb fields in Bohr/Hartree units. Explore density, signed
real/imaginary lobes, phase, threshold surfaces and orthogonal slices. Radial
normalization and the unrenormalized finite-grid integral are shown separately.
Saved orbital runs replay in **Scenes** and export verified `.qscene` bundles,
CSV grids or radial SVGs. Math3D is unchanged and is not connected. Scientific
scope, conventions and tests are in [docs/FIELDS_ORBITALS.md](docs/FIELDS_ORBITALS.md).

**Scenes → Open scene bundle** reopens a trusted `.qscene` folder as a read-only,
hash-verified preview, including fields and lattice scenes. It does not change
the folder or create a saved physics run. See [docs/QUANTUM_SCENE.md](docs/QUANTUM_SCENE.md).

**Orbitals → Run convergence study** compares grid resolutions at fixed box
size, or box sizes at fixed spacing. Each case is saved; the table separates
integral changes from a radial sphere reference bracket. Radial node locations
are marked on the profile and its SVG export. No automatic convergence claim
or renormalization is applied.

## Saved workspaces and runs

**Save workspace** records the selected tab, preset and all laboratory controls; **Restore** reopens that snapshot after edits or an app restart. Every completed calculation also creates a durable job/result/manifest record under Electron's application user-data directory, with a hash-verified copy of any binary data. Open **Runs** to inspect provenance and export a numerical CSV, an SVG figure, or a JSON manifest using a native save dialog. Stored artifacts are checked again before export. These are development-checkout files; back up the app's user-data directory if you need long-term archival.

## Cavity QED

Select **Jaynes–Cummings** for the excitation-conserving atom–cavity model, or **Quantum Rabi** for the full coupling including counter-rotating terms. Both labs show a sorted dressed spectrum, excited-qubit population, mean photon number, and a synchronized time cursor. The result also reports norm and parity drift plus the maximum occupation at the top Fock level; raise the cutoff if that boundary population grows. Choose QuTiP or native NumPy for either model.

The Jaynes–Cummings default is mapped to [the Volume VIII Commit 691 QuTiP adapter](https://github.com/expert10000/theory/blob/development/examples/python/qutip/adapters/jaynes_cummings.py): atom-first |g⟩=|0⟩, |e⟩=|1⟩, resonant g=0.35. The worker checks the reference's analytic vacuum-Rabi oscillation and dressed-doublet splitting. The reference uses a cavity-rotating frame, while this desktop displays lab-frame energies; the populations and splitting agree without an energy-offset adjustment. [The Commit 687 two-level example](https://github.com/expert10000/theory/blob/development/examples/python/qutip/labs/two_level_dynamics.py) now supplies explicit provenance for the Landau–Zener asymptotic formula. The linked tree has no direct Floquet, Stückelberg, or full quantum-Rabi implementation, so those remain independently implemented and tested here.

## Open system

The **Open system** tab solves a rotating-frame atom–cavity Lindblad master equation. Independent non-negative rates control qubit relaxation γ₁, pure dephasing γφ, and cavity loss κ; a coherent cavity drive makes the stationary state nontrivial. The density-matrix plot shows excited population, photon number, purity and qubit coherence. A separate steady-state solve is reported only when both relaxation and cavity loss are positive, avoiding an unsupported uniqueness claim for undamped sectors. The maximum top-Fock-level occupation diagnoses cutoff leakage. QuTiP and an independent NumPy/SciPy Liouvillian implementation are checked against analytic exponential decay limits from the Volume VIII [open two-level](https://github.com/expert10000/theory/blob/development/examples/python/qutip/labs/open_system_dynamics.py) and [damped cavity](https://github.com/expert10000/theory/blob/development/examples/python/qutip/adapters/bosonic.py) examples.

The **Many-body** tab solves a bounded 2–8-spin Ising chain with open or periodic boundary conditions. It shows low-lying energies, the finite-size gap, ground-state site magnetizations and half-chain entanglement entropy. Native NumPy is always available; optional QuSpin can be selected or compared against Native when installed. Draft controls are included in workspace snapshots, while completed calculations join run history and CSV/SVG exports. This is a finite full-basis laboratory, not a claim about a thermodynamic phase transition.

## Opt-in SSH worker transport (QLAB-024)

Local supervised stdio remains the default. To use a remote Linux worker, install this repository and its Python environment on a trusted SSH host, ensure noninteractive key-based login and a verified `known_hosts` entry, then set `QLAB_REMOTE_SSH_TARGET` (a host alias or `user@host`) and `QLAB_REMOTE_ROOT` (absolute POSIX checkout path) before launching Electron. `QLAB_REMOTE_PYTHON` and `QLAB_REMOTE_ARTIFACTS` optionally override the Python executable and remote artifact directory. Restart the app after changing them. The Backend tab reports the selected transport.

Electron supervises `ssh -T` with `BatchMode=yes` and `StrictHostKeyChecking=yes`, carrying the same JSON-RPC stream. Completed binary artifacts are copied through SCP/SFTP into the local artifact directory and checked against the worker's byte count and SHA-256 before they reach React or durable run storage. No credentials are stored in the app. Remote artifacts remain on the SSH host for administrator-managed cleanup; this phase does not claim automatic remote garbage collection, a browser-accessible server, or a live remote-host acceptance run.

With a configured host, run `npm run accept:remote` from the local checkout. It checks the live handshake, native spectrum, separately copied evolution artifact, SHA-256 tamper rejection, cancellation, health and restart. It only removes its own temporary local files; the remote artifact directory still needs administrator-managed retention. This check is not run by CI because CI has no trusted SSH host.

On 2026-09-27 this passed against a key-only OpenSSH server bound to WSL loopback, with a separate Linux Python 3.12/QuTiP environment. The browser smoke also passed over that SSH route. This is a real SSH transport check on one computer, not acceptance of an external cloud host or long-running deployment.

## Authenticated web laboratory (QLAB-029)

The optional React web client uses an authenticated Node gateway in front of the same supervised worker and versioned contracts. It currently exposes the two-level spectrum and Rabi dynamics, with QuTiP or native computation, recent-run metadata and browser-side SHA-256 verification of evolution data. It does not replace the Electron desktop or expose all its laboratories.

From the repository root, set a fresh token and start the gateway:

```powershell
$env:QLAB_GATEWAY_TOKEN = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
npm run start:gateway
```

Open `http://127.0.0.1:8765` and paste the token. The browser retains it only in memory. For non-loopback binding, configure `QLAB_GATEWAY_TLS_KEY`, `QLAB_GATEWAY_TLS_CERT`, `QLAB_GATEWAY_HOST`, and the exact public `QLAB_GATEWAY_ORIGIN` (`https://...`); startup rejects non-loopback HTTP. Use a trusted private network and keep the token secret. `QLAB_GATEWAY_PORT` and `QLAB_GATEWAY_DATA_DIR` optionally change the port and run-storage path. The gateway accepts one calculation at a time and does not provide accounts, multi-user isolation, or a production deployment recipe. To route it to an SSH worker, use the existing `QLAB_REMOTE_*` environment variables.

`npm run test:web` builds the client and runs a real headless Chrome → gateway → Python → browser smoke test. It requires Google Chrome on the machine and saves a screenshot under ignored `artifacts/`.

Open **Worker & API** in the web client for live worker state, CPU/RAM, engine inventory, methods, endpoint descriptions and recent sanitized calls. The Electron **Backend** tab shows the active SSH target and its resolved worker paths, or states that local stdio is the default. Both views use the versioned `worker-resources/v1` snapshot; see [worker API and connection guide](docs/WORKER_API.md). No key material is sent to the renderer or browser.

The local Chapter 58 file remains an architecture-only placeholder. The Landau–Zener entry now cites the separate Volume VIII Commit 687 QuTiP example for its asymptotic reference; the other chapter-only tags remain provisional. No external example code is imported into the worker at runtime.

## Architecture

```text
React renderer → narrow preload API → Electron main → JSON-RPC stdio → Python → QuTiP / Native / optional Dynamiqs GPU / optional QuSpin
                                      validates jobs                 validates jobs/results
                                      validates results ← quantum-result/v1
React web client → authenticated HTTP(S) gateway ────────────────┘
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
