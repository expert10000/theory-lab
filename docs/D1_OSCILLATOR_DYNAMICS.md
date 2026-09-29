# D1-005–007 — bounded free oscillator motion

This extends D1-001–004; the stationary lab and its Atlas binding remain intact.
No driven/anharmonic/ND Hamiltonian, web compute permission, scene vocabulary or
Math3D connection is introduced.

| ID | Delivery | Status |
| --- | --- | --- |
| D1-005 | Append-only contracts, supervised worker, independent engines and scientific binary checks | Implemented |
| D1-006 | Electron dynamics controls, moving density, time cursor and comparison/cancellation | Implemented |
| D1-007 | Durable dynamics, exports, restoration, regression and roadmap acceptance | Planned |

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
