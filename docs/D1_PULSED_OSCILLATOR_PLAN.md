# D1-011–013 — bounded Gaussian drive pulses

Status: D1-011–013 implemented at the bounded scope recorded below. This
historical plan now also records delivery and acceptance; its broader goals
remain unchanged.
D1-001–010 remain implemented. This extends the existing oscillator lab, typed
contracts, worker supervision and durable numerical pipeline; it creates no
parallel architecture.

| Milestone | Commit sequence | Commit | Status |
| --- | --- | --- | --- |
| D1-011 | `feat(worker): add bounded Gaussian oscillator pulses` | `cae4615` | Implemented |
| D1-012 | `feat(desktop): add pulse controls and oscillator convergence inspection` | `90d17bc` | Implemented |
| D1-013 | `feat(lab): persist pulsed oscillator runs and record acceptance` | `e9bdede` | Implemented |

## D1-011 — contracts and independent worker engines

Delivered worker bounds: width .05–5, center within elapsed interval, maxStep
.001–.05 and <=width/8, duration/maxStep<=20000. Retain duration<=20,
omega .1–5, omega*duration<=50, |epsilon0|<=.5, cutoff 8–64, initial |alpha|<=2
or n<=10 below cutoff−1, samples 3–1001 and the existing odd plotting grid.
Validation uses `|alpha|+|epsilon0|*min(duration,sqrt(2*pi)*width)<=4`.
The maximum artifact is 1,129,128 bytes in
`quantum-pulsed-oscillator-data/v1`: the same 13 moment/reference/energy/power
columns followed by complex coefficients. The new `oscillator_pulse` branch
leaves every previously delivered schema branch and definition unchanged.

Native uses SciPy DOP853; QuTiP uses lab-frame SESolver with its own Verner9
integrator, avoiding the SciPy/Fortran callback exception wrapper. Both retain
raw output, rtol=1e-10, atol=1e-12 and bounded internal steps independent of
plotted samples.
Displacement uses adaptive scalar quadrature with explicit peak breakpoints.
The host independently checks finite coefficients with interaction-picture RK4
and displacement with composite Simpson quadrature, without renormalization.
Endpoint envelopes and envelope-derivative power are verified alongside moments,
phases, finite/full-reference discrepancies and sampled work. Gaussian tails are
not silently dropped or renormalized. Cancellation removes partial artifacts.
Integration work has a hard ceiling of 1,000,000 native RHS or QuTiP coefficient
evaluations per job. Exhaustion fails without a published artifact. Results
explicitly record `qutip-vern9` or `scipy-dop853`, fixed rtol/atol and evaluation
count; these method/tolerance fields are checked and retained in exports.

Start with one declarative envelope, not user code or arbitrary expressions:

`epsilon(t)=epsilon0*exp[-(tau-tauCenter)^2/(2*sigma^2)]*exp[-i*nu*tau]`,
where `tau=t-tStart`, `sigma>0`, and `tauCenter` lies within the simulated
interval. Retain `H=omega*(N+1/2)+epsilon(t)*a†+conj(epsilon(t))*a`, hbar=1,
dimensionless q/p and the explicit omega/2 offset relative to the Atlas.
Report nonzero envelope tails at the interval endpoints; do not describe a
Gaussian restricted to a finite interval as an exactly compact pulse.

The delivered limits freeze width, interval, amplitude, sample count, internal
integration work and artifact size. Retain the conservative
displacement bound `|alpha0|+integral |epsilon(t)| dt<=4`, using an upper bound
when validating inputs. Enforce solver resolution for narrow pulses rather
than relying on plotted time samples to resolve the Hamiltonian.

Strict variants were added without changing any delivered static/free/monochromatic
job or result branch. QuTiP integrates the laboratory Hamiltonian; the native
engine independently integrates the finite Fock coefficients with explicit
error tolerances. The constant rotating-frame eigensystem alone is no longer
a solution for a changing envelope. Reuse progress, cancellation and bounded
hash-checked binary artifacts. Retain initial-projection and no-output-
renormalization conventions.

Independently verify full-space displacement with controlled quadrature:

`beta(tau)=alpha0*exp[-i*omega*tau]-i*integral_0^tau exp[-i*omega*(tau-s)]*epsilon(s) ds`.

Use both analytic reference moments and an independent finite-model check:
finite cutoff dynamics can disagree with the full-space reference without
implying solver failure. Energy and power must use the time-dependent envelope
and its derivative; retain the sampled-work quadrature caveat. Acceptance
includes zero amplitude, complex forcing, pulse-width/time-step refinement,
finite-cutoff convergence, phase conventions and cancellation cleanup.

## D1-012 — pulse mode in the existing Electron lab

Delivered UI: **Harmonic oscillator → Gaussian pulse** shares the existing
forced-oscillator controller, verified readouts and density/trajectory/occupation
plots. Width, elapsed center and maximum solver step have explicit controls;
the drive plot distinguishes the declared analytic field from computed states.
Its marker shares the computed-sample cursor. Endpoint tails are visible.

The bounded study uses one engine at identical observation times: N→N+8, then
maxStep→maxStep/2 with N fixed. It reports q/p/number differences and
phase-independent coefficient infidelity, with a separate initial-projection
change. It requires N<=56 and a valid refined step. Engine Compare selects
QuTiP for this same-engine study; normal runs retain QuTiP/native comparison.
Failures/cancellation retain the last verified plots/study with stale labels.
Windows Electron acceptance verifies these paths and all preceding labs.

Add envelope width/center controls, a clearly labelled drive plot, shared
computed-sample selection, density/q-p/occupation, energy/power and comparison.
Keep stationary, free and monochromatic modes available. Display endpoint
tails, projection loss and boundary occupation. Invalid or unresolved narrow
pulses must give actionable feedback rather than a plausible-looking plot.

Add bounded cutoff/time-resolution comparisons using the same physical pulse
and observation times. Distinguish changing initial coherent projection from
changing propagation accuracy. Preserve previous verified results on failed
or cancelled comparisons; never present a convergence tolerance as proof of
the entire infinite-dimensional solution.

## D1-013 — durability, review and acceptance

Delivered: verified pulse coefficients, declarative Gaussian parameters,
integration settings/count, tails, energy/power/work diagnostics and provenance
survive independently of live worker artifacts. CSV exports every column; SVG
exports q/p trajectories; manifest export includes the complete job/result.
Load/export verifies scientific content as well as hashes, including a forged
global coefficient phase with recomputed byte and metadata hashes. Invalid
data is rejected before creating a new durable run directory.

Optional `oscillatorPulse` workspace inputs and `pulse` mode remain compatible
with old snapshots. Restore never fabricates a computed plot or convergence
study. All eleven Atlas bindings are fingerprinted against `85ac21f` and remain
unchanged. The existing driven binding still loads monochromatic mode; the
separate **Load Gaussian Lab preset** button selects width=1, center=5,
duration=10, epsilon0=.2, nu=1 and maxStep=.02. These are explicit Lab choices,
not canonical Atlas defaults or a duplicate binding. The existing scientific
mapping review records this additional bounded subspace without reducing G02.

Completed runs store the complete declarative envelope, solver settings, coefficients,
diagnostics and provenance; verify scientific content as well as hashes on
load and export. Delivery includes CSV/SVG/manifest export, optional backward-compatible
workspace settings and restart tests through existing mechanisms.

The existing `driven_harmonic_oscillator` binding review was extended after
scientific acceptance, without a duplicate Atlas entry or any change to
its monochromatic preset. Pulse presets must be explicit Lab choices,
not inferred defaults for the Atlas's model-defined envelope. Preserve all
eleven current bindings and all 68 canonical definitions.

Acceptance recorded on 2026-09-29 for the delivery commits above: 182 tests
passed (105 Node and 77 Python); five were skipped (one opt-in SSH and four
unavailable optional-engine tests). Tests cover resonance, detuned complex
forcing, Fock/coherent states, a narrow pulse between observation times,
zero-drive phase, nonzero time origin, envelope-derivative power, work sampling,
cutoff/solver-step refinement, integration-budget exhaustion and cancellation.
Typecheck, Electron pulse/old-lab/restart/export acceptance, authenticated web
and independent scene regression gates pass. Desktop acceptance uses a fresh
temporary profile through `QLAB_TEST_PROFILE`; ordinary launches keep the
existing user-data location. Reports and pinned 68-entry Atlas checks remain
deterministic. No web oscillator computation or scene adapter is enabled.

## Boundaries retained

This delivery does not implement arbitrary waveforms, damping, parametric or
anharmonic/ND oscillators, arbitrary initial states or physical-length
calibration. Those goals remain planned. No web oscillator compute permission,
new QVIS vocabulary or Math3D change is included. Future visualization remains
`QuantumResult → QuantumScene → independent consumers`, not direct
Lab-to-Math3D worker calls.
