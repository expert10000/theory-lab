# Desktop implementation

The original supplied roadmap is preserved in ROADMAP.md. QLAB-000 records the plan; QLAB-001–012 follow the supplied commit sequence.

The smoke laboratory uses normalized units (ħ = 1), H = (Δ σz + Ω σx)/2, and E± = ±hypot(Δ, Ω)/2. Ω is a static transverse coupling here, not a time-dependent drive.

Scope now includes a secure Electron/React shell, shared JSON Schema contracts, a supervised local Python process, QuTiP and native two-level spectrum/evolution, progress, cancellation, binary artifacts and numerical comparison. Persistent run manifests and book presets arrive in later roadmap milestones. No atoms, molecules, or crystals.

The two eigenvalues fit in the control-plane response. Evolution samples use a separate binary artifact referenced by JSON metadata and verified by SHA-256 in Electron main. Only actually implemented operations are advertised by capabilities.

Reference material: [Electron 44](https://www.electronjs.org/blog/electron-44-0), [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [QuTiP solver class](https://qutip.readthedocs.io/en/latest/guide/dynamics/dynamics-class.html), [NumPy eigvalsh](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eigvalsh.html), [SciPy DOP853](https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.DOP853.html).

## Completed milestones

- QLAB-000: preserved the user's complete roadmap in its own initial commit.
- QLAB-001: Electron 44.4.5, React 19.3, TypeScript workspace and sandboxed desktop boundary.
- QLAB-002: shared versioned draft-07 schemas, runtime validation, compatibility fixtures/tests.
- QLAB-003: Python supervision with hello, capabilities, health, shutdown, timeouts, crash diagnostics and explicit restart.
- QLAB-004: QuTiP 5.3.1 static two-level spectrum, parameter inspector, spectrum/Hamiltonian/roadmap tabs, analytic residual, stale result indicator, Desktop launcher and pinned setup dependencies.
- QLAB-005: driven two-level Schrödinger evolution, worker job manager, progress notifications, real cancellation, binary Float64 results, SHA-256 verification, React Dynamics preview and optional Layer-1 source IDs.
- QLAB-006: model registry for static two-level, driven two-level and Landau–Zener systems; metadata-driven controls/defaults, Python model builders, and provisional Volume VIII/chapter 58 tags. Landau–Zener uses H(t) = (vt + ε₀)σz/2 + gσx/2.
- QLAB-007: synchronized dynamics workspace with population/Pauli plot, Three.js Bloch sphere and full trajectory, exact-sample time cursor, state-vector readout and density matrix reconstructed from the same binary result row. A 2D projection remains available if WebGL is unavailable.
- QLAB-008: independent NumPy Hermitian eigenspectrum and SciPy DOP853 Schrödinger evolution for the existing two-level models. Both engines use the same versioned job/result contracts, artifact columns, SHA-256 verification and worker supervision; the native integrator leaves normalization untouched so drift can be measured.
- QLAB-009: QuTiP, Native and Compare controls for spectrum and dynamics; maximum energy/observable differences, norm drift, phase-independent state fidelity and runtime diagnostics; a Backend tab explaining process boundaries, methods, contracts and binary row layout.
- QLAB-010: Stückelberg double-passage model with smooth parabolic detuning and crossings at ±τ for zero bias, in QuTiP and native engines. Landau–Zener results now show the asymptotic survival formula alongside the finite-window result; both passages have contextual readouts.
- QLAB-011: strong-drive evolution plus a one-period Floquet propagator. Quasienergies are folded into the drive Brillouin zone, modes are phase-normalized, and a fixed 9×13 five-cycle transition map previews resonance structure. The Bloch–Siegert value A²/(16|Δ|) is expressly a weak-drive estimate, not a quantitative prediction at strong amplitude. The small map travels in JSON; general binary sweep artifacts remain QLAB-014.
- QLAB-012: atom-first Jaynes–Cummings and full quantum-Rabi Hamiltonians, QuTiP and independent NumPy engines, finite Fock cutoff, dressed spectrum, excited population, mean photon number, boundary occupation, norm and conserved parity. A distinct six-column binary artifact is SHA-256 verified. The Commit 691 `theory` QuTiP adapter supplies the JC basis convention and analytic vacuum-Rabi/dressed-splitting checks; Commit 687 maps the Landau–Zener reference. The linked example tree has no direct Floquet, Stückelberg or full quantum-Rabi code.

Validated on Windows with Node 24.19.0 and Python 3.12.2. Type checking, eighteen TypeScript tests, nineteen Python tests, and the real Electron end-to-end smoke test pass. The desktop test exercises both engines and Compare mode for static spectrum and evolution, the Backend tab, Landau–Zener and Stückelberg passages, Floquet analysis, Jaynes–Cummings and quantum Rabi, plot and slider selection, Bloch rendering, cancellation, stale data, restart, security preferences and compact layout. Screenshots are in the ignored artifacts directory.

The local Volume VIII Chapters 58–59 inspected on 2026-09-26 explicitly identify themselves as architecture-only placeholders, not validated scientific implementations. The separate `theory` development-branch QuTiP examples now provide relevant two-level and Jaynes–Cummings reference formulas, but the lab has not imported their code as a runtime dependency. Existing chapter-only tags remain provisional; explicit source IDs/presets are added only where mapped to a specific example. Current provenance is attached to each result but is not yet persisted; durable run directories remain QLAB-016. No standalone installer or Linux acceptance is claimed.
