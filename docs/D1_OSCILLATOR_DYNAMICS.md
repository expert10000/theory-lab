# D1-005–007 — bounded free oscillator motion

This extends D1-001–004; the stationary lab and its Atlas binding remain intact.
No driven/anharmonic/ND Hamiltonian, web compute permission, scene vocabulary or
Math3D connection is introduced.

| ID | Delivery | Status |
| --- | --- | --- |
| D1-005 | Append-only contracts, supervised worker, independent engines and scientific binary checks | Implemented |
| D1-006 | Electron dynamics controls, moving density, time cursor and comparison/cancellation | Implemented |
| D1-007 | Durable dynamics, exports, restoration, regression and roadmap acceptance | Implemented |

## Scientific scope

`H=omega(N+1/2)`, hbar=1; q and p are dimensionless quadratures. Initial state is
either Fock `|n>` or the explicitly normalized projection `P_N|alpha>` onto the
finite Fock basis. Coherent coefficients start from
`exp(-|alpha|^2/2)*alpha^n/sqrt(n!)`, then divide by the square root of retained
Poisson probability. Both retained and omitted probabilities are reported.
This initial-state definition is not a solver-output correction. Native and
QuTiP outputs are never renormalized; moments divide by the measured state norm.

Native evolves exact spectral phases; QuTiP independently integrates its number
Hamiltonian with `SESolver`, `normalize_output=False`, atol=1e-12, rtol=1e-10.
Both preserve zero-point phase. References use elapsed time `t-tStart`, not
absolute clock time: `<q>=sqrt(2)Re(alpha exp(-i omega tau))`, and likewise for p.
These are full-coherent-state references; finite-projection discrepancies are
expected when the cutoff is inadequate. Fock density is stationary even though
its complex phase changes.

Readout variances use the finite ladder operators `P_N q P_N` and `P_N p P_N`.
For the same projected wavefunction, continuum Hermite-space variances add
`N/2 * boundary_probability` to each finite-operator variance. This distinction
matters at inadequate cutoff; boundary occupation is displayed. Neither norm
checks nor matching engine trajectories establish spatial-grid convergence.

Bounds: omega .01–20, cutoff 8–64, Fock n 0–10 below cutoff−1, |alpha|≤2,
times ±100 with 0<omega*duration≤100, 3–1001 samples, plotting extent 2–12 and
odd points 101–401. No arbitrary state/vector input or source-path execution.

## Existing supervised data path

`oscillator_evolve` is appended to `quantum-job/result/v1`; all preceding
branches/definitions, including D1 static, are fingerprint-tested against
`protocols-d1-static.v1.json` (baseline 71c521c). Strict consumers must update to
accept this enum case. Original scene formats are unchanged.

Use existing `quantum.start`, progress, cancellation and verified artifact
transport. New `quantum-oscillator-data/v1` is row-major f64le, SHA-256 checked,
at most 1,105,104 bytes. Each row contains ten diagnostics:

`time,q_mean,p_mean,q_variance,p_variance,mean_number,boundary_probability,norm,q_exact,p_exact`

followed by `c0_re,c0_im,...,c(N-1)_re,c(N-1)_im`. No full spacetime density
volume is retained. Real-space density is reconstructed at the selected sample
using the shared Hermite basis; finite-box probability is never rescaled to one.
Plots therefore compare independent evolution engines, not independent spatial
basis-transform implementations. The host also independently checks times,
amplitudes, moments, reference trajectories and summary diagnostics, not just
schema/byte hashes. Cancelled work does not publish a partial artifact.

## UI, durability and compatibility

Electron: **Harmonic oscillator → Free dynamics**, next to **Stationary
spectrum**. Select Fock n or complex alpha, engine/compare, cutoff, sample
times and plotting grid. The cursor selects an actual computed row (no
interpolation or time-sequence scene player). Density overlays, q/p trajectories,
full-coherent reference curves, projection loss, boundary occupation, norm and
energy drift, engine versions and phase-independent comparison are visible.
Changing parameters marks old results out of date; cancellation retains the
last verified plot and never saves the cancelled run.

Runs lists each completed engine result independently. CSV exports all diagnostic
and complex-coefficient columns; SVG plots q/p versus time, not a scene or a
space/time density volume. Manifest exports include initial state, solver,
projection diagnostics, engine/Python versions and artifact SHA-256. Run loading
and export recheck contracts, metadata binding, bytes/hash and independently
computed physics. Rehashed forged amplitudes/readouts are still rejected.
Saved data exports after a full app restart without the live worker artifact.

Optional `oscillatorDynamics` and `oscillatorMode` extend `quantum-workspace/v1`.
Older snapshots remain valid and restore to defaults/static mode when these
fields are absent. Workspaces restore inputs and selected mode, never synthesize
a computed plot. Atlas loading still selects the original stationary binding;
all 68 definitions, ten bindings and wider G02 requirements are retained. The
web gateway explicitly rejects the new operation, and oscillator scene export
continues to reject unsupported adapters. Math3D is unchanged.

## Acceptance — 2026-09-29, Windows

- Typecheck/build; Node: 97 tests, 96 passed, one unconfigured SSH skip.
- Python: 68 tests, 64 passed, four unavailable optional-engine/GPU skips.
- Electron: QuTiP/native free dynamics, quarter-period cursor, cutoff-loss warning,
  invalid controls, cancellation retaining the last plot, no cancelled saved run,
  CSV/q-p SVG/manifest UI exports, input/mode restore and full-restart saved export;
  all preceding lab, persistence, sandbox and QVIS flows retained.
- Authenticated web and strict-CSP portable scene/browser regressions pass with
  no new oscillator compute permission or scene vocabulary.
- Atlas freeze/R1/R2–R5 report checks pass; prior static/legacy schema branches,
  definitions and the supplied roadmap reference remain unchanged.

Scientific tests cover real/complex coherent signs, nonzero time origin, full
period zero-point phase, Fock moments, projection probability from an independent
Poisson sum, cutoff improvement, no output/box renormalization, cancellation and
artifact collisions. Host tests reject malformed samples, non-finite amplitudes,
wrong phases/moments/diagnostics, hash corruption and rehashed scientific forgery.
Limits are the bounded free 1D model above, not acceptance of driven, parametric,
anharmonic, ND, arbitrary-state or physical-coordinate oscillators.
