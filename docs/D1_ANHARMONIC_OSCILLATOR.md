# D1-020–022 · bounded quartic anharmonic oscillator

Status: implemented in the existing Electron Oscillator lab. This is a
desktop-only, finite-basis static spectrum, not a spatial-grid or time-domain
solver.

## Hamiltonian and bounds

The Atlas formula is `H = p²/(2m) + mω²x²/2 + λx⁴`. This Lab path explicitly
sets `m=1`, `ℏ=1`, `0.5≤ω≤3`, `0≤λ≤0.2`, a harmonic Fock cutoff `8–32`, and
reports `3–6` levels while leaving at least two unreported boundary states.
With `x=(a+a†)/sqrt(2ω)`, both engines diagonalize
`ω(N+1/2)+λx⁴` in the finite basis. The quartic matrix is the fourth power
of the truncated x matrix; at finite cutoff this is not identical to
projecting the continuum x⁴ operator. Cutoff sensitivity is therefore
reported explicitly and never claimed to establish infinite-basis
convergence by itself. Only the nonnegative confining branch is enabled; no
double well, unstable negative quartic, multidimensional or mass sweep is
inferred.

QuTiP constructs Qobj operators and uses its Hermitian eigensolver; native
SciPy builds the matrix independently and uses `scipy.linalg.eigh`. Results
include the low eigenvalues and full real Fock coefficients for those states.
The host independently rebuilds the matrix and checks residuals,
orthonormality, ordering, ground parity, `⟨x²⟩`, `⟨x⁴⟩` and the harmonic
zero-point reference. `λ=0` recovers the harmonic ladder. The UI shows
level shifts, moments, an engine comparison and an N→N+8 same-engine study
for N≤24.

## Durability and boundaries

Saved runs retain jobs, eigenpairs, moments and provenance. Reopening repeats
scientific verification after hash checks; CSV exports energy shifts, SVG
exports the ladder, and manifest exports the provenance. Workspace restore
recovers only controls and the selected oscillator mode, never computed
eigenpairs. No automatic Atlas load preset was added: the general Atlas
entry permits other masses and bases, while this is an explicitly restricted
Lab choice. The previous eleven bindings and all 68 Atlas definitions remain.
There is no new web compute route, scene vocabulary or Math3D connection.

## Acceptance

Tests preserve preceding protocol branches; compare QuTiP/native and
cutoffs; check the harmonic limit; reject a rehashed but scientifically
altered saved spectrum; exercise exports and strict optional workspace
inputs. Electron smoke covers calculation, comparison, cutoff study and
input-only restoration, alongside the existing regressions.
