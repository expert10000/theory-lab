# Portable quantum scenes — QVIS-001 / QVIS-002

`quantum-scene/v1` is a Lab-owned, application-independent visualization boundary.
The scene is declarative data, not JavaScript, formulas to execute, a worker job,
or a Math3D document. Math3D is unchanged and needs a separate future importer.

## Contract

The strict Draft-7 schema is in `packages/quantum-scene/quantum-scene.v1.json`.
TypeScript and Python representations validate the same schema plus reference,
shape, identity, camera and memory constraints. The TypeScript reader interprets
this fixed schema's vocabulary without eval, AJV code generation or Node APIs,
so it can run under the web client's CSP.

Initial supported primitives: point clouds, polylines, vectors and indexed
triangle meshes. Scalars optionally color vertices/points. Labels are positioned
annotations. Volume/complex fields and isosurfaces are future QVIS work; unknown
kinds and future versions fail closed rather than rendering incorrectly.

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
new run. Saved runs work without a live worker. Changing lab controls never
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

The viewer is proven in an independent browser under strict CSP, but the
existing web client's navigation does not yet expose Scenes. The first
integration is file-based; no Math3D launch, importer or live worker bridge is
part of these milestones.

## Acceptance

`npm run typecheck`, `npm test`, `npm run test:worker`, `npm run test:scenes`,
`npm run test:web`, and `npm run test:desktop` cover contracts, real Python
results, bundle round trips, corruption, duplicate-export rejection, offline
saved-run access, all primitives, CSP, WebGL fallback and Electron UI export.
Optional-engine and unconfigured SSH tests retain their existing skips.
