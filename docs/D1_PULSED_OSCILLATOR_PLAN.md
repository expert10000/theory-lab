# D1-011–013 — bounded Gaussian drive pulses (planned)

Status: proposed next implementation sequence, not delivered. D1-001–010 remain
implemented. This extends the existing oscillator lab, typed contracts, worker
supervision and durable numerical pipeline; it creates no parallel architecture.

| Milestone | Proposed commit | Status |
| --- | --- | --- |
| D1-011 | `feat(worker): add bounded Gaussian oscillator pulses` | Planned |
| D1-012 | `feat(desktop): add pulse controls and oscillator convergence inspection` | Planned |
| D1-013 | `feat(lab): persist pulsed oscillator runs and record acceptance` | Planned |

## D1-011 — contracts and independent worker engines

Start with one declarative envelope, not user code or arbitrary expressions:

`epsilon(t)=epsilon0*exp[-(tau-tauCenter)^2/(2*sigma^2)]*exp[-i*nu*tau]`,
where `tau=t-tStart`, `sigma>0`, and `tauCenter` lies within the simulated
interval. Retain `H=omega*(N+1/2)+epsilon(t)*a†+conj(epsilon(t))*a`, hbar=1,
dimensionless q/p and the explicit omega/2 offset relative to the Atlas.
Report nonzero envelope tails at the interval endpoints; do not describe a
Gaussian restricted to a finite interval as an exactly compact pulse.

Before implementation, freeze limits for width, interval, amplitude, sample
count, internal integration work and artifact size. Retain the conservative
displacement bound `|alpha0|+integral |epsilon(t)| dt<=4`, using an upper bound
when validating inputs. Enforce solver resolution for narrow pulses rather
than relying on plotted time samples to resolve the Hamiltonian.

Add strict variants without changing any delivered static/free/monochromatic
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

Store the complete declarative envelope, solver settings, coefficients,
diagnostics and provenance; verify scientific content as well as hashes on
load and export. Add CSV/SVG/manifest export, optional backward-compatible
workspace settings and restart tests through existing mechanisms.

Extend the existing `driven_harmonic_oscillator` binding review only after
scientific acceptance. Do not add a duplicate Atlas entry or silently change
its current monochromatic preset. Pulse presets must be explicit Lab choices,
not inferred defaults for the Atlas's model-defined envelope. Preserve all
eleven current bindings and all 68 canonical definitions.

Run contract compatibility, worker, Electron restart/cancel/export, authenticated
web permission and independent scene regression checks. Publish implemented
status only after acceptance; retain every remaining G02 requirement.

## Boundaries retained

This proposal does not implement arbitrary waveforms, damping, parametric or
anharmonic/ND oscillators, arbitrary initial states or physical-length
calibration. Those goals remain planned. No web oscillator compute permission,
new QVIS vocabulary or Math3D change is included. Future visualization remains
`QuantumResult → QuantumScene → independent consumers`, not direct
Lab-to-Math3D worker calls.
