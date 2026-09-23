# Quantum Hamiltonian Lab

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
QLAB-025   web client
```

Only then begin:

```text
QVIS-001
M3D-Q01...
```

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
