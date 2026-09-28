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

Provenance identifies run/job, model, engine/version, computation timestamp and
SHA-256 of the original saved `result.json`. An optional pinned Atlas source
contains repository/revision/entry ID, never a local path or secret.
The shared Bloch-vector fixture tests TypeScript/Python compatibility.

## Rendering and export

QVIS-002 implementation details and acceptance are documented with its commit.
The first integration is file-based; no Math3D launch or live worker bridge is
part of these milestones.
