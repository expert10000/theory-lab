# D1 — additive standalone harmonic oscillator

R2–R5 were pushed at `4159d2e`. This extension preserves all 68 Atlas entries,
existing labs, scene vocabulary and original job/result branches. The historical
R5 freeze is retained in `packages/atlas/fixtures/reconciliation-r5.v1.json`;
legacy scientific protocol fingerprints are tested independently.

| Commit | Scope | Status |
| --- | --- | --- |
| D1-001 | Bounded oscillator contracts, typed model and compatibility | Implemented |
| D1-002 | Native/QuTiP Fock engines and worker protocol | Implemented |
| D1-003 | Electron controls, stationary-state plots and persistence | Implemented |
| D1-004 | Reviewed Atlas binding, acceptance and release gate | Implemented |

Continuation D1-005–007: [free oscillator dynamics](D1_OSCILLATOR_DYNAMICS.md).
The following scope/acceptance records the original static release.

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

## Acceptance — Windows, 2026-09-29

- Typecheck and production Electron/web/gateway build pass.
- Node tests: 93 tests, 92 passed, one unconfigured SSH test skipped.
- Python tests: 62 tests, 58 passed, four unavailable optional-engine/device
  tests skipped (Dynamiqs GPU, QuSpin and scqubits).
- Electron acceptance: secure preload/IPC, Atlas → oscillator, independent
  engine comparison, exact zero-point energy, n=2 quadratures, invalid-grid
  rejection, stale labeling, stationary plots, saved runs/exports, workspace
  restoration and full restart. All prior lab/scene flows are exercised too.
- Authenticated web and independent strict-CSP scene acceptance pass. The web
  catalog describes the new binding as desktop-only; the gateway still rejects
  oscillator compute requests. Existing web controls remain available.
- Pinned Atlas source, deterministic reports and metadata freeze checks pass.
  Catalog digest unchanged; all historical R5 entries except the newly accepted
  oscillator are identical. Original job/result branches and definitions are
  fingerprint-tested, not merely assumed compatible.

Open **Oscillator** in the desktop tabs or **Harmonic oscillator** in the left
sidebar. The Atlas entry **Quantum harmonic oscillator** also loads it. The
Roadmap shows D1-001–004, and Backend documents the method/inline format.
Saved runs offer CSV data, a spectrum SVG and JSON manifest/provenance.

Reproduce with `npm run typecheck`, `npm test`, `npm run test:worker`,
`npm run test:desktop`, `npm run test:web`, `npm run test:scenes`, and the
`sync-atlas`, `freeze-atlas`, `report-atlas`, `report-reconciliation` check
scripts recorded in the reconciliation report. Screenshots are local acceptance
artifacts, not source-controlled scientific results.
