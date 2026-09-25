# Desktop implementation

The original supplied roadmap is preserved in ROADMAP.md. QLAB-000 records the plan; QLAB-001–005 follow the supplied commit sequence.

The smoke laboratory uses normalized units (ħ = 1), H = (Δ σz + Ω σx)/2, and E± = ±hypot(Δ, Ω)/2. Ω is a static transverse coupling here, not a time-dependent drive.

Scope now includes a secure Electron/React shell, shared JSON Schema contracts, a supervised local Python process, the QuTiP two-level spectrum, and driven two-level evolution with progress, cancellation and binary artifacts. Native comparison, persistent run manifests and book presets arrive in later roadmap milestones. No atoms, molecules, or crystals.

The two eigenvalues fit in the control-plane response. Evolution samples use a separate binary artifact referenced by JSON metadata and verified by SHA-256 in Electron main. Only actually implemented operations are advertised by capabilities.

Reference material: [Electron 44](https://www.electronjs.org/blog/electron-44-0), [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [QuTiP Qobj](https://qutip.readthedocs.io/en/stable/apidoc/quantumobject.html).

## Completed milestones

- QLAB-000: preserved the user's complete roadmap in its own initial commit.
- QLAB-001: Electron 44.4.5, React 19.3, TypeScript workspace and sandboxed desktop boundary.
- QLAB-002: shared versioned draft-07 schemas, runtime validation, compatibility fixtures/tests.
- QLAB-003: Python supervision with hello, capabilities, health, shutdown, timeouts, crash diagnostics and explicit restart.
- QLAB-004: QuTiP 5.3.1 static two-level spectrum, parameter inspector, spectrum/Hamiltonian/roadmap tabs, analytic residual, stale result indicator, Desktop launcher and pinned setup dependencies.
- QLAB-005: driven two-level Schrödinger evolution, worker job manager, progress notifications, real cancellation, binary Float64 results, SHA-256 verification, React Dynamics preview and optional Layer-1 source IDs.

Validated on Windows with Node 24.19.0 and Python 3.12.2. Type checking, nine TypeScript tests, nine Python tests, and the real Electron end-to-end smoke test pass. The desktop test exercises both real calculations, cancellation, stale data, restart, security preferences and compact layout. Screenshots are in the ignored artifacts directory.

No Layer-1 repository or source manifests were supplied; the smoke model follows the explicit convention above and is validated against its analytic eigenvalues. Importing book models/presets remains QLAB-015. Current provenance is attached to each result but is not yet persisted; durable run directories remain QLAB-016. No standalone installer or Linux acceptance is claimed.
