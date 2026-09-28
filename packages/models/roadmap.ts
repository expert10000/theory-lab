/** Delivery IDs are historical; imported-plan coverage must not relabel them. */
export interface RoadmapEntry {
  id: string;
  title: string;
  state: string;
  detail: string;
}
export const DELIVERED_QVIS: RoadmapEntry[] = [
  {
    id: "QVIS-001",
    title: "Portable quantum-scene/v1 contract",
    state: "Implemented",
    detail: "Strict TS/Python validation and bounded binary artifacts.",
  },
  {
    id: "QVIS-002",
    title: "Reusable scene renderer & verified bundle export",
    state: "Implemented",
    detail:
      "Browser-compatible package; product Scenes navigation is desktop-only.",
  },
  {
    id: "QVIS-003",
    title: "Scalar/complex fields, isosurfaces & slices",
    state: "Implemented",
    detail: "Bounded regular grids, not large-data streaming.",
  },
  {
    id: "QVIS-004",
    title: "Hydrogenic orbital fields & radial diagnostics",
    state: "Implemented",
    detail: "Analytic single-electron 1s–3d, not many-electron chemistry.",
  },
  {
    id: "QVIS-005",
    title: "SSH bonds, Ising magnetization & QWZ axes",
    state: "Implemented",
    detail: "Existing-model scenes, not a generic crystal framework.",
  },
  {
    id: "QVIS-006",
    title: "Read-only verified scene bundle import",
    state: "Implemented",
    detail:
      "This delivered ID is not the supplied plan's reciprocal-space milestone.",
  },
  {
    id: "QVIS-007",
    title: "Orbital convergence studies & radial nodes",
    state: "Implemented",
    detail:
      "This delivered ID is not the supplied plan's portable-band milestone.",
  },
];
export const POST_QVIS: RoadmapEntry[] = [
  {
    id: "QVIS-008",
    title: "Generic lattice cells & bounded supercell fixtures",
    state: "Planned",
    detail:
      "Square, honeycomb and simple cubic; explicit basis, bonds and translations. Geometry is not a computed physics run.",
  },
  {
    id: "QVIS-009",
    title: "Reciprocal basis & Brillouin-zone inspection",
    state: "Planned",
    detail:
      "Supplied high-symmetry points/paths, boundaries and k-point inspection.",
  },
  {
    id: "QVIS-010",
    title: "Portable band paths & surfaces",
    state: "Planned",
    detail:
      "Start with verified SSH/QWZ energies and synchronize band/k-point/gap inspection.",
  },
  {
    id: "QVIS-011",
    title: "Supplied Berry/vector/topology scene extensions",
    state: "Planned",
    detail:
      "Display supplied quantities; do not infer invariants or invent unsupported physics models.",
  },
  {
    id: "QVIS-012",
    title: "Chunked artifacts, lazy verification & LOD",
    state: "Planned",
    detail:
      "Bounded memory, progressive refinement, cancellation and cache reuse.",
  },
  {
    id: "QVIS-013",
    title: "Portable visualization v0.1 release gate",
    state: "Planned",
    detail:
      "Requires missing acceptance targets, including product web Scenes; not a completed release.",
  },
];
export const SOURCE_PLAN_COVERAGE: RoadmapEntry[] = [
  {
    id: "QVIS-001",
    title: "Scene contract",
    state: "Implemented (bounded)",
    detail: "Strict shared schema, IDs, units, references and verification.",
  },
  {
    id: "QVIS-002",
    title: "Reusable renderer",
    state: "Implemented (bounded)",
    detail:
      "Independent browser tests pass; product web Scenes navigation is not shipped.",
  },
  {
    id: "QVIS-003",
    title: "Scalar/complex visualization",
    state: "Implemented (bounded)",
    detail:
      "Regular fields, density/phase/sign, slices and threshold surfaces.",
  },
  {
    id: "QVIS-004",
    title: "Atomic orbital laboratory",
    state: "Implemented (bounded)",
    detail: "Analytic single-electron hydrogenic examples only.",
  },
  {
    id: "QVIS-005",
    title: "Generic lattice/crystal primitives",
    state: "Partial",
    detail:
      "SSH/Ising sites and bonds exist; square/honeycomb/cubic cells and supercells remain planned.",
  },
  {
    id: "QVIS-006",
    title: "Reciprocal-space and Brillouin zones",
    state: "Partial",
    detail:
      "QWZ perimeter/axes exist; generic reciprocal bases and symmetry paths do not.",
  },
  {
    id: "QVIS-007",
    title: "Portable band integration",
    state: "Planned",
    detail: "SSH has a 2D band plot, not a portable band-scene workflow.",
  },
  {
    id: "QVIS-008",
    title: "Berry/topology visualization",
    state: "Partial",
    detail:
      "Supplied QWZ curvature/invariant exists; the broader model/vector vocabulary does not.",
  },
  {
    id: "QVIS-009",
    title: "Large-data streaming and LOD",
    state: "Planned",
    detail: "Current 16 MiB and grid limits are not streaming.",
  },
  {
    id: "QVIS-010",
    title: "Visualization release freeze",
    state: "Release gate pending",
    detail:
      "Reference acceptance checkmarks are targets, not completion evidence.",
  },
  {
    id: "M3D-Q01–Q10",
    title: "Separate Math3D integration track",
    state: "External / not assessed",
    detail:
      "No Math3D implementation is claimed or changed by this Lab roadmap update.",
  },
  {
    id: "Track A",
    title: "Atlas metadata unification",
    state: "Partial",
    detail:
      "Pinned catalog and tested bindings exist; metadata unification and broader model families remain planned.",
  },
];
