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
      "Shared desktop/web viewers; verified desktop export and read-only browser imports.",
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
  {
    id: "QVIS-008",
    title: "Generic lattice cells & bounded supercell fixtures",
    state: "Implemented",
    detail:
      "Square, honeycomb and simple cubic; explicit basis, bonds and translations. Geometry is not a computed physics run.",
  },
  {
    id: "QVIS-009",
    title: "Reciprocal basis & Brillouin-zone inspection",
    state: "Implemented",
    detail:
      "Supplied high-symmetry points/paths, boundaries and k-point inspection.",
  },
  {
    id: "QVIS-010",
    title: "Portable band paths & surfaces",
    state: "Implemented",
    detail:
      "Verified supplied SSH/QWZ energies, synchronized band/k-point/gap inspection and offline bundles. No inferred topology.",
  },
  {
    id: "QVIS-011",
    title: "Supplied Berry/vector/topology scene extensions",
    state: "Implemented",
    detail:
      "Display supplied quantities; do not infer invariants or invent unsupported physics models.",
  },
  {
    id: "QVIS-012",
    title: "Chunked artifacts, lazy verification & LOD",
    state: "Implemented",
    detail:
      "Separate bounded multilevel bundles, lazy 64 KiB chunks, 4 MiB cache, retained verified view on cancellation and explicit display subsets.",
  },
  {
    id: "QVIS-013",
    title: "Portable visualization v0.1 release gate",
    state: "Implemented",
    detail:
      "Bounded v0.1 acceptance: desktop/web Scenes, offline imports, strict CSP, compatibility, integrity and documented limits.",
  },
];
export const POST_QVIS: RoadmapEntry[] = [];
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
      "Shared renderer, desktop export and product web Scenes with read-only saved views/offline imports.",
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
      "Square/honeycomb/cubic open supercells, basis and translations now exist. Arbitrary crystals and periodic bonds are not implemented.",
  },
  {
    id: "QVIS-006",
    title: "Reciprocal-space and Brillouin zones",
    state: "Partial",
    detail:
      "Square/honeycomb/cubic primitive fixtures and QWZ guides now have explicit dual bases, named points and paths. No arbitrary-crystal BZ construction.",
  },
  {
    id: "QVIS-007",
    title: "Portable band integration",
    state: "Implemented (bounded)",
    detail: "Portable SSH paths and QWZ surfaces with supplied worker energies, shared selection and offline inspection; no arbitrary-crystal bands.",
  },
  {
    id: "QVIS-008",
    title: "Berry/topology visualization",
    state: "Partial",
    detail:
      "Supplied scalar/vector/phase quantities and reported invariants; SSH/QWZ plus explicit vector fixtures. Additional model engines remain future work.",
  },
  {
    id: "QVIS-009",
    title: "Large-data streaming and LOD",
    state: "Implemented (bounded)",
    detail: "Separate multilevel bundles with lazy verified chunks and cache/cancellation; current per-level grid/memory bounds remain. No unlimited volumes or time player.",
  },
  {
    id: "QVIS-010",
    title: "Visualization release freeze",
    state: "Implemented (bounded)",
    detail:
      "Windows Electron/Chrome acceptance and compatibility/limits recorded in RELEASE_QVIS_V0.1.md; no Math3D or unlimited-volume claim.",
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
