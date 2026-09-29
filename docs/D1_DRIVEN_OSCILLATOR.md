# D1-008–010 — bounded monochromatic oscillator forcing

| Milestone | Delivery | Status |
| --- | --- | --- |
| D1-008 | Strict contracts, supervised worker, independent engines, analytic/finite reference checks | Implemented |
| D1-009 | Driven mode in existing Electron Oscillator lab | Planned |
| D1-010 | Reviewed Atlas binding, durable runs/exports, restore and acceptance | Planned |

Static and free motion remain unchanged. This is a bounded subset of the
Atlas's general complex envelope, not a pulse/source-code interpreter:

`H_lab(t)=omega*(N+1/2)+epsilon(t)*a†+epsilon(t)*conjugate*a`,
where `epsilon(t)=epsilon0*exp(-i*nu*(t-tStart))`, hbar=1. The Atlas instead
writes `omega*N`; Lab energies add omega/2 and states gain the global phase
exp(-i*omega*tau/2). Phase is retained in coefficients, not silently discarded.
q,p are dimensionless, not physical position/momentum calibrated by mass.

Initial Fock n or normalized finite coherent projection uses the free lab's
existing conventions. No output or finite-box renormalization. Bounds: omega
.1–5; cutoff 8–64; n 0–10 below cutoff−1; |alpha|≤2; |epsilon0|≤.5; nu 0–5;
0<duration≤20, omega*duration≤50, |alpha|+|epsilon0|*duration≤4. This last bound
limits displacement conservatively, not a convergence guarantee. Sample count
3–1001; odd q grid 101–401, extent 2–12, start/stop within ±100.

Native independently diagonalizes the finite rotating Hamiltonian
`H_rot=(omega-nu)*N+omega/2+epsilon0*a†+conjugate(epsilon0)*a`, then multiplies
by exp(-i*nu*N*tau). QuTiP independently integrates the laboratory Hamiltonian
using QobjEvo/SESolver, normalize_output=False, atol=1e-12, rtol=1e-10.
See the [QuTiP time-dependent solver guide](https://qutip.readthedocs.io/en/stable/guide/dynamics/dynamics-time.html).

Full-space displacement solves dβ/dt=-i*omega*β-i*epsilon(t):
`d=-i*epsilon0*tau*exp[-i*(omega+nu)*tau/2]*sinc[(omega-nu)*tau/2]`,
with sinc(x)=sin(x)/x, sinc(0)=1. β=alpha exp(-i*omega*tau)+d.
Full reference q/p are sqrt(2) times Re/Im β; occupation is |β|² for coherent
input or n+|d|² for Fock input. Full reference density is a shifted Gaussian
or shifted Hermite number density. These are not the same as a poorly truncated
coherent projection or finite driven model. Boundary/occupation/reference errors
are reported, including accumulated drive truncation even when initial loss=0.

The existing job coordinator transports `oscillator_drive` through quantum.start,
progress, cancel and hash-checked artifacts. Strict job/result branches append
to v1; every preceding branch/definition is fingerprint-tested at 8b94cfa.
`quantum-driven-oscillator-data/v1` is row-major f64le, at most 1,129,128 bytes:
the free lab's first ten columns, then number_exact, energy, power, then complex
Fock coefficients. Energy is conditional <H_lab(t)>; power is <∂H_lab/∂t>.
Energy is not conserved under the rotating drive: maxWorkBalanceError compares
E(t)-E(0) with trapezoidal integrated supplied power. It includes sampling
quadrature error, not merely solver drift; refining time samples improves it.
Constant drive nu=0 has power=0 and conserves the total Hamiltonian energy,
not necessarily occupation. There is no dissipative/steady-state claim.

Host scientific checking independently applies a scaled 12th-order exponential
Taylor action to the tridiagonal rotating Hamiltonian, ||H dt||≤.25, without
normalization. It checks coefficient phase/dynamics, q/p variances and occupation,
full references, energy/power and diagnostics with 2e-6 relative/absolute tolerance,
in addition to byte/hash checks. It does not infer correctness from QuTiP/native
agreement alone. Variances use finite projected q/p operators, as in free motion.
No arbitrary envelope, parametric/anharmonic/ND solver, new scene vocabulary,
web compute permission or Math3D connection is introduced.
