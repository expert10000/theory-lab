# QVIS-003 — sampled scalar and complex fields

`quantum-scene/v1` now has optional `fields`: bounded regular 3D grids, with
shape, origin, strictly positive spacing, units and `xyz-z-fastest` ordering.
Complex fields reference separate real/imaginary Float64 datasets. All grid
shapes, references, byte counts and hashes are verified before visualization.
Existing primitive-only scenes remain valid. Older readers reject the new
field extension; there is no Math3D importer or format adaptation here.

`FieldViewer` is browser-compatible and consumes supplied numerical fields.
It supports density, real/imaginary components, cyclic phase coloring, signed
lobes, threshold control, orthogonal slices and exact sampled-value inspection.
Density surfaces with phase coloring interpolate complex amplitudes first,
not phase angles across their branch cut. Phase near a node is masked in slices
at 1e-12 of the sampled maximum density. Phase itself is not an isosurface.
Scalar fields expose their supplied scalar values, not wavefunction density.

Surfaces use piecewise-linear marching tetrahedra; they are sampled approximations.
The threshold is a fraction of the sampled maximum, not enclosed probability.
Grid dimensions are limited to 49 per axis and total source data to 16 MiB.
Each extracted mesh is capped at 60,000 triangles; extraction yields between
slabs and cancels stale requests. Empty/zero components and missing level
crossings produce an explicit empty-view message, not fabricated geometry.
Existing SceneViewer camera, selection, visibility and no-WebGL inspection apply.
Mesh lighting makes sampled facets visible; it changes display brightness only,
not numerical values, phase conventions or exported field data.

The shared planar complex fixture and an analytic Gaussian/plane test verify
indexing, interpolation, phase conventions, corruption rejection and parity
between TypeScript/Python. `npm run test:scenes` exercises field controls under
strict browser CSP; no runtime code generation or new browser privileges.

## QVIS-004 — hydrogenic orbital laboratory

Open **Orbitals** (or **Atomic orbitals** in the sidebar), choose a preset or
quantum numbers, then **Compute orbital**. This is a native NumPy/SciPy analytic
method in the existing Python worker—not a QuTiP time-evolution solver. It uses
the supervised `quantum.start`/progress/cancellation lifecycle. Completed runs
are stored with hashes; the **Scenes** tab can replay them without a live worker.
Neither milestone changes Math3D or connects to it.

The model is a single electron in a Coulomb potential: nonrelativistic, infinitely
heavy nucleus, no spin, fine structure, interactions, screening or molecules.
Coordinates and radial distances are in Bohr radii a₀, energies in Hartree,
amplitude in a₀⁻³ᐟ², density in a₀⁻³. Supported bounds are n = 1–3,
0 ≤ l < n, −l ≤ m ≤ l, integer Z = 1–6, cube half-width 0.5–120 a₀,
and 21/31/41/49 samples per axis. Thus “3d” here is an orbital, not a Math3D feature.

With ρ = 2Zr/n (r measured in a₀), the normalized analytic radial function is

```text
R_nl(r) = (2Z/n)^(3/2) sqrt((n-l-1)! / [2n(n+l)!])
          exp(-ρ/2) ρ^l L_(n-l-1)^(2l+1)(ρ)
ψ_nlm = R_nl Y_l^m ; E_n = -Z²/(2n²) Hartree
```

The worker uses SciPy `eval_genlaguerre` and `sph_harm_y(l,m,theta,phi)`:
theta is colatitude, phi azimuth, and the Condon–Shortley phase is included.
For the real cosine/sine basis, m > 0 means √2(−1)^m Re/Im Y_l^m;
m = 0 remains Y_l^0 (only cosine is offered). Negative m is supported only
in the complex basis. For example, 2p cosine m=1 is positive along +x and
2p sine m=1 along +y. No arbitrary phase correction is applied after sampling.

Formula and convention references:
[hydrogenic separation and normalization](https://farside.ph.utexas.edu/teaching/qmech/Quantum/node82.html),
[SciPy spherical harmonics](https://docs.scipy.org/doc/scipy/reference/generated/scipy.special.sph_harm_y.html),
[generalized Laguerre evaluation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.special.eval_genlaguerre.html).
`orbital` is advertised only when the required SciPy special functions import.

The worker independently integrates r²|R|² and r³|R|² on [0,∞), checking norm 1
and mean radius [3n² − l(l+1)]/(2Z). These radial diagnostics do not validate
Cartesian quadrature: the **cube grid integral** uses trapezoidal endpoint
weights on the sampled grid and is deliberately not corrected or clamped.
It combines finite-box truncation with resolution error and can exceed 1.
Increase resolution and vary box size independently, especially for high Z.
The UI warns on deviations exceeding 2%; the 401-point radial plot shows
r²|R(r)|², not the three-dimensional density |ψ|².

The source artifact has `grid³` rows of interleaved little-endian Float64
`[psi_re, psi_im]`, 16 bytes per row, x outermost and z fastest. Electron
checks row count, bytes, hash and analytic diagnostics before saving it, and
independently recomputes the grid integral from the received amplitudes. The
scene adapter splits it into two hash-verified datasets and retains quantum
numbers, basis, Z, grid and units in provenance. Exported orbital CSV includes
x/y/z, real/imaginary amplitude and density; SVG exports the radial profile.
Scene bundle export preserves the sampled field, not a baked threshold mesh.

Tests cover closed-form 1s amplitudes, 2s nodes, real p-lobe signs, conjugate
complex harmonics, angular and radial normalization across all supported
quantum numbers, charge scaling, grid convergence, unchanged truncated norm,
cancellation cleanup, saved/offline bundles and corrupted artifact rejection.
Desktop acceptance exercises 1s, real 2p lobes, phase/nodal slices and export.
