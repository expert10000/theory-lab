# Lattice, reciprocal and band scenes

## QVIS-008 — bounded geometry examples (implemented)

Open **Scenes → Bounded lattice examples**, select square, honeycomb or simple
cubic, set 1–8 repeats per active axis, and **Preview geometry example**.
Planar examples require z=1. The displayed snapshot, not later edits, is exported
with **Export scene bundle**. Examples are generated in trusted Electron main,
work without a worker and never create numerical run-history entries.

Coordinates are schematic nearest-neighbor spacing. Square/cubic have one basis
site and unit translations. Honeycomb uses a₁=(√3,0,0), a₂=(√3/2,3/2,0),
A=(0,0,0), B=(0,1,0). Its three A→B neighbor offsets are (0,0), (0,−1),
(1,−1), clipped to the open supercell. Bonds denote geometry, not hopping values
or chemical bonds. No atom species, crystallography database or Hamiltonian is
inferred. Open boundaries only; no periodic image/wrapped bonds.

Optional `lattice` metadata records dimension, translations, basis, repeats,
boundary and verified binary references for positions/cell triples/basis indices.
Inspection identifies a site by c(x,y,z)/bN, stable for the same primitive cell.
All sites must have unique, in-range integer identities and agree with
Σ cellᵢaᵢ + basis position. TS and Python enforce the same rules. Cell/bond
wireframes use the new generic `segments` primitive (paired endpoints, no arrows).
Translations remain vector arrows. Geometry, field and older scene fixtures
share the same strict schema; older strict consumers must be updated before
reading these newly added optional fields/kinds.

`provenance.kind="geometry-fixture"` distinguishes examples from numerical
results. The legacy `resultSha256` field hashes the versioned geometry descriptor,
not a nonexistent physics result; the UI labels it accordingly. Deterministic
fixture IDs identify that descriptor. Bundles still verify metadata/data hashes
and are created exclusively without overwriting. Hashes do not authenticate a
publisher. The three checked-in small fixtures exercise TS/Python compatibility;
tests also cover 8³ bounds, nearest-neighbor lengths, bad identities/coordinates,
degenerate translations, paired segments and bundle round trips.

## QVIS-009 — reciprocal-space guides (implemented, bounded fixtures)

Choose **Geometry view → Primitive reciprocal zone** in Scenes. Square,
honeycomb and simple-cubic fixtures supply dual bases (aᵢ·bⱼ=2πδᵢⱼ), named
symmetry points, selectable paths and zone boundaries. Repeats do not fold the
primitive zone. Named-point/path selection shares the original-coordinate
inspector and marker. Saved QWZ curvature scenes also include square guides.
Both validators check duality, references and stored point/path coordinates;
bundles retain these guides offline. Coordinates use rad per declared spacing.
No arbitrary-crystal Wigner–Seitz construction or implicit coordinate conversion.

## QVIS-010 — portable band scenes (implemented, SSH/QWZ)

Select a saved topology run and **Saved view → SSH / QWZ energy bands**.
The band dropdown, original-coordinate slider, 3D pick and SSH plot share one
stored sample; QWZ has explicit kx/ky index controls. Both energies and their
separation are inspected from verified Float64 datasets. The minimum sampled
separation is not the worker's exact global bulk gap: finite grids can miss a
closing point. Lines/triangles are display connections, not extra physics data.

New QWZ results optionally carry `bandKValues`, `lowerBand` and `upperBand` as a
complete set, x-major/y-fastest at k=-π+2πi/N, unlike curvature's cell centers.
The existing v1 shape without this optional set remains accepted; older QWZ
band previews request a re-run instead of synthesizing missing energies.
SSH uses its existing supplied samples including ±π. Closed-gap band scenes
remain valid, but no invariant or curvature is invented at the closure.
Optional `bands` metadata links k coordinates, ordered energies, objects, grid,
units and reported bulk gap. TS/Python check shapes, ordering, geometry/energy
agreement and adjacent-cell triangles; surfaces never connect periodic seams.
Exports retain source hashes/parameters and reopen read-only without a worker.
Maximum QWZ result sizes remain below the existing 64 KiB worker line budget.

No new topology inference or periodic seam interpolation. No Math3D code or live
application connection is part of any of these Lab-only milestones.
