# Post-QLAB roadmap — integration and implementation status

Updated 2026-09-29. This file incorporates the supplied
`MATH3D-2026/POST_QLAB_QVIS_M3D_ROADMAP.md` as a planning reference.
The source document is preserved below; this status overlay and
[ROADMAP.md](ROADMAP.md) describe the actual Lab delivery sequence.
Acceptance checkmarks in the supplied plan are targets, not test results.

## History and numbering reconciliation

Existing commits are not renamed. The original plan places the web client at
QLAB-025; this repository shipped the Atlas/catalog/bindings/topology additions
as QLAB-025–028 and the authenticated web client as QLAB-029. New visualization
work continues under QVIS, not additional QLAB numbers.

QVIS-001–004 match the reference at a deliberately bounded scope.
The delivered QVIS-005 enriches existing SSH/Ising/QWZ scenes, not arbitrary
crystals. Delivered QVIS-006 imports verified bundles; delivered QVIS-007 adds
orbital convergence and radial nodes. Those last two are not the reference
plan's reciprocal-space and band milestones.

Consequently Lab commits QVIS-008–010 fill those gaps at a bounded scope. The
reference's remaining topology, streaming and release goals move to
QVIS-011–013. This explicitly extends the proposed 001–010 numbering freeze
rather than relabelling historical commits. The bounded release is now recorded
in [RELEASE_QVIS_V0.1.md](RELEASE_QVIS_V0.1.md).
M3D-Q01–Q10 retain their proposed names and remain a separate-repository track.

## Delivered Lab milestones

D1-001–004 are implemented as an additive static 1D oscillator extension after
R1–R5. Contracts, QuTiP/native Fock spectrum/quadratures, Hermite density plots,
Electron persistence and the tenth reviewed Atlas binding are delivered.
All 68 definitions and nine original bindings remain intact. The original R5
metadata is preserved. Driven/anharmonic/ND scope, web computation and Math3D
remain future work; see [D1_OSCILLATOR.md](D1_OSCILLATOR.md).

D1-005–007 add bounded free Fock/projected-coherent dynamics within the same
Oscillator lab: independent QuTiP/native evolution, moving-density/time-cursor
and q/p comparison, supervised progress/cancel, verified durable coefficients,
CSV/SVG/manifest export and additive workspace restoration. All three are
implemented; see [D1_OSCILLATOR_DYNAMICS.md](D1_OSCILLATOR_DYNAMICS.md).
No existing scope is reduced; the broader G02 and external Math3D goals remain.

D1-008–010 add bounded monochromatic forcing, analytic/finite evolution checks,
drive controls and q/p/occupation/work diagnostics, an explicitly chosen eleventh
Atlas preset, verified exports and backward-compatible restoration. All three
are implemented. All preceding bindings are preserved; general envelopes,
pulses, damping and broader oscillator physics remain separate work. See
[D1_DRIVEN_OSCILLATOR.md](D1_DRIVEN_OSCILLATOR.md). Math3D is unchanged.

D1-011–013 are implemented: bounded declarative Gaussian pulses, independent
QuTiP-Verner9/native-DOP853 evolution and finite/displacement verification,
pulse controls and bounded cutoff/solver-step comparisons, endpoint tails,
verified persistence/exports and input-only restoration. All eleven existing
Atlas load presets remain unchanged; Gaussian is an additional explicit Lab
choice. Delivery commits: `cae4615` (D1-011), `90d17bc` (D1-012), `e9bdede`
(D1-013). Acceptance recorded on 2026-09-29: 182 tests passed plus typecheck
and Electron/web/scene regression gates. See
[D1_PULSED_OSCILLATOR_PLAN.md](D1_PULSED_OSCILLATOR_PLAN.md).

D1-014–016 add a separate bounded thermal Lindblad oscillator in the existing
Electron lab, with independent QuTiP/native density-matrix evolution, host
propagation and positivity checks, controls/comparisons, verified durability
and input-only restoration. The eleven Atlas presets, QVIS schema, web compute
permissions and Math3D remain unchanged. See
[D1_DAMPED_OSCILLATOR.md](D1_DAMPED_OSCILLATOR.md).

D1-017–019 add stable vacuum parametric squeezing to the same Electron
oscillator lab: independent QuTiP/native finite-Fock evolution, host-verified
complex amplitudes, quadrature diagnostics, engine/cutoff comparison,
durable CSV/SVG/manifest runs and input-only workspace restoration. The
eleven reviewed Atlas presets remain intact; the parametric Atlas entry is
not automatically a load preset. Web compute permissions, `quantum-scene/v1`
and Math3D are unchanged. See
[D1_PARAMETRIC_OSCILLATOR.md](D1_PARAMETRIC_OSCILLATOR.md).

D1-020–022 add a bounded confining quartic static spectrum to the existing
Electron Oscillator lab. Independent QuTiP/native finite-Fock eigenpairs,
host residual/moment checks, level shifts, cutoff/engine comparison,
durable exports and input-only workspace restoration are implemented. The
eleven Atlas load presets, web compute permissions, QVIS schema and Math3D
remain unchanged. See
[D1_ANHARMONIC_OSCILLATOR.md](D1_ANHARMONIC_OSCILLATOR.md).

| Historical ID | Delivered scope | Status / evidence |
| --- | --- | --- |
| QLAB-000–017 | Secure Electron/React, supervised worker, physics labs, comparisons, presets, persistence | Implemented; release record in RELEASE_V0.1.md |
| QLAB-018–024 | Optional engines, many-body/circuit UI, supervised SSH transport, worker information | Implemented; availability depends on installed engines/configuration |
| QLAB-025–028 | Pinned Atlas, tested bindings, SSH and QWZ labs | Implemented; packages/atlas, topology worker and tests |
| QLAB-029 | Authenticated React web client → gateway → worker | Implemented; apps/web, apps/gateway and web smoke |
| QVIS-001 | Strict TS/Python scene contract, units, IDs, hashes and bounded binary artifacts | Implemented |
| QVIS-002 | Independent browser-compatible renderer, saved-result adapters and bundle export | Implemented; shared desktop/web Scenes as of QVIS-013 |
| QVIS-003 | Bounded regular scalar/complex fields, signed lobes, slices, phase and isosurfaces | Implemented; not an unbounded volumetric engine |
| QVIS-004 | Analytic single-electron hydrogenic 1s–3d laboratory | Implemented; not multi-electron chemistry |
| QVIS-005 | SSH A/B bonds, exact Ising magnetization, QWZ axes/boundary guides | Implemented; commit 74acf92 |
| QVIS-006 | Read-only verified .qscene import and provenance inspection | Implemented; commit 9092b07 |
| QVIS-007 | Fixed-box/fixed-spacing orbital studies and positive radial-node diagnostics | Implemented; commit e4afd9a |
| QVIS-008 | Square/honeycomb/cubic open supercell fixtures, basis/cell inspection and export | Implemented; LATTICE_RECIPROCAL_BANDS.md |
| QVIS-009 | Explicit dual bases, primitive square/hexagonal/cubic zones, named points and paths | Implemented, bounded fixtures; LATTICE_RECIPROCAL_BANDS.md |
| QVIS-010 | Supplied SSH band paths/QWZ energy surfaces, synchronized sample/gap inspection and offline bundles | Implemented, bounded two-band models; LATTICE_RECIPROCAL_BANDS.md |
| QVIS-011 | Reusable supplied Berry scalar/vector/pseudospin/phase quantities and reported invariant states | Implemented; strict TS/Python references, saved SSH/QWZ and synthetic vector compatibility tests |
| QVIS-012 | Separate bounded multilevel bundles, lazy chunk verification, preview/refine, cancellation and cache reuse | Implemented; 64 MiB unique chunks, 16 MiB per scene, 4 MiB cache; not unlimited-volume streaming |
| QVIS-013 | Bounded portable visualization v0.1 acceptance, web Scenes, read-only saved views/offline imports and compatibility record | Implemented; RELEASE_QVIS_V0.1.md and web/desktop/browser acceptance |

Implemented means code and relevant tests exist, not that every future example
in the supplied plan is supported. Verification uses build/typecheck, Node and
worker tests, strict-CSP scene/browser tests and Windows Electron acceptance.
Unconfigured SSH and unavailable optional-engine tests are explicitly skipped;
their passing availability cannot be inferred from the rest of the suite.
The earlier v0.1 Linux acceptance record is separate from this Windows run.

## Coverage of the supplied plan

| Reference goal | Actual coverage | Remaining work |
| --- | --- | --- |
| QVIS-001 scene contract | Implemented, bounded primitives/fields | Additional vocabularies must be explicit, compatible additions |
| QVIS-002 reusable renderer | Implemented, shared desktop/web Scenes and read-only folder import | Browser export and additional compute controls are not part of this release |
| QVIS-003 scalar/complex visualization | Implemented, bounded grids | Larger/chunked grids belong to streaming work |
| QVIS-004 orbital lab | Implemented, analytic hydrogenic examples | No many-electron atom/molecule solver |
| QVIS-005 lattice/crystal primitives | Partial: square/honeycomb/cubic open fixtures, cells, basis, translations and supercells now exist | Arbitrary crystals and periodic bonds remain outside the bounded example scope |
| QVIS-006 reciprocal/BZ visualization | Partial: explicit square/honeycomb/cubic dual bases, zones, named points/paths and inspection | General arbitrary-crystal zone construction remains outside bounded fixtures |
| QVIS-007 band integration | Implemented, bounded: supplied SSH paths/QWZ surfaces, shared band/k-point/gap selection and verified bundles | Arbitrary-crystal bands and additional physics models remain outside this delivery |
| QVIS-008 Berry/topology visualization | Partial: reusable supplied scalar/vector/phase quantities and reported invariants; saved SSH/QWZ and synthetic vector fixtures | Additional model engines remain future physics work; the viewer computes no invariants |
| QVIS-009 streaming/LOD | Implemented, bounded: multilevel manifests, lazy chunk verification, preview/refine, bounded cache and cancellation | Unlimited volumes, time-sequence players and out-of-core GPU rendering remain future work |
| QVIS-010 release freeze | Implemented, bounded: tested compatibility/limits in RELEASE_QVIS_V0.1.md | No standalone installer, arbitrary-size volume engine or Math3D integration is claimed |
| M3D-Q01–Q10 | External / not assessed | No Math3D checkout or integration implementation was inspected in this task |
| Track A Atlas | Partial: pinned catalog and explicit tested model bindings | Progressively unify model metadata; no claim that the reference's whole family list is computed |

## Lab continuation milestones (status updated per delivery)

**Atlas reconciliation:** R1 is implemented — 68 canonical definitions at
`48e2036ba7c7dd5c79d54749341a79d41770cbb7`, seven theory-side program references,
nine preserved tested Lab bindings and explicit desktop/web/gateway/scene
coverage. See ATLAS_RECONCILIATION_R1.md. R2 executable mapping review is
implemented (nine bindings preserved; candidates remain disabled), recorded in
ATLAS_RECONCILIATION_R2_R5.md. R3 C/QVIS vocabulary review is implemented
(seven ideas retained, regular-grid conversion tested). R4 genuine physics gap
review is implemented (all 68 entries classified; 12 additive backlog groups).
R5 is implemented: strict additive atlas-lab-reconciliation/v1 metadata with
coverage/digests and compatibility gates. Existing Lab features and scientific
protocols are retained; no unbound solver is claimed implemented.
B/C scaffolding is not imported as a parallel architecture;
D1 physics was not started by reconciliation itself; D1-001–016 were delivered
subsequently as recorded above. Math3D integration remains a separate track.

### Gaussian pulse Lab sequence (implemented)

| ID | Next delivery | Status |
| --- | --- | --- |
| D1-011 | Bounded Gaussian envelope, append-only contracts, independent worker engines and displacement/finite-model checks | Implemented |
| D1-012 | Pulse controls, drive plot and bounded cutoff/time-resolution inspection in the existing oscillator lab | Implemented |
| D1-013 | Durable pulse provenance/exports/restoration, reviewed existing Atlas mapping and regression acceptance | Implemented |

See [D1_PULSED_OSCILLATOR_PLAN.md](D1_PULSED_OSCILLATOR_PLAN.md). This delivery
extends existing architecture and retains all delivered modes and eleven
bindings. Gaussian pulses do not complete the general Atlas envelope family;
arbitrary waveforms and combined driven+dissipative scope remain planned.
No web compute permission, scene vocabulary or Math3D changes are included.

### Damped thermal oscillator Lab sequence (implemented)

| ID | Delivered scope | Status |
| --- | --- | --- |
| D1-014 | Bounded thermal Lindblad oscillator, strict append-only contracts, independent QuTiP/native density-matrix engines | Implemented |
| D1-015 | Electron controls, trace/purity/positivity/coherence inspection, engine and cutoff comparison | Implemented |
| D1-016 | Physics-verified durability/exports, input-only workspace restoration and acceptance | Implemented |

See [D1_DAMPED_OSCILLATOR.md](D1_DAMPED_OSCILLATOR.md). This separate
loss/thermal-bath mode is not an arbitrary open oscillator and does not alter
any Atlas binding, portable scene or Math3D behavior.

1. **QVIS-008 — generic lattice scenes (implemented, bounded open examples)**
   `feat(qvis): add bounded lattice cells and supercell scene fixtures`
   Represent sites, basis sites, bonds, unit-cell edges and translations using
   existing portable primitives. Add square, honeycomb and simple-cubic
   fixtures with explicit schematic coordinates/units, stable identities,
   bounded supercells, import/export tests and desktop inspection.
   A geometry fixture must not pretend to be a worker-computed physics run.
2. **QVIS-009 — reciprocal-space guides (implemented, bounded fixtures)**
   `feat(qvis): add reciprocal basis and Brillouin-zone scene inspection`
   Add explicitly supplied reciprocal basis, labelled high-symmetry points
   and paths, boundaries and k-point inspection. Establish conventions and
   bounded fixtures first; do not infer a general Wigner–Seitz zone from an
   arbitrary model or silently identify real/reciprocal selections.
3. **QVIS-010 — portable band scenes (implemented, bounded SSH/QWZ)**
   `feat(qvis): integrate supplied band paths and surfaces with scene inspection`
   Start with verified existing SSH/QWZ results, preserve supplied energies
   and k coordinates, and synchronize selected band/k-point and gap readouts.
   Do not connect periodic seams or infer crossings/topology from coarse
   samples. Add round-trip, integrity and desktop/browser acceptance tests.

QVIS-011 supplied Berry/vector/topology extensions and QVIS-012 chunked
data/LOD/cancellation are implemented. QVIS-013 closes the bounded visualization
release gate with real product web Scenes, authenticated read-only saved views,
offline imports and explicit compatibility/limits. See QVIS_DELIVERY_011_013.md
for the implementation scope and RELEASE_QVIS_V0.1.md for acceptance evidence.

Track A feeds metadata in parallel. M3D-Q is documented but not authorized by
this Lab-only sequence. No direct Lab-to-Math3D worker calls or launch coupling
are introduced: QuantumResult → QuantumScene → independent consumers.

---

# Supplied planning reference (preserved)

The following is the original proposed roadmap. Its imperative wording and
checkmarks describe the supplied plan; the overlay above reconciles it with
checked-in code. In particular, its numbering freeze and "Immediate Next
Commit" are historical proposals, not the current implementation status.

# Quantum Lab — Post-QLAB Roadmap

## 1. Boundary after QLAB-025

The Quantum Hamiltonian Lab (`QLAB`) sequence reaches its planned application boundary with:

```text
QLAB-025   Web client
```

Do not continue indefinitely with `QLAB-026`, `QLAB-027`, etc. After QLAB-025, split development into:

```text
Track A     Hamiltonian Atlas
QVIS        Portable Quantum Visualization
M3D-Q       Math3D Quantum Integration
```

Target architecture:

```text
                    HAMILTONIAN ATLAS
                           |
                  machine-readable models
                           |
                  +--------+--------+
                  |                 |
                  v                 v
                QLAB            TEXTBOOK
                  |
                  v
            QuantumResult
                  |
                  v
            QuantumScene
                  |
          +-------+-------+
          |       |       |
          v       v       v
       Desktop   Web    Math3D
```

The central architectural rule is:

```text
QuantumResult
      |
      v
QuantumScene
      |
      +---- Quantum Lab renderer
      +---- Web renderer
      +---- Math3D adapter
```

Quantum Lab must not acquire special-purpose Math3D calls. Both applications should consume a portable, versioned `quantum-scene/v1` format. Large scientific arrays remain binary artifacts referenced by scene metadata rather than being embedded in JSON.

---

# 2. QVIS — Quantum Visualization Layer

## Goal

Create a reusable scientific visualization layer between numerical quantum results and concrete viewers.

Target consumers:

```text
Quantum Lab Desktop
Quantum Lab Web
Math3D
future clients
```

## QVIS-001

```text
arch(qvis): define portable quantum scene contract
```

Introduce `quantum-scene/v1`.

Conceptual structure:

```text
scene
├── schema
├── metadata
├── provenance
├── coordinateSystem
├── camera
├── objects[]
├── datasets[]
├── selections
├── annotations
└── source
```

Initial object families:

```text
point-cloud
bonds
vectors
polyline
mesh
scalar-field
complex-field
isosurface
reciprocal-lattice
```

Requirements:

- strict versioned schema
- TypeScript and Python representations
- runtime validation
- compatibility fixtures
- explicit units and coordinate systems
- stable object IDs
- source/provenance metadata
- binary artifact references
- artifact size/hash verification

Do not initially encode atoms or crystals as application-specific special cases. They should be expressible through reusable primitives.

## QVIS-002

```text
feat(qvis): add reusable quantum scene renderer
```

Build the renderer as an application-independent package, preferably around the existing `packages/quantum-3d/` boundary.

Support:

```text
points
lines
vectors
meshes
labels
scalar coloring
camera controls
visibility
selection
inspection
artifact loading
```

Preserve the existing Bloch sphere as an early specialized consumer.

## QVIS-003

```text
feat(qvis): add orbital scalar and complex-field visualization
```

Add visualization primitives for:

```text
psi(r)
|psi(r)|^2
arg psi(r)
Re psi(r)
Im psi(r)
```

Support:

- volumetric scalar fields
- complex fields
- probability density
- phase
- signed lobes
- isosurfaces
- slices
- threshold controls

Use the binary data plane for numerical grids.

## QVIS-004

```text
feat(qvis): add atomic orbital laboratory
```

First complete field-based scientific laboratory.

Initial examples:

```text
1s
2s
2p
3s
3p
3d
```

Views:

```text
|psi|^2 isosurface
Re psi signed lobes
Im psi
phase
radial probability
angular structure
```

Synchronize orbital parameters, 3D fields, 2D slices, and radial plots.

## QVIS-005

```text
feat(qvis): add lattice and crystal scene primitives
```

Add reusable representations for:

```text
sites
bonds
unit cells
basis sites
translation vectors
supercells
periodic boundaries
```

Initial targets:

```text
1D chain
SSH chain
square lattice
honeycomb lattice
simple cubic lattice
```

This is a visualization/data-model milestone, not yet a full crystallography package.

## QVIS-006

```text
feat(qvis): add reciprocal-space and Brillouin-zone visualization
```

Represent:

```text
reciprocal lattice vectors
high-symmetry points
high-symmetry paths
Brillouin-zone boundaries
k-points
selected k-state
```

Where meaningful, synchronize real-space and reciprocal-space selection.

## QVIS-007

```text
feat(qvis): add band-structure scene integration
```

Support `E_n(k)` data.

Views:

```text
1D high-symmetry band paths
2D band surfaces
selected band
selected k-point
gap readouts
crossings
avoided crossings
```

Synchronize band plots, k-space scenes, and state metadata.

## QVIS-008

```text
feat(qvis): add Berry curvature and topology visualization
```

Support supplied quantities such as:

```text
Berry connection
Berry curvature
Berry phase paths
spin/pseudospin textures
topological singularities
Weyl points
nodal structures
```

Initial model targets can include:

```text
SSH
Rice-Mele
QWZ
BHZ
BBH
Kitaev chain
Weyl
Landau / Hall
```

The visualization layer displays computed quantities; it should not silently infer topology itself.

## QVIS-009

```text
feat(qvis): add quantum field streaming and level-of-detail
```

Prepare for large datasets with:

```text
chunked artifacts
lazy loading
bounded memory
progressive refinement
LOD
cancellation
cache reuse
```

Target data classes:

```text
large orbital grids
wavefunction fields
density fields
large k-space grids
band surfaces
Berry-curvature maps
time-dependent field sequences
```

Preserve:

```text
JSON   = control and metadata
binary = numerical data
```

## QVIS-010

```text
release(qvis): freeze portable quantum visualization v0.1
```

Acceptance target:

```text
quantum-scene/v1 validation          ✓
desktop renderer                     ✓
web-compatible renderer boundary     ✓
binary artifact verification         ✓
atomic orbital scene                 ✓
lattice scene                        ✓
Brillouin-zone scene                 ✓
band visualization                   ✓
Berry/topology visualization         ✓
large-data path                      ✓
selection/inspection                 ✓
provenance                           ✓
```

---

# 3. M3D-Q — Math3D Quantum Integration

## Goal

Make Math3D an advanced geometry and field viewer for Quantum Lab without directly coupling the two applications.

## M3D-Q01

```text
arch(math3d-quantum): define quantum scene importer
```

Implement:

```text
quantum-scene/v1
        |
        v
Math3D import adapter
        |
        v
Math3D scene
```

Validate schema version and artifact integrity before import.

## M3D-Q02

```text
feat(math3d-quantum): import atomic and orbital scenes
```

Support:

```text
orbital isosurfaces
probability density
phase/sign visualization
atomic annotations
field slices
```

Preserve scientific metadata and provenance.

## M3D-Q03

```text
feat(math3d-quantum): add scalar and complex quantum field rendering
```

Map generic quantum fields onto Math3D geometry/field infrastructure.

Do not duplicate physics computation inside Math3D.

## M3D-Q04

```text
feat(math3d-quantum): add lattice and crystal visualization
```

Import:

```text
sites
bonds
basis
unit cells
supercells
translation vectors
```

Use existing Math3D inspection and selection patterns.

## M3D-Q05

```text
feat(math3d-quantum): add reciprocal lattice and Brillouin zones
```

Render:

```text
reciprocal basis
Brillouin-zone geometry
high-symmetry points
high-symmetry paths
selected k-points
```

## M3D-Q06

```text
feat(math3d-quantum): add band surfaces
```

Support geometric visualization of `E_n(kx,ky)` and bounded higher-dimensional reciprocal-space datasets.

Provide:

```text
band selection
surface inspection
gap/crossing markers
k-point picking
```

## M3D-Q07

```text
feat(math3d-quantum): add Berry curvature and quantum vector fields
```

Render supplied:

```text
Berry curvature
Berry connection where appropriate
spin textures
pseudospin textures
other quantum vector fields
```

## M3D-Q08

```text
feat(math3d-quantum): add topological Hamiltonian visualization
```

Target:

```text
QWZ
BHZ
BBH
Kitaev
Weyl
nodal structures
Landau / Hall
```

Potential views:

```text
band inversion
edge/bulk distinction
Weyl nodes
Berry-flux structures
topological-transition sweeps
```

## M3D-Q09

```text
feat(math3d-quantum): add Quantum Lab to Math3D round trip
```

Expose:

```text
[ Open in Math3D ]
```

Flow:

```text
QLab result
    |
    v
QuantumScene
    |
    v
portable serialized scene
    |
    v
Math3D
    |
    v
import + inspect
```

No hidden QLab-specific scene mutation should be required.

## M3D-Q10

```text
release(math3d-quantum): freeze QLab Math3D integration v0.1
```

Acceptance:

```text
portable scene import              ✓
artifact verification              ✓
orbitals                           ✓
scalar/complex fields              ✓
lattices                           ✓
Brillouin zones                    ✓
band surfaces                      ✓
Berry/vector fields                ✓
topological scenes                 ✓
QLab -> Math3D handoff             ✓
provenance retained                ✓
```

---

# 4. Hamiltonian Atlas — Parallel Track A

The Hamiltonian Atlas proceeds in parallel.

Its responsibility is:

```text
Hamiltonian Atlas = model definitions + formulas + metadata + references
QLab              = computation and scientific workflows
QVIS              = portable visualization
Math3D            = advanced geometry/field inspection
```

Desired relationship:

```text
Hamiltonian Atlas entry
        |
        +-- formula
        +-- basis
        +-- parameters
        +-- assumptions
        +-- symmetries
        +-- conserved quantities
        +-- important limits
        +-- observables
        +-- chapter references
        +-- computational examples
                |
                v
             QLab model
                |
                v
          QuantumResult
                |
                v
          QuantumScene
```

Representative Atlas families:

```text
free particle
harmonic oscillator
two-level systems
spin Hamiltonians
Zeeman / Stark
Landau-Zener
Jaynes-Cummings
Rabi
tight-binding
SSH
Rice-Mele
QWZ
BHZ
BBH
Kitaev chain
Weyl
Landau / Hall
Hubbard-like models
BCS-like models
```

Long term, the Atlas should become the metadata source for the QLab model browser rather than creating a second independent model registry.

---

# 5. Recommended Development Order

```text
QLAB-025
   |
   v
QVIS-001 -> QVIS-002 -> QVIS-003 -> QVIS-004 -> QVIS-005
   -> QVIS-006 -> QVIS-007 -> QVIS-008 -> QVIS-009 -> QVIS-010
   |
   v
M3D-Q01 -> M3D-Q02 -> M3D-Q03 -> M3D-Q04 -> M3D-Q05
   -> M3D-Q06 -> M3D-Q07 -> M3D-Q08 -> M3D-Q09 -> M3D-Q10
```

Track A proceeds in parallel:

```text
A1 -> A2 -> A3 -> A4 -> A5 -> ...
 |
 +---- progressively feeds QLab model metadata
```

QVIS and M3D-Q may overlap after `quantum-scene/v1` becomes sufficiently stable; M3D-Q01 does not necessarily need to wait for every QVIS visualization feature.

---

# 6. Milestone Gates

## Gate 1 — QLAB complete

After QLAB-025:

```text
desktop client       established
web client           established
worker contracts     stable
physics engines      established
remote execution     established
```

Visualization expansion moves to QVIS rather than extending QLAB.

## Gate 2 — Portable visualization

After QVIS-010:

```text
QuantumResult
     |
     v
QuantumScene
```

is a stable interoperability boundary.

## Gate 3 — Math3D interoperability

After M3D-Q10:

```text
QLab
  |
  v
QuantumScene
  |
  v
Math3D
```

works without direct application coupling.

---

# 7. Long-Term Architecture

```text
                       THEORY / TEXTBOOK
                              |
                              v
                     HAMILTONIAN ATLAS
                              |
                   machine-readable models
                              |
                              v
                    QUANTUM COMPUTATION
                              |
                +-------------+-------------+
                |             |             |
              QuTiP         Native       optional
                                        engines
                |             |             |
                +-------------+-------------+
                              |
                              v
                        QuantumResult
                              |
                              v
                        QuantumScene
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
         QLab Desktop      QLab Web         Math3D
```

This gives four clean responsibilities:

```text
Hamiltonian Atlas   model knowledge
Quantum Lab         computation and scientific workflows
QVIS                portable quantum visualization
Math3D              advanced geometry, field and topology inspection
```

---

# 8. Immediate Next Commit

After completing and freezing QLAB-025:

```text
QVIS-001
arch(qvis): define portable quantum scene contract
```

Primary deliverables:

```text
quantum-scene/v1 schema
TypeScript types
Python models
runtime validators
compatibility fixtures
artifact-reference contract
coordinate/unit conventions
provenance/source conventions
scene examples
contract tests
```

Suggested first fixtures:

```text
bloch-vector.scene.json
orbital-field.scene.json
ssh-chain.scene.json
brillouin-zone.scene.json
band-surface.scene.json
berry-field.scene.json
```

These fixtures establish the interoperability vocabulary before QVIS-002 begins rendering it.

---

# 9. Numbering Freeze

Use these namespaces going forward:

```text
QLAB-001 ... QLAB-025     Quantum Lab application/platform
A1 ...                    Hamiltonian Atlas
QVIS-001 ... QVIS-010     portable quantum visualization
M3D-Q01 ... M3D-Q10       Math3D quantum integration
```

This prevents responsibilities from becoming mixed and keeps the history readable.

