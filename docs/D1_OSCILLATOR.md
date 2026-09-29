# D1 — additive standalone harmonic oscillator

R2–R5 were pushed at `4159d2e`. This extension preserves all 68 Atlas entries,
existing labs, scene vocabulary and original job/result branches. The historical
R5 freeze is retained in `packages/atlas/fixtures/reconciliation-r5.v1.json`;
legacy scientific protocol fingerprints are tested independently.

| Commit | Scope | Status |
| --- | --- | --- |
| D1-001 | Bounded oscillator contracts, typed model and compatibility | Implemented |
| D1-002 | Native/QuTiP Fock engines and worker protocol | Planned |
| D1-003 | Electron controls, stationary-state plots and persistence | Planned |
| D1-004 | Reviewed Atlas binding, acceptance and release gate | Planned |

The first lab computes `H = omega (N + 1/2)`, with hbar = 1, low energies,
stationary real Hermite amplitudes and density. Position is the dimensionless
quadrature q, not a physical length. The canonical Atlas supplies omega; cutoff,
selected number state and plot sampling are explicit Lab choices.

Both engines use their own Fock operators for energies and quadrature moments.
The Hermite plot is shared analytic postprocessing, not an independent grid
solver comparison. No finite-box renormalization is applied. Changing the Fock
cutoff leaves low energies exactly unchanged for this Hamiltonian; that is not
evidence that arbitrary oscillator problems have converged.

Driven/anharmonic/multidimensional oscillators, physical length calibration,
arbitrary initial states, web computation and oscillator 3D scenes remain future
additive work. No Math3D changes or direct worker connection are introduced.
