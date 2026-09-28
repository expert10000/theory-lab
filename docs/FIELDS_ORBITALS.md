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

The shared planar complex fixture and an analytic Gaussian/plane test verify
indexing, interpolation, phase conventions, corruption rejection and parity
between TypeScript/Python. `npm run test:scenes` exercises field controls under
strict browser CSP; no runtime code generation or new browser privileges.

QVIS-004 adds the worker-backed orbital laboratory in a separate commit.
