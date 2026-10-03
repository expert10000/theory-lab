# QLAB-UI-1–3 remaining-lab audit

Status (2026-10-03): this records the baseline gaps before the Transmon, Ising
and final-population sweep adapters, then tracks their delivery below. It does not change physics,
imply a new worker operation, or declare UI-1–3 complete. Sources of truth are `packages/contracts/index.ts`,
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
three remaining rows—SSH/QWZ topology, orbital and oscillator—still require
model-specific design and acceptance work; topology is next.

Acceptance for each adapter is the same: a breadcrumb naming the exact saved
run, a selection that rejects another run or missing item, immutable stored
inputs distinguished from the draft, explicit unavailable-state language,
and restart/tamper coverage. UI-1–3 remain **Partial** until the other rows
receive their own designs and acceptance evidence.
