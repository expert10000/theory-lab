# Rice–Mele filled-band pump study

The static Rice–Mele job remains a separate fixed-parameter calculation. Select **Topology → Topological bands → Rice–Mele · filled-band pump** for a closed cycle. The model uses

\[
t_1(\theta)=b+m\cos\theta,\quad t_2(\theta)=b-m\cos\theta,\quad
\Delta(\theta)=d_0+a\sin\theta,\quad 0\leq\theta<2\pi.
\]

Both hoppings must stay positive. The worker diagonalizes the two-band Bloch Hamiltonian on bounded periodic \((\theta,k)\) grids and saves exact sampled levels, hopping/staggering values, FHS plaquette phases, and the occupied-band Wilson polarization at each cycle phase. It checks the minimum bulk gap analytically, repeats the calculation on a doubled grid, and compares occupied Chern with the separately accumulated polarization winding. Both periodic seams are included. A closed gap or unresolved mesh sets both public invariants to **undefined**. The saved status and coarse/fine diagnostics explain why.

The conditional topological claim is an **ideal adiabatic cycle with the lower band filled**. A separately requested finite-speed run uses the same cycle but has its own duration and integration resolution. Its recorded transported charge is not labelled quantized. An optional finite open-chain branch records boundary motion separately. Partially filled-band response is not calculated.

Runs store the exact job and result with SHA-256 verification. The topology inspector links a selected phase and momentum to the stored energies, local plaquette phase, and Wilson polarization. Scenes exports a source-linked, read-only `.qscene` containing both supplied band meshes and exact diagnostic samples. The existing `quantum-scene/v1` band-grid metadata is bounded to 31 per axis, so this adapter keeps its 32×32 or finer band data as verified mesh objects without downsampling or changing the frozen contract.

The source Atlas entry remains `rice_mele`; this is a bounded executable cycle built on that model, not a new Atlas entry or a change to the static model's historical binding.

The pinned Math3D acceptance fixture is reproduced by running
`npx tsx scripts/export-rice-mele-pump-fixture.ts <existing-output-directory>`.
In Math3D, open **File → Verified quantum examples → Rice–Mele → filled-band
pump**, or open the exported `.qscene` folder directly. Math3D re-verifies
source bytes for selection and computes no pump physics.

## Finite-speed filled-band run

In Topological bands, enter a **Cycle duration** from 10 to 400 to enable finite-speed evolution, and set 4–64 unitary steps per saved phase. Leave duration blank for the original ideal-only calculation. Both routes keep the static Rice–Mele chain separate. The worker initializes the lower Bloch band at every periodic momentum, propagates each two-component spinor with a midpoint unitary step (ℏ=1), and records electron current as `−⟨∂H/∂k⟩`. A midpoint time integral of its Brillouin-zone average gives transported charge per cell.

The immutable result stores the exact time/phase and momentum samples, total and momentum-resolved currents, cumulative charge, excited-band population, norm drift, and time-step and momentum-grid charge drift. The run is marked `resolved` only when both charge drifts are below 0.02 and the maximum norm drift is below 10⁻⁸. A closing cycle gap is labelled `gap-closed`; the finite-speed charge remains a recorded dynamical value, never a quantized invariant. A separate ideal Chern reference is shown only when the static gap and mesh checks resolve. The source run can be reopened by its hash; the plot and inspector use run-scoped exact-sample selection. CSV export includes the numerical trace.

The independent acceptance test solves the same time-dependent Bloch equation with SciPy's adaptive IVP integrator. It checks current integration and norm, reversal of cycle orientation, and approach to the ideal filled-band Chern at slower speed. No finite-chain edge trajectory is inferred from periodic-bulk current.

Export a verified finite-speed run from **Scenes → Export scene bundle**, or
reproduce the pinned fixture with
`npx tsx scripts/export-rice-mele-finite-fixture.ts <existing-output-directory>`.
The separate `.qscene` carries exact saved time samples for current, charge,
excited-band population and momentum-resolved current. In Math3D, open
**File → Verified quantum examples → Rice–Mele → finite-speed pump**. The
read-only inspector verifies source bytes at open and selection; it performs
no evolution or transport calculation.

## Finite open-chain motion

Set **Cycle duration**, **Unitary steps per saved phase**, and **Open-chain cells** (4–10) in **Topology → Topological bands → Rice–Mele · filled-band pump**. Leaving the cell field empty preserves the periodic bulk-only job. The open chain has `2 × cells` sites and no end-to-end bond. At half filling, the worker evolves all initially occupied single-particle orbitals through the same recorded cycle. This is a finite noninteracting chain, not an edge-channel classification.

The immutable run stores exact time and phase values, particle density on every site, electron current on every open bond, accumulated central-bond charge, and populations of the outer two sites at each end. It also stores occupied-subspace norm drift, particle-number drift, continuity residual, integration-step charge drift, and charge drift when the width increases by two cells. The status is **resolved**, **size-sensitive**, or **unresolved** according to those checks; a width-sensitive result is never silently treated as converged. The periodic ideal invariant and finite-speed bulk charge remain separate result sections with different units.

The plot and site buttons use one run-scoped time/site selection. Reopening a saved run verifies its hash and starts with no invented selection. CSV includes exact time, site, and bond samples. The scene export carries only those source-backed arrays, units, and diagnostics. In Math3D, use **File → Verified quantum examples → Rice–Mele → finite open-chain motion**, or open the exported `.qscene` folder. Math3D re-verifies source bytes on selection and after restart, and computes no dynamics.

## Linked bulk–chain view and bounded convergence study

A saved run containing both finite-speed periodic and open-chain traces has a linked **Bulk–chain comparison** in **Topology → Topological bands → Explore**. Its one run-scoped time cursor shows periodic current and accumulated charge beside central-bond current and charge, edge populations, and a selected site's density. The inspector reports exact recorded values and diagnostics. The two charges have distinct units and meanings; the view does not assert equality or a finite-chain topological invariant. Exporting that run's standard `.qscene` carries the exact source-backed traces for read-only Math3D inspection.

For several runs, open **Topology → Sweeps → Rice–Mele saved-run convergence**. Select one anchor saved run, two other durations at the same chain width, and two other widths at the anchor duration. The cycle parameters, momentum/phase samples, and steps per phase must match exactly. The resulting immutable study retains all five run IDs and result SHA-256 hashes. Its first plot shows periodic charge versus duration in electron charge per cell. Its second shows finite-chain central-bond charge versus width in electron charge. Each point exposes its own time-step, momentum/width, norm, particle-number, and continuity diagnostics. Plot segments only connect the recorded samples; they do not fit an extrapolation or claim that the two charges converge to one value.

Reopening a study re-verifies each original run and rederives every displayed value. Missing or changed sources make it unavailable. **Export read-only study .qscene** writes a source-linked bundle after verification; Math3D presents the supplied values and makes no physics calculation.
