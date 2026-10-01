# D1-017–019 · stable parametric oscillator

Status: implemented in the existing Electron/React Oscillator lab. This is a
bounded, desktop-only extension; it does not create a second worker or a new
visualization contract.

## Scientific scope

With ℏ = 1 and dimensionless quadratures q = (a+a†)/√2 and
p = (a−a†)/(i√2), the finite-Fock Hamiltonian is

`H = ω(a†a + 1/2) + (λ a†² + λ* a²)/2`.

The initial state is vacuum. λ is constant and may be complex. The stable
branch is restricted to `|λ| < 0.9ω`, `0.1 ≤ ω ≤ 5`, Fock cutoff `8–40`,
duration at most 20, `ω·duration ≤ 50`, `|λ|·duration ≤ 8`, and `3–301`
samples. QuTiP evolves the finite-basis state; native SciPy diagonalizes the
same Hermitian matrix and applies spectral phases. The analytic
Bogoliubov frequency is `sqrt(ω²−|λ|²)` and provides an infinite-space
reference, not a replacement for cutoff convergence.

The worker writes nine time/readout values followed by every complex Fock
coefficient at each sample. The host independently propagates these
coefficients and checks moments, norm, parity, boundary occupation, artifact
size/hash and submitted-job/result consistency before saving or exporting.
The UI compares QuTiP/native occupation and variances and offers an N→N+8
study for N≤32. A single cutoff comparison does not establish convergence.

The Atlas entry omits the zero-point term; the Lab adds `ω/2` times identity
and reports this offset. No automatic Atlas load binding was enabled: the
generic Atlas entry does not specify vacuum input, finite cutoff or a
laboratory time interval. The eleven previously reviewed bindings are
unchanged.

## Persistence and boundaries

Saved runs contain the submitted job, result, hash-verified binary series and
manifest. Reopening verifies physics again, not only hashes. CSV includes all
readouts and amplitudes; SVG plots q/p variances; manifest retains provenance.
Workspace snapshots restore only inputs and selected oscillator mode, never a
computed trajectory. There is no web compute route, new scene type or direct
Math3D connection. Unstable pumping, arbitrary initial states, time-varying
λ, multimode/anharmonic/ND oscillators remain planned.

## Acceptance

Contract append-only fingerprints cover preceding job/result branches.
Supervised native and QuTiP runs are checked against each other and the
stable Bogoliubov reference; a numerically altered, rehashed run must fail
the independent propagation check. Desktop smoke covers run, comparison,
cutoff study and input-only restore. Standard typecheck, unit, worker, web,
scene, desktop and Atlas gates complete acceptance.
