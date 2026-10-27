# Rice–Mele filled-band pump study

The static Rice–Mele job remains a separate fixed-parameter calculation. Select **Topology → Topological bands → Rice–Mele · filled-band pump** for a closed cycle. The model uses

\[
t_1(\theta)=b+m\cos\theta,\quad t_2(\theta)=b-m\cos\theta,\quad
\Delta(\theta)=d_0+a\sin\theta,\quad 0\leq\theta<2\pi.
\]

Both hoppings must stay positive. The worker diagonalizes the two-band Bloch Hamiltonian on bounded periodic \((\theta,k)\) grids and saves exact sampled levels, hopping/staggering values, FHS plaquette phases, and the occupied-band Wilson polarization at each cycle phase. It checks the minimum bulk gap analytically, repeats the calculation on a doubled grid, and compares occupied Chern with the separately accumulated polarization winding. Both periodic seams are included. A closed gap or unresolved mesh sets both public invariants to **undefined**. The saved status and coarse/fine diagnostics explain why.

The conditional topological claim is an **ideal adiabatic cycle with the lower band filled**. A separately requested finite-speed run uses the same cycle but has its own duration and integration resolution. Its recorded transported charge is not labelled quantized. Finite-chain edge motion and partially filled-band response are not calculated.

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
