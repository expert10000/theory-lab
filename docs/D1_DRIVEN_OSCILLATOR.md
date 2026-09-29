# D1-008–010 — bounded monochromatic oscillator forcing

| Milestone | Delivery | Status |
| --- | --- | --- |
| D1-008 | Strict contracts, supervised worker, independent engines, analytic/finite reference checks | Implemented |
| D1-009 | Driven mode in existing Electron Oscillator lab | Implemented |
| D1-010 | Reviewed Atlas binding, durable runs/exports, restore and acceptance | Implemented |

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

## UI, Atlas and durable data

Open **Harmonic oscillator → Driven dynamics**. The existing stationary and free
modes remain available. Controls select finite Fock/coherent initial data, complex
drive amplitude, frequency, cutoff and sampling, with QuTiP/native comparison.
The computed-sample cursor synchronizes density, q/p and occupation; energy,
power, projection loss and truncation diagnostics remain visible. Cancellation
uses the existing supervised job lifecycle and does not save an incomplete run.

The reviewed `driven_harmonic_oscillator` binding loads this bounded mode.
Its epsilon0=0.2, nu=1 setting is an explicit Lab preset, not an Atlas default:
the canonical Atlas leaves its envelope model-defined. All ten preceding Atlas
bindings are tested against the pre-drive snapshot and remain unchanged.

Workspace restoration saves only inputs and the selected mode, never an
unverified computed plot. Completed runs retain their job, result, provenance
and checked numerical bytes independently of live worker artifacts. CSV exports
all columns; SVG exports q/p trajectories; the manifest preserves the energy
offset and drive parameters. Loading/exporting rechecks scientific content as
well as hashes, including rejecting tampered data with recomputed hashes.

## Acceptance

Automated checks cover resonance, detuned complex forcing, Fock/coherent inputs,
zero-drive coefficient phases, constant-drive energy, time-quadrature refinement,
finite-cutoff convergence, cancellation and schema compatibility. TypeScript
also independently checks the finite dynamics and durable artifact integrity.
The complete Node suite passes 100 tests (one opt-in SSH skip); the Python suite
passes 70 (four unavailable optional-engine skips). Electron acceptance exercises
Atlas loading, comparison, sample selection, cancellation, restoration, exports
and full restart alongside existing labs. Authenticated web and portable-scene
acceptance retain their existing permissions and scene vocabulary. The pinned
68-model Atlas and reconciliation/freeze reports pass deterministic checks.

## Delivery and continuation

Delivered in commits `af0d456` (D1-008 worker), `b578367` (D1-009 Electron UI)
and `2b90d3b` (D1-010 Atlas/durability/acceptance). D1-011–013 subsequently
implemented bounded Gaussian pulses, pulse/convergence controls and durable
acceptance; see
[D1_PULSED_OSCILLATOR_PLAN.md](D1_PULSED_OSCILLATOR_PLAN.md). The delivered
monochromatic contract and preset remain unchanged.
