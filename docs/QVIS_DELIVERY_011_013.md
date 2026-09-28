# QVIS-011–013 delivery

## QVIS-011: supplied topology quantities

Optional `topology` metadata in quantum-scene/v1 links each declared Berry
curvature, connection, pseudospin or Berry-phase quantity to an existing object
and dataset. Scalar/vector component counts, counts, references and phase units
are checked in TS and Python. Verified/supplied invariant states require values;
undefined/unresolved states require null. These are reported states, not new
viewer calculations or authenticated claims about imported files.

Saved QWZ curvature scenes preserve the worker's FHS/independent phase-diagram
check and distinguish midpoint curvature from plaquette data. SSH preserves its
reported winding. Selection, legends and original Float64 inspection work for
supplied vectors as well as scalars. Synthetic vector tests are explicitly
fixtures, not new physics solvers. Rice–Mele, BHZ, BBH, Weyl and other new model
engines remain future work. No Math3D changes or inferred topology.

## QVIS-012: chunked multilevel bundles

`quantum-scene-stream/v1` is a separate manifest, not an incompatible rewrite
of quantum-scene/v1 datasets. Each level is a complete ordinary scene with an
explicit dataset-to-chunk mapping. File names are content-addressed SHA-256,
chunks at most 64 KiB, up to 8 levels/1024 unique chunks/64 MiB unique bytes,
metadata at most 1 MiB. Each level retains the 16 MiB scene budget. Reads happen
on demand, chunk hashes are verified before cache insertion, assembled datasets
and semantics are checked before display, and the verified LRU cache is 4 MiB.
Previous valid display survives cancellation or corruption. Unread levels are
not claimed verified. There is no prefetch of every level or entire file tree.

Desktop **Export chunked LOD bundle** creates a retained-sample display subset
and full-data level from a verified saved run. **Open chunked scene bundle**
verifies bounded metadata and file inventory, then lazily loads preview/refinement.
Only opaque handles and declared chunk names cross preload; paths come from the
native dialog. At most two imported handles are held by main. Regular bundles
remain accepted unchanged. No output folder is overwritten.

Field subsets retain original grid samples with adjusted spacing and unchanged
extent; geometry previews are labelled point/vector subsets. They do not imply
scientific interpolation, normalization, convergence, gap resolution or new
invariants. Full levels preserve every original byte. This is bounded preparation
for larger collections, not an arbitrary-size volume engine, time-sequence
player or out-of-core GPU renderer. Decoder, retained-display and GPU buffers
add memory beyond the payload/cache limits; no total process-heap cap is claimed.
