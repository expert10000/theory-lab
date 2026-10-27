# Rice–Mele filled-band pump study

The static Rice–Mele job remains a separate fixed-parameter calculation. Select **Topology → Topological bands → Rice–Mele · filled-band pump** for a closed cycle. The model uses

\[
t_1(\theta)=b+m\cos\theta,\quad t_2(\theta)=b-m\cos\theta,\quad
\Delta(\theta)=d_0+a\sin\theta,\quad 0\leq\theta<2\pi.
\]

Both hoppings must stay positive. The worker diagonalizes the two-band Bloch Hamiltonian on bounded periodic \((\theta,k)\) grids and saves exact sampled levels, hopping/staggering values, FHS plaquette phases, and the occupied-band Wilson polarization at each cycle phase. It checks the minimum bulk gap analytically, repeats the calculation on a doubled grid, and compares occupied Chern with the separately accumulated polarization winding. Both periodic seams are included. A closed gap or unresolved mesh sets both public invariants to **undefined**. The saved status and coarse/fine diagnostics explain why.

The conditional transport claim is an **ideal adiabatic cycle with the lower band filled**. The job does not calculate current at finite speed, finite-chain edge motion, or a partially filled-band response.

Runs store the exact job and result with SHA-256 verification. The topology inspector links a selected phase and momentum to the stored energies, local plaquette phase, and Wilson polarization. Scenes exports a source-linked, read-only `.qscene` containing both supplied band meshes and exact diagnostic samples. The existing `quantum-scene/v1` band-grid metadata is bounded to 31 per axis, so this adapter keeps its 32×32 or finer band data as verified mesh objects without downsampling or changing the frozen contract.

The source Atlas entry remains `rice_mele`; this is a bounded executable cycle built on that model, not a new Atlas entry or a change to the static model's historical binding.

The pinned Math3D acceptance fixture is reproduced by running
`npx tsx scripts/export-rice-mele-pump-fixture.ts <existing-output-directory>`.
In Math3D, open **File → Verified quantum examples → Rice–Mele → filled-band
pump**, or open the exported `.qscene` folder directly. Math3D re-verifies
source bytes for selection and computes no pump physics.
