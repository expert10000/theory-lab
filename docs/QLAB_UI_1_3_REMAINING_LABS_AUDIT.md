# QLAB-UI-1–3 remaining-lab audit

Status (2026-10-03): this preserves the baseline gaps before the Transmon, Ising,
final-population sweep, SSH/QWZ topology, orbital and oscillator adapters, then tracks their delivery below. It does not change physics
or imply a new worker operation. UI-1–3 are now implemented for the currently reachable labs. Sources of truth are `packages/contracts/index.ts`,
`apps/desktop/main/runs.ts`, and the corresponding renderer labs.

| Lab | Saved result | Audit-baseline linked-view gap | Safe adapter boundary |
| --- | --- | --- | --- |
| Transmon circuit | Inline `CircuitResult`: GHz energies, transitions, charge matrix-element magnitude and ncut+2 E₀₁ drift. No eigenvectors or charge-basis amplitudes. | Runs exports but cannot reopen it; no exact-run level selection or run inspector. | Reopen the hash-verified inline result; select a stored level; show inputs, transitions, cutoff diagnostic and provenance. Do not offer an eigenstate view. |
| Ising chain | Inline `ManyBodyResult`: low energies, finite-size gap, site magnetizations and half-chain entropy. No full ground-state vector. | Runs exports but cannot reopen it; plotted levels and sites have no run-scoped selection or inspector. | Reopen the verified result; select a stored level or site magnetization; show finite-chain inputs, ground-state summaries and provenance. Do not reconstruct a wavefunction. |
| Evolution sweep | Binary `SweepResult`: a bounded x/y grid of final population, with cache metadata. The separate two-level energy study already links verified spectrum-point runs. | The final-population heatmap has a local cell cursor, but no saved-run reopening or exact-run cell context. | Design a run-scoped cell selection with axes, final P₁, cache and engine; a grid point is not a saved evolution trajectory. |
| SSH/QWZ topology | Inline `TopologyResult`: sampled bands, winding/edge or Berry/Chern/gap analyses. No generic eigenvectors. | No Runs reopening or shared exact-run k/mesh selection in the desktop topology lab. | Use SSH k/edge and QWZ mesh/band adapters separately; preserve undefined invariant states at gap closure and source-grid resolution caveats. |
| Hydrogenic orbital | Binary complex-grid `OrbitalResult` plus radial, normalization and energy analyses; scene export already uses the verified run. | Field and radial views are not joined to a saved-run breadcrumb/reopening and typed sample selection. | Scope grid/radial/scene selection to a verified run and preserve basis and grid geometry; avoid inventing analytic wavefunction samples beyond saved data. |
| Oscillator family | Static harmonic and quartic results are inline and include their declared state/coefficients; motion, drive, pulse, damped and parametric results use distinct binary schemas and diagnostics. | Several local modes share one workspace but not one result shape; no universal run-scoped reopening/inspector across modes. | Audit each operation separately. Static eigenstate selection may use stored amplitudes; time-series adapters may show only their declared columns. Never apply a single generic state claim to all modes. |

All listed jobs already persist through the run store. `RunStore.load` checks
the job/result metadata hashes, contract identity and any artifact SHA-256;
operation-specific checks exist for topology, orbital and oscillator variants.
At the audit baseline, the Runs UI offered verified reopening for the two-level spectrum,
four evolution models, two cavity models and Lindblad. A comparison run, when requested, saves
separate results and must not be fabricated or implicitly reattached when
reopening either source run.

Delivery overlay (2026-10-03): Transmon and Ising now have hash-verified
inline reopening, exact-run level/site selection, draft-versus-stored
inspectors, provenance and restart/tamper tests. Neither adapter invents an
eigenvector, full ground-state vector or saved comparison partner.
Final-population sweeps now reopen verified binary grids from Runs, with one
run-scoped point/cell selection for both 1D and 2D. The inspector shows
stored axes, selected final `P₁`, cache details, engine and provenance while
keeping edited drafts separate. A cell is not a saved time trajectory. The
SSH/QWZ topology now reopens verified inline results, selects exact-run
periodic-band samples, finite-chain edge sites or QWZ curvature mesh cells,
and inspects stored diagnostics and provenance. It withholds a QWZ cell and
invariant at gap closure and labels unresolved meshes; optional band energies
appear only if recorded. The orbital row now has hash-verified reopening,
run-scoped complex-grid voxel and saved radial selections, and an inspector
that retains stored geometry, basis, normalization and provenance. The
oscillator row now covers all seven saved operations. Static harmonic energy
selection does not imply a spatial state for an uncomputed level; the quartic
adapter reports stored Fock coefficients without claiming a spatial
wavefunction. Free, driven, pulse, damped and parametric time cursors address
only their own binary columns. Damped density-matrix columns are genuinely
stored; no other mode inherits them. Each operation reopens from Runs, names
its saved run in the breadcrumb and distinguishes immutable inputs from drafts.

Acceptance for each adapter is the same: a breadcrumb naming the exact saved
run, a selection that rejects another run or missing item, immutable stored
inputs distinguished from the draft, explicit unavailable-state language,
and restart/tamper coverage. The remaining rows now have those model-specific
designs and acceptance evidence, including full Electron restart and forged
inline/binary oscillator rejection. UI-1–3 are **Implemented for the currently
reachable desktop labs**. New physics will need explicit adapters rather than
assuming a universal state or result shape.
