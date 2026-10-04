# Quantum Hamiltonian Lab

## Current status and post-QLAB development

The architectural sections below preserve the original design. Current delivery
status and the supplied post-QLAB plan are reconciled in
[POST_QLAB_QVIS_M3D_ROADMAP.md](POST_QLAB_QVIS_M3D_ROADMAP.md), including the full
planning reference, implemented/partial/planned coverage and separate Math3D track.

QLAB-000–029 and QVIS-001–013 are implemented at their documented bounded scope.
Optional-engine support does not mean those engines are installed. QVIS-006 is
bundle import and QVIS-007 is orbital convergence; they must not be confused
with the newly supplied plan's broader reciprocal-space/band milestones.
Historical IDs are retained; no new QLAB numbers are planned.
The `QLAB-UI-1–8` labels are a separate interaction track, not renumbered
QLAB delivery commits. UI-4–5 are implemented for their declared two-level
adapters; UI-1–3 cover currently reachable desktop labs, and UI-6 covers
all current saved-result operations. UI-7 is implemented with all-operation
rerun acceptance and portable verified `.qrun` import/export. UI-8 is implemented
for compatible saved scenes with exact source hashes and bounded sample linking. See the
[linked workspace roadmap](QLAB_LINKED_WORKSPACE_ROADMAP.md) for navigation,
shared selection, observable inspection, energy sweeps, state views, run
comparison, provenance and the conditional scene bridge.

QVIS-011 adds supplied Berry/vector/topology quantities; QVIS-012 adds bounded
chunked artifacts and display subsets; QVIS-013 closes the portable visualization
v0.1 gate with product web Scenes, read-only imports and tested compatibility.
See [RELEASE_QVIS_V0.1.md](RELEASE_QVIS_V0.1.md) for acceptance and limitations.
This extension reconciles the imported 001–010 proposal without renaming shipped
commits. General crystals, additional physics models and Math3D integration
remain separate future work; no Math3D files were changed.

R1 is implemented: the canonical 68-entry Atlas is pinned and reconciled with
existing typed Lab modules, seven source-example references and nine preserved
tested bindings. No second model/workspace/worker architecture was added.
See [ATLAS_RECONCILIATION_R1.md](ATLAS_RECONCILIATION_R1.md) for the full inventory.
R2 executable mapping review is implemented: all entries have dispositions,
scientific conventions and evidence for the nine preserved bindings. No new
binding is enabled by the review. See [R2–R5 review](ATLAS_RECONCILIATION_R2_R5.md).
R3 QVIS vocabulary review is implemented: C2–C8 compatibility, conversions and
gaps are recorded; a tested regular-grid utility preserves supplied z/y/x data
in the existing scene order. R4 gap review is implemented: every Atlas ID is
classified, with 12 ranked additive groups and scientific acceptance criteria.
The existing nine bindings remain intact; 59 entries are not newly implemented.
R5 is implemented: strict additive atlas-lab-reconciliation/v1 metadata is
frozen with full coverage/digests and schema/semantic compatibility tests.
Existing scientific protocols and all feature paths are retained. Future
physics extensions remain available; D1 is not started by reconciliation.

D1-001–004 now extend that baseline with a standalone static 1D harmonic
oscillator: contracts/model, independent QuTiP/native Fock engines, Electron
stationary-state plots/persistence, and reviewed Atlas binding/acceptance.
All four are implemented. The inventory now has ten tested Atlas bindings,
with the nine original mappings unchanged and all 68 definitions retained.
The R5 historical freeze is preserved; broader oscillator-family requirements
remain in G02. See [D1_OSCILLATOR.md](D1_OSCILLATOR.md). No Math3D, web compute
form, new scene vocabulary or parallel architecture is added.

D1-005–007 extend the existing Oscillator tab with bounded free motion of Fock
and finite projected coherent states, QuTiP/native comparison, a moving-density
time cursor, q/p/reference curves, progress/cancellation, verified saved binary
amplitudes, CSV/q-p SVG/manifest exports and backward-compatible workspace mode
restoration. All three are implemented; see
[D1_OSCILLATOR_DYNAMICS.md](D1_OSCILLATOR_DYNAMICS.md). This does not implement
driven, parametric, anharmonic or multidimensional oscillators, arbitrary states,
web oscillator computation or any new QVIS/Math3D boundary.

D1-008–010 subsequently add bounded monochromatic forcing within that same lab:
independent QuTiP/native evolution, analytic displacement and finite-phase checks,
q/p/occupation and energy/power/work diagnostics, verified persistence/exports,
optional workspace restoration, and a reviewed eleventh Atlas binding. The prior
ten bindings remain unchanged. The drive preset is an explicit Lab choice, not
an inferred Atlas envelope. Arbitrary envelopes/pulses and all wider G02 goals
remain planned; no web compute, scene or Math3D expansion. See
[D1_DRIVEN_OSCILLATOR.md](D1_DRIVEN_OSCILLATOR.md).

### Gaussian pulse continuation (implemented)

D1-011 adds a bounded declarative Gaussian pulse and independently verified
worker evolution; D1-012 adds pulse controls and cutoff/time-resolution
inspection in the existing Electron lab; D1-013 adds durable envelope data,
exports/restoration, reviewed Atlas coverage and acceptance. All three are
implemented in `cae4615`, `90d17bc` and `e9bdede`, respectively. Open
**Harmonic oscillator → Gaussian pulse** in Electron. Acceptance recorded on
2026-09-29: 182 tests passed, with typecheck and Electron/web/scene regression
gates passing. See [D1_PULSED_OSCILLATOR_PLAN.md](D1_PULSED_OSCILLATOR_PLAN.md)
for delivery, scientific gates and limits. All previous modes and eleven Atlas
load presets remain unchanged; Gaussian is a separate explicit Lab choice.
Arbitrary waveforms and all broader G02 goals remain planned. No Math3D, new
scene vocabulary or web oscillator compute permission is introduced.

### Damped thermal oscillator continuation (implemented)

D1-014–016 add a separate bounded thermal Lindblad mode to the existing
oscillator lab: independent QuTiP/native density-matrix solvers, desktop
occupation/purity/trace/coherence inspection and cutoff sensitivity, then
science-verified storage, exports and input-only restoration. See
[D1_DAMPED_OSCILLATOR.md](D1_DAMPED_OSCILLATOR.md) for equations, bounds and
acceptance. All previous modes, eleven Atlas presets, web permissions,
`quantum-scene/v1` and the Math3D boundary are preserved. General dissipative
drives and the broader G02 oscillator family remain planned.

### Stable parametric oscillator continuation (implemented)

D1-017–019 extend the same Electron oscillator lab with a bounded,
vacuum-initialized quadratic coupling. Independent QuTiP and native SciPy
finite-Fock paths produce full complex amplitudes and quadrature moments;
the host verifies propagation before saving or exporting. The UI provides
complex-coupling controls, engine comparison, analytic stable-branch reference
and an N-to-N+8 cutoff check. Runs export CSV, variance SVG and manifest;
workspaces restore inputs only. See
[D1_PARAMETRIC_OSCILLATOR.md](D1_PARAMETRIC_OSCILLATOR.md) for equations,
bounds and acceptance. The existing eleven Atlas load presets are retained;
the generic Atlas parametric entry is not silently enabled as a preset.
Web oscillator compute, scenes, Math3D, unstable pumping, arbitrary initial
states and broader G02 goals remain future work.

### Confining quartic oscillator continuation (implemented)

D1-020–022 add a bounded `m=1`, `λ≥0` static quartic spectrum to the same
Electron Oscillator lab. QuTiP and native SciPy independently diagonalize a
finite harmonic Fock matrix; host-side residual, orthogonality, moment and
parity checks verify every low eigenpair before durable storage and exports.
The UI shows harmonic-baseline shifts, engine comparison and an N→N+8
cutoff study. Workspace restoration is input-only. See
[D1_ANHARMONIC_OSCILLATOR.md](D1_ANHARMONIC_OSCILLATOR.md). All eleven
reviewed Atlas load presets are unchanged, and broader masses/bases,
anharmonic dynamics, double wells, ND oscillators, web compute, scenes and
Math3D remain planned.

### Linked scientific workspace continuation

The initial QLAB-UI-1–3 two-level pilots connected model, run, spectrum,
Hamiltonian and inspector selection. The subsequent evolution, cavity, open,
many-body, sweep, topology, orbital and oscillator adapters complete these
gates for currently reachable desktop labs. UI-4 is complete at its declared
scope: verified avoided-crossing E± studies coexist with final-P₁ dynamics
sweeps, with durable checkpoint/reopen/resume. UI-5 adds a two-level Bloch
great-circle/state readout tied to verified eigenvectors and run-scoped
selection; it withholds unique states for legacy or degenerate spectra.
The current six-mode navigation
is Explore, Dynamics, Sweeps, Analysis, Scenes and Runs; Atlas/Presets live in
Library and Roadmap/Backend in System. UI-1–3 now cover every currently
reachable lab; UI-6 adds durable A/B run comparison. UI-7 provenance-aware
rerun and UI-8 compatible scene handoff are implemented. Existing
lab entry points and saved workspaces remain compatible. See
[QLAB_LINKED_WORKSPACE_ROADMAP.md](QLAB_LINKED_WORKSPACE_ROADMAP.md) for
dependencies, scientific boundaries and acceptance criteria. Math3D
import remains separate repository work.

## 1. Technology decision

### V1

```text
Desktop shell        Electron 44
UI                    React + TypeScript
2D visualization     scientific React plotting layer
3D visualization     Three.js
Desktop bridge        Electron preload / typed IPC
Physics worker        Python
Primary engine        QuTiP
Reference engine      NumPy / SciPy
Future engines        Dynamiqs / QuSpin / scqubits
Persistence           workspace + run manifests
Large numerical data  binary side-channel
```

Architecture:

```text
┌─────────────────────────────────────────────────────────┐
│                QUANTUM HAMILTONIAN LAB                  │
│                                                         │
│  React / TypeScript                                     │
│                                                         │
│  Models │ Hamiltonian │ Dynamics │ Spectrum │ Floquet   │
│  Sweeps │ Open System │ Compare │ Visualization         │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                 preload API
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  ELECTRON MAIN                          │
│                                                         │
│  files       workspace        worker supervisor         │
│  export      settings         process lifecycle         │
│  caching     recent runs      crash recovery            │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
               JSON-RPC control
               binary data plane
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  PYTHON WORKER                          │
│                                                         │
│  job manager                                             │
│      │                                                   │
│      ├──── QuTiP                                        │
│      ├──── Native NumPy/SciPy                           │
│      ├──── Dynamiqs             later                   │
│      ├──── QuSpin               later                   │
│      └──── scqubits             later                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 2. Why Electron rather than .NET for this app

The main reason is not simply UI preference.

We already need:

```text
Python
  ↓
QuTiP
```

and later want:

```text
Math3D
  ↓
Three.js / web visualization
```

Electron therefore gives:

```text
React / TypeScript
        +
Python
```

A native .NET implementation would tend toward:

```text
C#
+
Python
+
JavaScript/Three.js
```

or would require us to replace the existing web visualization ecosystem with another 3D/UI implementation.

That gives us more boundaries rather than fewer.

.NET remains interesting later for:

```text
Windows-native services
enterprise integration
special Windows tooling
experimental companion client
```

but should not be the primary Quantum Lab architecture.

---

# 3. Important process boundary

The renderer must never directly spawn Python or access the filesystem.

Use:

```text
React renderer
      ↓
secure preload API
      ↓
Electron main
      ↓
Python worker
```

Electron renderer:

```text
nodeIntegration = false
contextIsolation = true
sandbox = true
```

Expose only narrow APIs such as:

```text
quantum.run()
quantum.cancel()
quantum.getCapabilities()

workspace.open()
workspace.save()

result.export()
```

Never expose:

```text
exec()
spawn()
fs.*
shell.*
```

to the renderer.

---

# 4. Worker protocol

Do not send huge scientific arrays as JSON.

Use two channels.

## Control plane

Small JSON messages:

```json
{
  "jsonrpc": "2.0",
  "id": "job-103",
  "method": "quantum.evolve",
  "params": {
    "model": "two_level",
    "engine": "qutip"
  }
}
```

Worker response:

```json
{
  "jsonrpc": "2.0",
  "id": "job-103",
  "result": {
    "runId": "run-20260923-001",
    "status": "complete",
    "dataset": "datasets/evolution.arrow"
  }
}
```

## Data plane

Large values:

```text
wavefunctions
density matrices
parameter maps
volumetric fields
trajectories
spectra
```

are transferred as binary artifacts rather than JSON arrays.

Initial choices:

```text
small arrays       NumPy / compact binary
tabular series     Arrow IPC
large fields       chunked binary
exports            NPZ / CSV / JSON
```

Later we can add HDF5/Zarr where appropriate.

This will matter enormously when we reach:

$$
\psi(x,y,z),
\qquad
\rho(x,y,z),
\qquad
E_n(k_x,k_y),
$$

because those datasets can contain millions of values.

---

# 5. Canonical contracts

One important change from Layer 1:

the app should have its own versioned contracts.

```text
quantum-job/v1
quantum-result/v1
quantum-scene/v1
```

Example model:

```json
{
  "schema": "quantum-job/v1",
  "operation": "evolve",

  "model": {
    "type": "driven_two_level",
    "parameters": {
      "delta": 1.0,
      "amplitude": 0.8,
      "frequency": 1.05
    }
  },

  "initialState": {
    "type": "basis",
    "index": 0
  },

  "solver": {
    "type": "schrodinger",
    "tStart": 0.0,
    "tStop": 40.0,
    "samples": 2000
  },

  "observables": [
    "sigma_x",
    "sigma_y",
    "sigma_z"
  ]
}
```

Neither side sees implementation-specific objects such as:

```text
Qobj
QobjEvo
SESolver
```

---

# 6. Worker handshake

At startup:

```text
Electron
   │
   ├── spawn worker
   │
   └── capabilities()
```

Worker responds:

```json
{
  "protocol": 1,

  "worker": {
    "version": "0.1.0"
  },

  "python": {
    "version": "3.x"
  },

  "engines": {
    "qutip": {
      "available": true,
      "version": "..."
    },

    "native": {
      "available": true
    },

    "dynamiqs": {
      "available": false
    }
  },

  "operations": [
    "diagonalize",
    "evolve",
    "steady_state",
    "sweep",
    "floquet"
  ]
}
```

This means the UI dynamically adapts to available engines.

---

# 7. Application layout

I would use a layout closer to Math3D than to a conventional calculator.

```text
┌─────────────────────────────────────────────────────────────┐
│ Quantum Hamiltonian Lab                         Run ▶       │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│ MODELS       │         WORKSPACE            │ INSPECTOR     │
│              │                              │               │
│ Two level    │                              │ Parameters    │
│ LZ           │       visualization          │               │
│ Stückelberg  │                              │ Δ      1.00   │
│ Oscillator   │                              │ Ω      0.80   │
│ JC           │                              │ ω      1.05   │
│ Rabi         │                              │               │
│ Custom       │                              │ Solver        │
│              ├──────────────────────────────┤               │
│ BOOK LABS    │ observable plots             │ tolerances    │
│              │                              │               │
│ Ch 58        │ σz ─────────────             │ Engine        │
│ Ch 59        │                              │ ● QuTiP       │
│              │                              │ ○ Native      │
│ RUNS         │                              │ ○ Compare     │
│              │                              │               │
├──────────────┴──────────────────────────────┴───────────────┤
│ Jobs   run-103 ✓  | worker ready | QuTiP ...               │
└─────────────────────────────────────────────────────────────┘
```

---

# 8. Main workspaces

Top-level tabs:

```text
Model
Hamiltonian
State
Spectrum
Dynamics
Open System
Floquet
Sweep
Compare
```

The tabs are context sensitive.

For example, selecting:

```text
Driven two-level system
```

could expose:

```text
Model
Dynamics
Bloch
Floquet
Sweep
Compare
```

while selecting:

```text
Jaynes-Cummings
```

provides:

```text
Model
Spectrum
Dynamics
Open System
Photon Statistics
Compare
```

---

# 9. Model workspace

Show the actual Hamiltonian prominently.

Example:

$$
H(t)
=
\frac{\Delta}{2}\sigma_z
+
\frac{\Omega}{2}\cos(\omega t)\sigma_x .
$$

Below:

```text
Terms

✓ Detuning
    Δ/2 σz

✓ Drive
    Ω/2 cos(ωt) σx

+ Add term
```

Inspector:

```text
Δ           1.000
Ω           0.800
ω           1.050
phase       0.000

Units
○ normalized
○ SI
```

Changing a parameter marks the current calculation:

```text
OUT OF DATE
```

rather than silently mixing old data with new parameters.

---

# 10. State workspace

Support:

```text
basis state
superposition
density matrix
thermal state
coherent state
custom vector
```

For two-level systems:

```text
|ψ₀> = cos(θ/2)|0>
       + exp(iφ)sin(θ/2)|1>
```

with:

```text
θ slider
φ slider

        ↕ synchronized

Bloch sphere
```

---

# 11. Spectrum workspace

Display:

$$
H|\psi_n\rangle=E_n|\psi_n\rangle .
$$

Views:

```text
energy levels
eigenstates
matrix elements
level crossings
avoided crossings
parameter spectrum
```

A parameter can become an axis:

```text
Energy
  ↑
  │       ╲   ╱
  │        ╲ ╱
  │         ╳
  │        ╱ ╲
  └────────────────→ g
```

---

# 12. Dynamics workspace

This becomes one of the application's primary areas.

Main visualization:

```text
P0(t)
P1(t)

<σx>
<σy>
<σz>
```

Alongside:

```text
Bloch sphere
```

Timeline:

```text
0 ─────────────●──────────── T
               ↑
          current state
```

Dragging the timeline updates:

```text
state vector
Bloch vector
density matrix
observables
```

synchronously.

---

# 13. Open-system workspace

Represent the master equation explicitly:

$$
\dot\rho
=
-i[H,\rho]
+
\sum_k
\mathcal D[L_k]\rho .
$$

Inspector:

```text
ENVIRONMENT

+ Relaxation
  γ₁ = 0.02

+ Dephasing
  γφ = 0.01

+ Cavity loss
  κ = 0.05

+ Thermal bath
```

Visualization can compare:

```text
Closed system
vs
Open system
```

with:

```text
population
purity
coherence
entropy
```

---

# 14. Floquet workspace

For:

$$
H(t+T)=H(t)
$$

display:

```text
quasienergy spectrum
Floquet states
resonances
avoided crossings
multiphoton structure
stroboscopic dynamics
```

This directly converts our Chapter 58 Layer-1 calculations into an interactive laboratory.

---

# 15. Sweep workspace

This is another central feature.

Example:

$$
P_e^{\max}(A,\omega).
$$

UI:

```text
X parameter      drive frequency
0.5 → 2.0
150 samples

Y parameter      amplitude
0 → 5
200 samples

Observable
maximum excited population

[ RUN SWEEP ]
```

Display:

```text
          ω
          ↑
        resonance
       ╱████████╲
      ╱██████████╲
     ╱    ██      ╲
    └────────────────→ A
```

Click a point in the map:

```text
(A,ω)
   ↓
rerun model
   ↓
open Dynamics
```

That creates a very natural scientific exploration workflow.

---

# 16. Compare workspace

One of our distinctive features.

```text
ENGINE COMPARISON

☑ QuTiP
☑ Native
□ Dynamiqs
```

Output:

```text
                QuTiP          Native

E0              -0.640312      -0.640312
E1               0.640312       0.640312

max |Δσz|                       4.7e-11

norm drift
QuTiP                           2.0e-12
Native                          7.1e-11
```

Visual overlay:

$$
\langle\sigma_z(t)\rangle_{\rm QuTiP}
$$

versus

$$
\langle\sigma_z(t)\rangle_{\rm native}.
$$

Later:

```text
QuTiP
Dynamiqs
QuSpin
```

where the model is supported by multiple engines.

---

# 17. Book integration

A very useful left-panel section:

```text
BOOK LABS

Volume VIII

Chapter 58
  Two-level system
  Rabi oscillations
  Landau-Zener
  Stückelberg
  Bloch-Siegert
  Floquet

Chapter 59
  Jaynes-Cummings
  Quantum Rabi
  cavity loss
  decoherence
```

Choosing one loads exactly the parameters from our reproducible book example.

Then:

```text
[ Restore book values ]
```

and:

```text
Source
Volume VIII
Chapter 58
Figure 58.x
Reference manifest: ...
```

Thus Layer 1 becomes executable content rather than being abandoned when we start the app.

---

# 18. Run provenance

Every run should generate:

```text
runs/
  2026-09-23T.../
      run.json
      environment.json
      result.json
      data/
      logs/
```

`run.json`:

```text
model
parameters
state
solver
engine
engine version
timestamp
tolerances
random seed
dataset hashes
```

This gives us deterministic scientific provenance from day one.

---

# 19. Cancellation and long jobs

Every calculation gets a job ID.

Lifecycle:

```text
queued
   ↓
starting
   ↓
running
   ↓
completed
```

or:

```text
running
   ├── cancelled
   └── failed
```

For sweeps:

```text
███████████░░░░░ 68%

12340 / 18000
```

Worker cancellation must be real cancellation rather than simply hiding the job from the UI.

Heavy jobs can later run as isolated worker subprocesses so a bad numerical calculation cannot kill the primary Python service.

---

# 20. Python worker structure

```text
workers/
└── quantum-python/
    ├── pyproject.toml
    ├── tests/
    │
    └── quantum_worker/
        ├── main.py
        ├── protocol/
        │   ├── server.py
        │   └── messages.py
        │
        ├── jobs/
        │   ├── manager.py
        │   ├── cancellation.py
        │   └── progress.py
        │
        ├── engines/
        │   ├── base.py
        │   ├── qutip_engine.py
        │   └── native_engine.py
        │
        ├── models/
        │   ├── two_level.py
        │   ├── landau_zener.py
        │   ├── oscillator.py
        │   ├── jaynes_cummings.py
        │   └── quantum_rabi.py
        │
        ├── observables/
        ├── serialization/
        └── provenance/
```

---

# 21. Desktop repository structure

```text
quantum-hamiltonian-lab/
│
├── apps/
│   ├── desktop/
│   │   ├── main/
│   │   ├── preload/
│   │   └── renderer/
│   │
│   └── web/                  later
│
├── packages/
│   ├── contracts/
│   ├── models/
│   ├── workspace/
│   ├── plots/
│   ├── quantum-3d/
│   └── ui/
│
├── workers/
│   └── quantum-python/
│
├── examples/
├── tests/
└── docs/
```

This mirrors the architectural ideas already proven in Math3D without coupling the two applications.

---

# 22. 3D layer

The app should already have a small package:

```text
packages/quantum-3d/
```

but initially it only needs:

```text
Bloch sphere
state vector
simple phase visualization
```

Later it becomes the consumer of:

```text
quantum-scene/v1
```

and supports:

```text
orbitals
molecules
crystals
Brillouin zones
bands
Berry fields
```

Eventually the same scene can be sent to Math3D.

---

# 23. Future Math3D boundary

Design now:

```text
QuantumResult
      │
      ▼
QuantumScene
      │
      ├──── Quantum Lab 3D viewer
      │
      └──── Math3D adapter
```

This is much better than:

```text
Quantum Lab
      │
      ▼
special Math3D calls
```

Both applications simply understand the same portable scene format.

Eventually:

```text
[ Open in Math3D ]
```

serializes:

```text
quantum-scene/v1
```

and launches/imports it.

---

# 24. Desktop V1 scope

Do NOT initially implement atoms, molecules or crystals.

V1 should prove the architecture with material already validated in Layer 1:

```text
Two-level Hamiltonian
Rabi dynamics
Landau-Zener
Stückelberg
strong drive
Floquet
Jaynes-Cummings
Quantum Rabi
Lindblad dynamics
parameter sweeps
QuTiP/native comparison
```

That is already a substantial scientific application.

---

# 25. First desktop commit sequence

## QLAB-001

```text
arch(quantum-lab): scaffold Electron React desktop workspace
```

Create:

```text
apps/desktop
packages/contracts
packages/ui
workers/quantum-python
```

Secure Electron baseline.

No physics yet.

---

## QLAB-002

```text
arch(quantum-lab): define versioned quantum job and result contracts
```

Add:

```text
quantum-job/v1
quantum-result/v1
worker-capabilities/v1
```

Tests for schema compatibility.

---

## QLAB-003

```text
feat(worker): establish supervised Python worker protocol
```

Implement:

```text
hello
capabilities
health
shutdown
```

Electron launches worker and shows:

```text
Python worker: READY
```

---

## QLAB-004

```text
feat(worker): add QuTiP engine and two-level smoke laboratory
```

First real path:

```text
UI
 ↓
contract
 ↓
worker
 ↓
QuTiP
 ↓
result
 ↓
UI
```

Calculate:

$$
E_\pm
$$

and return spectrum.

---

## QLAB-005

```text
feat(worker): add evolution jobs, progress and cancellation
```

Support:

```text
evolve
progress
cancel
result
```

First:

$$
\langle\sigma_z(t)\rangle.
$$

---

## QLAB-006

```text
feat(desktop): add model, Hamiltonian and parameter workspace
```

Models:

```text
two-level
driven two-level
Landau-Zener
```

---

## QLAB-007

```text
feat(desktop): add dynamics plots and Bloch-sphere laboratory
```

Implement:

```text
populations
σx
σy
σz
Bloch trajectory
timeline
```

This should be our **first visually impressive milestone**.

---

## QLAB-008

```text
feat(worker): add native NumPy SciPy validation engine
```

Then:

```text
QuTiP
Native
Compare
```

---

## QLAB-009

```text
feat(desktop): add solver comparison and numerical diagnostics
```

Show:

```text
error
norm drift
state fidelity
observable difference
runtime
```

---

## QLAB-010

```text
feat(desktop): add Landau-Zener and Stückelberg laboratories
```

Reuse Layer-1 models and references.

---

## QLAB-011

```text
feat(desktop): add Floquet and strong-drive laboratory
```

Add:

```text
quasienergies
Floquet modes
Bloch-Siegert
resonance maps
```

---

## QLAB-012

```text
feat(desktop): add Jaynes-Cummings and quantum-Rabi laboratories
```

Add:

```text
dressed spectrum
qubit population
photon number
cavity dynamics
```

---

## QLAB-013

```text
feat(desktop): add Lindblad open-system laboratory
```

Add:

```text
relaxation
dephasing
cavity loss
purity
coherence
steady state
```

---

## QLAB-014

```text
feat(desktop): add parameter-sweep engine and heatmap workspace
```

Support:

```text
1D sweeps
2D sweeps
cache
cancel
resume
```

---

## QLAB-015

```text
feat(desktop): integrate Volume VIII reproducible laboratory presets
```

Expose the finished Layer-1 examples directly inside the app.

---

## QLAB-016

```text
feat(desktop): add run provenance, workspace persistence and export
```

Add:

```text
save workspace
restore workspace
export numerical data
export figures
export manifest
```

---

## QLAB-017

```text
release(quantum-lab): freeze desktop computational laboratory v0.1
```

Acceptance:

```text
Windows ✓
Linux ✓

worker recovery ✓
QuTiP ✓
native comparison ✓
cancellation ✓
workspace persistence ✓
Layer-1 book presets ✓
```

---

# 26. Second phase

After V0.1:

```text
QLAB-018   Dynamiqs GPU adapter
QLAB-019   GPU/batched sweep scheduler
QLAB-020   QuSpin adapter
QLAB-021   many-body workspace
QLAB-022   scqubits adapter
QLAB-023   superconducting-circuit workspace
QLAB-024   remote worker transport
QLAB-025   pinned, read-only Hamiltonian Atlas catalog (implemented)
QLAB-026   tested Atlas-to-lab convention bindings (implemented)
QLAB-027   SSH-chain bands, winding and finite edges (implemented)
QLAB-028   QWZ Berry curvature and Chern laboratory (implemented)
QLAB-029   web client foundation, pinned Atlas and SSH/QWZ labs (implemented)
```

Portable visualization milestones now implemented:

```text
QVIS-001   strict portable quantum-scene/v1 contract, TS/Python and binary verification
QVIS-002   independent scene viewer, saved Bloch/SSH/QWZ adapters and bundle export
QVIS-003   regular scalar/complex fields, signed isosurfaces, slices and phase (implemented)
QVIS-004   hydrogenic orbital worker, s/p/d fields, radial and grid diagnostics (implemented)
QVIS-005   SSH sublattices/bonds, Ising magnetization and QWZ axes (implemented)
QVIS-006   read-only verified scene bundle import and provenance inspection (implemented)
QVIS-007   fixed-box/fixed-spacing orbital studies and radial-node diagnostics (implemented)
QVIS-008   bounded open lattice cells/supercells, square/honeycomb/cubic fixtures (implemented)
M3D-Q01    future: importer in the separate Math3D repository (not implemented)
```

Historical Lab-only visualization sequence (now implemented at bounded scope;
detailed source-plan mappings are in
[POST_QLAB_QVIS_M3D_ROADMAP.md](POST_QLAB_QVIS_M3D_ROADMAP.md)):

```text
QVIS-009   reciprocal basis, high-symmetry points/paths and Brillouin-zone guides (implemented)
QVIS-010   portable supplied band paths/surfaces and synchronized inspection (implemented)
QVIS-011   supplied Berry/vector/topology scene extensions (implemented)
QVIS-012   chunked data, lazy verification, cancellation, cache and LOD (implemented)
QVIS-013   evidence-based portable visualization v0.1 release gate (implemented)
Track A    progressively unify Atlas/model metadata (partial catalog/bindings today)
M3D-Q01–10 separate Math3D integration track (external status not assessed here)
```

Bounded open lattice, reciprocal guides and supplied SSH/QWZ band workflows
are implemented; arbitrary crystals, periodic bond wrapping and a general
crystal/BZ/band engine are not. QWZ curvature guides are partial topology
coverage. Product web Scenes navigation passed the QVIS-013 bounded release
gate; it does not imply a Math3D importer.

See [QUANTUM_SCENE.md](QUANTUM_SCENE.md) for the implemented subset, usage,
artifact conventions and acceptance. No Math3D source changes or direct worker
connection are required for QVIS-001–004. See [FIELDS_ORBITALS.md](FIELDS_ORBITALS.md)
for field visualization and the single-electron analytic orbital scope.

---

# 27. What about .NET 11 later?

Keep one architectural option open:

```text
quantum contracts
        │
        ├──── Electron client
        ├──── Web client
        └──── future .NET client
```

Because the contracts are external and versioned, a future:

```text
.NET 11/12
WinUI
Avalonia
MAUI
```

client can consume the same Python worker.

No backend redesign is required.

So we do not need to choose:

```text
Electron OR .NET forever.
```

We choose:

```text
Electron = primary desktop client now

Python worker = permanent physics boundary

.NET = possible alternate client later
```

---

# Final architecture

```text
                 QUANTUM CORE

              Quantum Contracts
                    │
          ┌─────────┴──────────┐
          │                    │
      Electron              future
       React UI           web/.NET UI
          │                    │
          └─────────┬──────────┘
                    │
               Worker API
                    │
                    ▼
             Python Supervisor
                    │
       ┌────────────┼─────────────┐
       │            │             │
     QuTiP        Native       Dynamiqs
                               QuSpin
                               scqubits


                  VISUALIZATION

              QuantumResult
                    │
                    ▼
              QuantumScene
              ┌─────┴─────┐
              │           │
       Quantum Lab      Math3D
          viewer         adapter
```

That is the architecture I would freeze before writing QLAB-001.

---

# 28. Proposed QVIS-014–023 scientific-workflow extension

Status (2026-10-04): **QVIS-014–019 implemented for their declared bounded
desktop scope; QVIS-020–023 planned**. This is an
additive continuation after the delivered QVIS-001–013 and QLAB-UI-1–8 work.
It does not reopen, rename, or downgrade those milestones, replace
`quantum-scene/v1`, or change historical run semantics. Existing two-level
selection, bounded studies, model-specific inspectors, A/B comparison,
dynamics, Atlas bindings and the verified Lab-side scene bridge are starting
points; the items below target broader scientific coverage and shared behavior.
An individual item is complete only at its stated, tested scope.

## QVIS-014 — Linked scientific selection

Delivered scope: the existing two-level, evolution, cavity, Lindblad,
Transmon, Ising, final-population sweep, SSH/QWZ, orbital and oscillator
selectors map their *resolved* coordinates to a renderer-local
`scientific-selection/v1` reference containing exact run ID, model, operation
and coordinate only. Existing plots and model-specific inspectors remain the
source of recorded values. A shared inspector card identifies the reference
and explicitly names unavailable state/observable data. Compatible Lab →
Scenes handoff consumes the same reference and links only an adapter-supported
sample; unsupported coordinates show a full-run scene. New-run transitions
clear old cursors, no cursor is invented after restart, and verified reopening
or scene materialization refuses a tampered source. This does not
freeze a new IPC/worker schema or synchronize selection back from imported or
independently opened web scenes.

Generalize the existing exact-run selection pattern into a common,
model-aware `ScientificSelection` contract. Selecting a spectrum level, site,
time sample, sweep point, or scene sample should identify its immutable run,
result type, coordinate/index and available recorded values. Views and the
inspector should resolve that reference against the saved artifact, not copy
mutable display values. For a selected eigenstate, show energy, degeneracy,
symmetry/parity sector, expectation values and state provenance **only when
those quantities were computed and stored**. For an Ising site, expose
`⟨σx⟩`, `⟨σy⟩`, `⟨σz⟩` only as each component becomes available. The current
Ising result does not supply all three. Cross-run and unavailable-state
selections must be refused or clearly labelled, not inferred.

## QVIS-015 — Parameter Sweep Laboratory

Implemented bounded scope (2026-10-04):

| Model/output | Axis and record | Reopening/selection |
| --- | --- | --- |
| Static two-level `E₋, E₊` | `Δ` at fixed `Ω` (`quantum-spectrum-study/v1`) or `Ω` at fixed `Δ` (`v2`); 3–31 points | Each point is an immutable, verified spectrum run; selecting opens that run. Existing v1 manifests remain readable. |
| Rabi, Landau–Zener, Stückelberg, strong-drive final `P₁` | Existing bounded 1D/2D parameter grids | The grid is one immutable saved run. A clicked cell is an exact recorded coordinate in that run, **not** a separate run or saved trajectory. Existing cache/cancel/resume and grid integrity rules are retained. |
| Finite Ising `Eₙ`, gap, site `⟨σᶻ⟩`, half-chain entropy | `h/J` at fixed sites, boundary, `J ≠ 0`, longitudinal field (`quantum-ising-study/v1`); 3–31 points | Each point is an immutable, verified Ising run; selecting opens that run. Mean magnetization is explicitly derived from saved site values. |

The static and Ising point-run studies use bounded versioned plans,
atomic hash-wrapped checkpoints, cancellation between points and
verified-prefix resume. Run IDs, numerical outputs, engine, normalized units
and saved-run provenance are preserved; a study is never promoted from
edited workspace inputs. Desktop acceptance covers point selection, exact-run
reopening and restart; contract/numerical tests cover QuTiP/native static
studies, native/installed QuSpin Ising, checkpoint integrity and tampering.
The existing final-`P₁` inspector provides its recorded grid/cache/provenance
and explicitly withholds a time trajectory or state vector per cell.

Neighboring-ground-state fidelity remains out of scope: the current Ising
result has no stored ground-state vector. Other model/output extensions are
still welcome as additive follow-on work; QVIS-015's declared bounded
adapters are complete, not a claim that arbitrary models can be swept.

Delivered Ising slice (2026-10-04): `quantum-ising-study/v1` fixes 2–8 sites,
open/periodic boundary, nonzero `J` and longitudinal field, then varies
transverse `h/J` over 3–31 points while keeping every generated job within
the existing ±10 field/coupling limits. Native and optional QuSpin use the
unchanged many-body worker job. Each point is an immutable Ising run; an
atomic, hash-wrapped manifest verifies the exact saved job and result before
listing, reopening or resuming a checkpoint. Cancellation is between points.
The desktop Ising Sweeps view plots stored low energies, gap, stored
half-chain entropy, and an explicitly derived mean of stored site
magnetizations. Selecting a point shows recorded values and opens that exact
verified run. Workspace restore preserves inputs, not a fabricated study.
Restart, manifest/run tampering, and both installed engines are tested.
Neighboring-ground-state fidelity remains out of scope: the current result
does not store the ground-state vector. Wider model/output sweep adapters
remain future additive work and do not alter the delivered bounded scope.

Extend the existing two-level eigenenergy study and final-`P₁` sweep
infrastructure to declared model/output pairs. First proposed many-body case:
a bounded Ising `h/J` sweep with low-lying `Eₙ`, finite-size gap, and recorded
magnetization. Half-chain entropy is already recorded for a current single
Ising run and may be collected from verified sweep-point runs.
Neighboring-ground-state fidelity is a separate proposed result addition
requiring state data, a numerical definition, worker/contract validation and
convergence tests. Each point is an immutable run,
and clicking it reopens or selects exactly that run. Two-level avoided-crossing
studies versus `Δ` or `Ω` should reuse their existing verified point-run model
where applicable. Checkpointing, cancellation, resume, units and provenance
remain explicit.

## QVIS-016 — Observable workspace

Implemented bounded scope (2026-10-04): a renderer-local
`observable-workspace/v1` projection resolves only the active
`scientific-selection/v1` coordinate and matching result. Reusable cards
declare operator, state/sample, basis, unit, exact stored field or labelled
derivation, and numerical diagnostic or explicit unavailability. Spectrum,
four two-level evolution models, both cavity models, Lindblad, Transmon,
Ising, final-population sweeps, SSH/QWZ topology, hydrogenic orbitals and the
oscillator family use this same view. Existing model-specific inspectors and
their richer diagnostics remain in place; this is not a second worker protocol
or a replacement for existing run verification. Hash-verified reopening and
restart continue to clear unselected cursors.

The frozen `quantum-result/v1` branch stores no pair expectations, and its
fingerprint guard forbids silently extending it. QVIS-017 now supplies
connected `Cᶻᶻᵢⱼ` only when a separate exact-run, hash-verified state sidecar
is loaded; otherwise the card remains unavailable. Correlation length stays
unavailable because no universal finite-size fit is asserted. Total
`⟨Σσᶻ⟩` is visibly derived from stored site means. A
selected Ising energy does not acquire a fabricated excited-state correlation.
No full ground-state vector, Lindblad density matrix, cavity state vector,
Transmon eigenvector or sweep-cell time trajectory is implied. See
`docs/QVIS016_OBSERVABLE_AUDIT.md` for the coverage and boundary inventory.

Original proposed scope, retained for context:

Promote recorded observables into reusable, unit-labelled cards for
expectation, variance, correlation, occupation/population, transition
probability and operator matrix elements. Cards should declare their operator,
state/run, basis, units, uncertainty or numerical diagnostic, and whether a
value is stored or unavailable. Proposed Ising additions are site-resolved
`⟨σᶻᵢ⟩`, connected `Cᶻᶻᵢⱼ = ⟨σᶻᵢσᶻⱼ⟩ − ⟨σᶻᵢ⟩⟨σᶻⱼ⟩`, total magnetization,
and a correlation length only when its finite-size definition is meaningful.
The present inspector remains intact until a shared view covers its existing
diagnostics without loss.

## QVIS-017 — Many-body state inspection

Implemented bounded scope (2026-10-04): a separate
`quantum-ising-state/v1` sidecar is bound to the SHA-256 hashes of one
verified saved Ising job and result. The worker recomputes the state with the
source engine (native or optional QuSpin), independently checks the
MSB-first Pauli-z basis, ground energy, norm and residual, and the host
compares the recomputed gap, site means and middle-cut entropy to the saved
run before caching. The cache is hash-wrapped and reopened only against the
same still-verified source; missing sidecars compute on request, corrupt
sidecars are refused, and restarting does not invent an active selection.
`quantum-result/v1` and its fingerprint remain unchanged.

For resolved 2–8-site ground states, the Lab shows the connected-z
correlation matrix, natural-log von Neumann entropy at every contiguous cut,
and at most 16 leading computational-basis **probabilities** plus omitted
probability. A clicked correlation row selects that exact saved-run Ising
site and enables the matching QVIS-016 cards. A declared near-degenerate
ground level withholds state-specific quantities. No amplitudes or full
vector are exposed, no excited-state sector is inferred, and no universal
finite-chain correlation length is claimed. See `docs/QVIS017_ISING_STATE.md`.

Original proposed scope, retained for context:

For bounded Ising chains, propose a site-correlation matrix,
entanglement-versus-cut plot and small-`N` computational-basis probability
view. Dominant basis states (for example `|0000⟩` and `|0011⟩` at `N=4`)
must come from a verified stored or reproducibly computed state; the current
result does **not** store a full ground-state vector. Define a strict
Hilbert-space/sample budget, truncation disclosure and convergence checks
before adding state artifacts. Do not render all amplitudes for large `N`.

## QVIS-018 — Run comparison extension

Implemented bounded desktop scope (2026-10-04): the existing verified A/B
pins and Analysis view now include an inline contextual drawer. It compares
changed numerical model inputs for the same operation/model; a stored level,
transition or bulk gap only when recorded observables align; summaries of all
already-aligned observable series; and explicitly declared numerical
diagnostics present in both results. Backend versions and elapsed worker time
are shown as context, not as an accuracy measure. Different models, unaligned
grids, absent fields and tampered/missing saved runs produce no physical
delta. The drawer creates no new run, worker call, persistence store or
`quantum-result/v1` branch. Desktop Theory also gained selected-model
conceptual SVG schematics, including a nucleus and probability cloud for the
hydrogenic model; these are labelled as illustrations, never computed data.

Reuse the delivered immutable A/B pins and hash-verified Analysis view, not a
second comparison store. Add a compact contextual drawer for compatible
parameter deltas, spectra, gaps, recorded observables, backend/runtime and
numerical residuals. Keep the existing compatibility gates: no pointwise
difference without aligned model, observable, units and sample grid; no
substituted, tampered or missing run. This is a presentation/scientific-coverage
extension to QLAB-UI-6, not a claim that A/B comparison is currently absent.

## QVIS-019 — Symmetry and sector awareness

Implemented bounded cavity scope (2026-10-04): the desktop reopens the exact
hash-verified saved cavity run before displaying symmetry evidence. For
Jaynes–Cummings, each stored row checks conservation of
`N = a†a + |e⟩⟨e|` against the initial Fock/qubit state. Independently
constructed finite excitation blocks must reproduce every sorted worker
dressed energy before a level is labelled and color-coded by `N`. A
cross-sector degeneracy is labelled unresolved, never assigned by sort order;
the highest-`N` singleton is explicitly a Fock-cutoff edge state. For quantum
Rabi, every saved row checks conservation of
`Π = (−1)ⁿ(Pg − Pe)`; only the *run* parity is shown because dressed
eigenvectors and level-parity labels are absent from the frozen result.
Both native and QuTiP, restart, corruption refusal and desktop navigation
are tested. The original worker/result protocols remain unchanged; wider
models and symmetry-reduced solvers remain separate future additions.

Desktop Back/Forward controls now traverse the existing model/mode history;
a new navigation branch clears Forward availability. These route controls
do not rewind a saved run or worker computation.

When a model and solver explicitly support it, record and display conserved
quantities and sector labels such as parity, excitation number, particle
number, spin or momentum. Label/color spectrum entries by *verified* sector,
with degeneracy and basis conventions visible. Jaynes–Cummings excitation
number is a useful first candidate; not every existing result stores it.
Symmetry-reduced blocks may later improve computation, but only after a
separate solver-equivalence and boundary-condition gate. Never assign a sector
from a visually suggestive level crossing alone.

## QVIS-020 — Dynamics as a sibling of Spectrum

Unify interaction semantics around `initial state → Hamiltonian → evolution →
recorded observables` within the existing model/run architecture. Rabi,
Landau–Zener and cavity evolution already exist; this milestone extends their
shared navigation and synchronized timeline/state semantics without replacing
their validated jobs. Ising-quench magnetization is proposed new physics and
requires its own bounded worker result, validation and persistence. A cursor
may synchronize plots and state displays only for data actually stored at that
time sample.

## QVIS-021 — Scientific figure export

Add a consistent Figure action to major plots: SVG and PNG where supported,
plus a metadata sidecar containing model ID, exact run ID/result hash,
parameters, units, backend/version and timestamp. A publication view should
remove application chrome while retaining axes, legends, uncertainty and
scientific context for Volume VIII use. Existing CSV/SVG/manifest exports are
preserved; this milestone extends coverage and presentation rather than
redefining their files. Exported figures must not silently recalculate or
resample a run.

## QVIS-022 — Atlas → Lab deep linking

Extend the delivered pinned Atlas bindings with capability-gated actions:
Open in Lab, Run canonical example, Sweep parameter and Open theory reference.
The reverse link should show the exact Atlas entry/revision and Volume VIII
section on applicable runs. Current bindings cover only declared entries;
descriptive Atlas entries must not acquire executable buttons until their
model, units, parameters, canonical job and provenance pass validation.

## QVIS-023 — Scenes / Math3D bridge

Use `QuantumResult → quantum-scene/v1 → independent consumers` for genuinely
spatial data: Bloch trajectories, lattice-site fields, Berry curvature,
supplied bands, probability densities and orbitals, with future crystal
models gated separately. The lightweight Lab viewer and QLAB-UI-8 verified
run-to-Scenes path are already implemented. “Open in Math3D” remains **outside
this Lab milestone** until the separate Math3D importer accepts the same
portable scene, hashes, units and sample semantics. No direct Math3D-to-worker
or Lab-to-Math3D worker call is introduced.

## Shared inspector and contract gate

Move toward one contextual inspector with **Parameters → Selection →
Observables → Provenance** views. Selecting `E₂`, Site 3, an entanglement cut
or a sweep point changes the same run-backed context. Preserve model-specific
details and drafts until each shared view can represent them without loss.
The proposed logical flow is:

```text
ModelDefinition
      ↓
RunInput ───────────────┐
      ↓                 │
ImmutableRun            │
      ↓                 │
ScientificResult        │
      ↓                 │
ScientificSelection ←───┘
      ↓
View / Inspector / Scene / Export
```

These are *conceptual roles*, not five newly frozen wire schemas. Reconcile
them with the existing versioned job/result, run-store, model registry and
scene contracts before adding any type or protocol. Domain-specific two-level,
Ising, Jaynes–Cummings and other results retain their validated physics.

The recommended first delivery order is **QVIS-014 linked selection →
QVIS-015 sweeps → QVIS-016 observables**, followed by the remaining items as
their data contracts and scientific acceptance become ready. Every slice
requires exact-run/restart/tamper checks, model-specific numerical tests,
desktop and web regression where exposed, and an explicit unavailable-data
state. The separate Math3D importer remains its own release gate.
