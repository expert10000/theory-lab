# D1-014–016 — bounded damped thermal oscillator

Status: implemented in the existing Electron/React → typed IPC → supervised
Python worker → verified result path. This is an additive open-system mode in
**Harmonic oscillator → Damped / thermal**. It changes neither the eleven Atlas
load presets nor `quantum-scene/v1`, browser compute permissions or Math3D.

| Milestone | Delivered scope | Status |
| --- | --- | --- |
| D1-014 | Strict `oscillator_damped` job/result and independent QuTiP MESolver / native SciPy DOP853 density-matrix evolution | Implemented |
| D1-015 | Controls, number/purity curves, trace/positivity/coherence readouts, engine comparison and N→N+4 check | Implemented |
| D1-016 | Independent host propagation and density checks, verified saved runs/CSV/SVG/manifest, input-only workspace restoration and acceptance | Implemented |

The model is `H=ω(a†a+1/2)` in a finite Fock basis (ℏ=1), with collapse
operators `√[κ(n̄+1)]a` and `√[κn̄]a†`. Initial states are a number state or
an explicitly normalized finite projection of a coherent state. `κ=0` is
allowed. The bounded scope is cutoff 8–16, ω .1–5, κ 0–2, bath occupation
0–2, duration >0 and ≤20, at most 201 samples, ω·duration≤60 and
κ·duration≤12. Fock n must be below cutoff−1; coherent |α|≤2.

`quantum-damped-oscillator-data/v1` stores six readout columns followed by the
complex density matrix in row-major order at every observation time, at most
201×518 Float64 values (832,944 bytes). The host recomputes readouts, checks
Hermiticity, trace, purity and positive semidefiniteness, and independently
integrates the finite Lindblad equation with bounded RK4 steps. Hashes alone
are insufficient: a rehashed phase alteration is rejected by the physics
check. Storage preflights the complete data before making a run directory;
load and all exports reverify it. Cancellation leaves no published worker
artifact. Restored workspaces contain inputs and mode, never a computed plot.

The infinite-space mean-number reference `n̄+(⟨N⟩₀−n̄)e^(−κt)` is displayed
only as a truncation diagnostic; its discrepancy is expected near the finite
basis boundary. The N→N+4 comparison uses the same engine and observation
times and reports sensitivity, not a proof of infinite-dimensional
convergence. It separately reports the change in the finite projection of a
coherent initial state. The existing qubit–cavity Lindblad lab is unchanged.

Acceptance includes loss, thermal relaxation, zero loss, coherent-state
coherence, cross-engine agreement, bounds, cancellation, persistence,
tamper/rehashed-tamper rejection, workspace compatibility and desktop UI
smoke. General open oscillators, arbitrary baths, drives with simultaneous
dissipation, parametric/anharmonic/ND models and physical-length calibration
remain future work.

Acceptance recorded 2026-10-01: 109 Node and 80 Python tests passed, with
one opt-in SSH and four optional-engine tests skipped. Typecheck, authenticated
web, independent scene and full Windows Electron smoke/restart gates passed.
