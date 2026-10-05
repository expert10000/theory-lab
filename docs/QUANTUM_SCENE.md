# Portable quantum scenes — QVIS-001 / QVIS-002

`quantum-scene/v1` is a Lab-owned, application-independent visualization boundary.
The scene is declarative data, not JavaScript, formulas to execute, a worker job,
or a Math3D document. Math3D now has an independent verified reader and a
read-only preview for this portable format.

## Contract

The strict Draft-7 schema is in `packages/quantum-scene/quantum-scene.v1.json`.
TypeScript and Python representations validate the same schema plus reference,
shape, identity, camera and memory constraints. The TypeScript reader interprets
this fixed schema's vocabulary without eval, AJV code generation or Node APIs,
so it can run under the web client's CSP.

Initial supported primitives: point clouds, polylines, paired line segments, vectors and indexed
triangle meshes. Scalars optionally color vertices/points. Labels are positioned
annotations. QVIS-003 adds regular scalar/complex fields, slices, isosurfaces and
cyclic phase coloring; see [FIELDS_ORBITALS.md](FIELDS_ORBITALS.md). Unknown
kinds and future versions fail closed rather than rendering incorrectly.

QVIS-008 adds bounded open geometry examples and optional lattice metadata,
including original site/cell/basis inspection. They are explicitly fixtures,
not worker results. See [LATTICE_RECIPROCAL_BANDS.md](LATTICE_RECIPROCAL_BANDS.md).

Coordinates are right-handed `(x,y,z)` in declared axis order. Axis labels and
units are explicit, including mixed reciprocal-coordinate/scalar-height scenes.
Camera position, target and up are in this frame. No implicit Bloch-to-engine
axis swap is stored. Each object/dataset has a stable logical ID.

Datasets are tightly packed, little-endian Float64 tuples (1 or 3 components),
with explicit tuple counts, byte sizes, units and SHA-256 hashes. Mesh indices
are exact integer Float64 triples, zero-based and bounded by vertex count.
References are flat `.f64` filenames only: no traversal, URLs, device paths or
credentials. Metadata is bounded; the total numerical budget is 16 MiB.
Consumers verify bytes/hash, finiteness and index ranges before rendering.
Hashes detect corruption, not authenticity; accept bundles only from trusted sources.

Provenance identifies run/job, model and its numerical parameters, engine/version, computation timestamp and
SHA-256 of the original saved `result.json`. An optional pinned Atlas source
contains repository/revision/entry ID, never a local path or secret.
The shared Bloch-vector fixture tests TypeScript/Python compatibility.

## Rendering and export

Open **Scenes** (or **Portable scenes** in the sidebar), select a saved Dynamics
or Topology run, and inspect its verified geometry. Refresh after computing a
new run. QVIS-005 also adapts saved Many-body Ising runs; Orbitals supply field scenes.
Saved runs work without a live worker. Changing lab controls never
mutates an old scene: choose the new saved run after recalculating.

`packages/quantum-3d/SceneViewer.tsx` is an independent React/Three.js consumer.
It verifies the supplied artifacts using Web Crypto before creating GPU
geometry. It supports all four primitives, scalar coloring, projected labels,
orbit/pan/zoom, camera reset, object visibility and vertex/sample inspection.
Inspection uses original Float64 values; the GPU uses Float32 positions.
If WebGL is unavailable, verified numerical inspection stays accessible.
The existing Dynamics Bloch sphere/time cursor is preserved.

Initial result adapters do not compute new physics:

- Evolution: every stored Bloch sample, original time, initial vector and three
  unit-circle guides. Selecting trajectory samples inspects the original time.
- SSH: the finite open chain and the worker's averaged midgap-pair probability
  per site. Color represents that supplied probability, not a single eigenstate.
- QWZ: the worker's analytic lower-band curvature sampled at grid-cell centers.
  Height is the supplied curvature (not rescaled); colors diverge around zero
  when both signs occur. Adjacent cells are triangulated without connecting the
  periodic seam. The invariant annotation is copied from the validated result:
  under-resolved meshes remain unresolved, and exact gap closures have no field
  scene. A mesh is a visualization, not an independent Chern-number calculation.

QVIS-005 enriches these adapters without adding physics or changing the scene
schema. SSH shows A/B guides and two batched bond meshes: t₁ connects A–B inside
each cell and t₂ connects B–A between cells. Zero hoppings leave gaps; signed
hoppings are shown in labels/provenance, not inferred from bond length or width.
The old unweighted connecting line is hidden by default. Site spacing and guide
offsets are schematic, not atomic coordinates. Density remains the supplied
averaged midgap-pair observable.

Ising scenes copy the exact ground-state Pauli ⟨σz⟩ at every site into color and
vertical-height arrows. These are not classical spatial spin orientations or
σz/2. Open chains are linear; periodic chains use a schematic ring with a closing
bond. QWZ adds a zero-height Brillouin boundary and explicitly labelled kx, ky
and curvature-height guides. Those guides do not interpolate the periodic seam
or make an unresolved/undefined Chern invariant valid.

**Export scene bundle** asks for a parent folder, then exclusively creates
`<runId>.qscene/` containing `bundle.json`, `scene.json`, and the referenced
`.f64` files. Existing bundles are never overwritten. The small bundle manifest
hashes the scene metadata; the scene hashes every dataset. The reusable Node
bundle reader verifies both before returning data. Incomplete exports created
by the failed call are removed; saved runs are unaffected.

Electron accepts only a run ID through trusted-frame IPC. The main process
loads and verifies saved job/result/data, adapts them, and writes to the folder
selected by the user. The renderer cannot supply arbitrary file paths, scene
metadata or binary files for export. No worker RPC or gateway endpoint was added.

## QVIS-006: read-only bundle import

In **Scenes**, select **Open scene bundle** and choose the exported `.qscene`
folder. A no-argument trusted preload call opens the native folder dialog; React
cannot provide a path. Main verifies bounded metadata, the scene schema and
references, every byte count and hash, and finite/index-valid numerical data
before releasing the payload. Unexpected files, nested directories, symbolic
file links and directory junctions are rejected. Reads are capped even if a file
grows during verification. The importer does not execute formulas, load URLs,
invoke a worker, modify the source folder, or insert an artificial saved run.

Primitive and regular-field bundles use the same viewers and inspect original
Float64 values. Imported scenes are clearly marked **READ-ONLY**; their supplied
provenance is not independently authenticated. Hashes detect corruption, not
publisher identity or scientific correctness. Open only trusted bundles.
Export of imported data is disabled; **Return to saved run** restores the normal
saved-run workflow. Cancelling or rejecting another import keeps the previous
valid preview. The later QVIS-023 handoff uses this same file format.

The web client's **Portable scenes** exposes the shared viewers under strict
CSP. Authenticated saved-run views use read-only scene metadata/dataset/chunk
routes; local folder imports require no token, upload nothing and create no
runs. Both regular and separate chunked bundles are accepted. The first external
integration remains file-based. A later local checkout launcher opens verified
saved-run bundles in Math3D; no live worker bridge is involved. See
[the bounded release record](RELEASE_QVIS_V0.1.md) and [the handoff](SCENE_HANDOFF.md).

## QVIS-008–010: bounded lattices, reciprocal guides and bands

Scenes now provides geometry-only open supercell fixtures and primitive
reciprocal-zone fixtures, without creating fake numerical runs. Optional
`lattice`, `reciprocal` and `bands` metadata are validated in TS and Python.
Trusted `getScene(runId, "bands")` / `exportScene(runId, "bands")` adapt verified
saved SSH/QWZ energies; omitted view keeps existing behavior. Unknown views are
rejected. Original Float64 energies, k coordinates and source hashes survive
offline bundle import. See [scope, conventions and UI controls](LATTICE_RECIPROCAL_BANDS.md).
Older strict consumers must update their schema before accepting these optional
fields or the `segments` primitive. This does not change worker routing or add
a live Math3D worker connection.

## Acceptance

`npm run typecheck`, `npm test`, `npm run test:worker`, `npm run test:scenes`,
`npm run test:web`, and `npm run test:desktop` cover contracts, real Python
results, bundle round trips, corruption, duplicate-export rejection, offline
saved-run access, all primitives, CSP, WebGL fallback and Electron UI export.
Optional-engine and unconfigured SSH tests retain their existing skips.
