# Desktop implementation

The original supplied roadmap is preserved in ROADMAP.md. This first slice is QLAB-000–004. QLAB-000 records the plan; QLAB-001–004 follow the supplied commit sequence.

The smoke laboratory uses normalized units (ħ = 1), H = (Δ σz + Ω σx)/2, and E± = ±hypot(Δ, Ω)/2. Ω is a static transverse coupling here, not a time-dependent drive.

Scope: a secure Electron/React shell, shared JSON Schema contracts, a supervised local Python process, and the QuTiP two-level spectrum. Dynamics, cancellation of long jobs, native comparison, large binary datasets, persistent run manifests, and book presets arrive in later roadmap milestones. No atoms, molecules, or crystals.

The two eigenvalues fit in the control-plane response. Large arrays must use a separate binary artifact channel when introduced. Only actually implemented operations are advertised by capabilities.

Reference material: [Electron 44](https://www.electronjs.org/blog/electron-44-0), [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [QuTiP Qobj](https://qutip.readthedocs.io/en/stable/apidoc/quantumobject.html).

## Completed milestones

- QLAB-000: preserved the user's complete roadmap in its own initial commit.
- QLAB-001: Electron 44.4.5, React 19.3, TypeScript workspace and sandboxed desktop boundary.
- QLAB-002: shared versioned draft-07 schemas, runtime validation, compatibility fixtures/tests.
- QLAB-003: Python supervision with hello, capabilities, health, shutdown, timeouts, crash diagnostics and explicit restart.
- QLAB-004: QuTiP 5.3.1 static two-level spectrum, parameter inspector, spectrum/Hamiltonian/roadmap tabs, analytic residual, stale result indicator, Desktop launcher and pinned setup dependencies.

Validated on Windows with Node 24.19.0 and Python 3.12.2. Type checking, six TypeScript tests, six Python tests, and the real Electron end-to-end smoke test pass. The desktop test exercises the actual worker, numerical values, invalid/stale inputs, degeneracy, restart, tabs, security preferences and compact layout. Screenshots are in the ignored artifacts directory. npm audit reports no known dependency vulnerabilities at validation time.

No Layer-1 repository or source manifests were supplied; the smoke model follows the explicit convention above and is validated against its analytic eigenvalues. Importing book models/presets remains QLAB-015. Current provenance is attached to each result but is not yet persisted; durable run directories remain QLAB-016. No standalone installer or Linux acceptance is claimed.
