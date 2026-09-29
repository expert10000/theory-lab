/** Compatibility review of pinned Track C ideas, not a second visualization contract. */
export interface SceneCompatibilityReview {
  id: "C2" | "C3" | "C4" | "C5" | "C6" | "C7" | "C8";
  title: string;
  sourceDocument: string;
  existingModules: readonly string[];
  vocabulary: readonly string[];
  compatibleScope: string;
  requiredConversion: string;
  remainingGap: string;
  evidence: readonly string[];
}
export const SCENE_COMPATIBILITY_REVIEWS: SceneCompatibilityReview[] = [
  {
    id: "C2",
    title: "Bloch vectors and trajectories",
    sourceDocument: "TRACK_C_C2_BLOCH_QVIS.md",
    existingModules: ["packages/quantum-scene/from-result.ts"],
    vocabulary: ["objects.vectors", "objects.polyline"],
    compatibleScope:
      "Existing verified two-level evolution supplies Bloch observables and time-ordered trajectory samples.",
    requiredConversion:
      "Preserve dimensionless coordinates, sample order and supplied vectors; no density-matrix or Ramsey solver inferred.",
    remainingGap:
      "B's free-form states/series envelopes are not accepted worker results. Other producers need explicit validated numerical adapters.",
    evidence: ["tests/scenes.test.ts"],
  },
  {
    id: "C3",
    title: "Finite sites, bonds and observables",
    sourceDocument: "TRACK_C_C3_LATTICE_QVIS.md",
    existingModules: [
      "packages/quantum-scene/examples.ts",
      "packages/quantum-scene/from-result.ts",
    ],
    vocabulary: [
      "objects.point-cloud",
      "objects.segments",
      "objects.scalars",
      "lattice",
    ],
    compatibleScope:
      "Existing bounded open geometry, Ising magnetization and SSH site density/bonds are already portable.",
    requiredConversion:
      "Resolve site IDs to explicit positions and bond endpoints; carry scalar units, no distance-inferred hopping/connectivity.",
    remainingGap:
      "Arbitrary site labels, multiple observable dictionaries and QEC semantics need explicit authored adapters/metadata; generic objects are not a solver.",
    evidence: ["tests/lattice-scenes.test.ts"],
  },
  {
    id: "C4",
    title: "Momentum-resolved bands",
    sourceDocument: "TRACK_C_C4_BAND_QVIS.md",
    existingModules: ["packages/quantum-scene/bands.ts"],
    vocabulary: ["bands", "reciprocal", "objects.polyline", "objects.mesh"],
    compatibleScope:
      "Supplied SSH paths and QWZ surfaces already use explicit momentum, energies and energy units.",
    requiredConversion:
      "C 2D arrays are [ky][kx]; Lab's QWZ arrays are kx-major/ky-fastest. Explicitly reorder coordinates and every energy band together. Preserve energy reference as a declared conversion, not an invented offset.",
    remainingGap:
      "Additional model band solvers, arbitrary band counts/domain conventions and dedicated Fermi-reference metadata need reviewed adapters/extensions.",
    evidence: ["tests/band-scenes.test.ts"],
  },
  {
    id: "C5",
    title: "Berry, vectors and invariants",
    sourceDocument: "TRACK_C_C5_BERRY_QVIS.md",
    existingModules: [
      "packages/quantum-scene/from-result.ts",
      "packages/quantum-scene/index.ts",
    ],
    vocabulary: [
      "topology.quantities",
      "topology.invariants",
      "objects.vectors",
      "objects.scalars",
    ],
    compatibleScope:
      "Supplied QWZ curvature, SSH Berry phase and explicit vector quantities are already supported.",
    requiredConversion:
      "Preserve grid ordering, gauge/convention text, units, method and supplied/verified/undefined/unresolved invariant status. Never round or compute topology in the viewer.",
    remainingGap:
      "Broader Hall/Weyl/BHZ/Haldane results need worker calculations; arbitrary gauge metadata needs explicit mapping, not silent defaults.",
    evidence: ["tests/topology-scenes.test.ts"],
  },
  {
    id: "C6",
    title: "Spatial density and phase",
    sourceDocument: "TRACK_C_C6_WAVEFUNCTION_QVIS.md",
    existingModules: [
      "packages/quantum-scene/grid-order.ts",
      "packages/quantum-scene/from-result.ts",
    ],
    vocabulary: [
      "fields.scalar-field",
      "fields.complex-field",
      "objects.polyline",
      "objects.mesh",
    ],
    compatibleScope:
      "Bounded regular 3D densities map to scalar fields; existing orbital results already supply real/imaginary complex amplitudes.",
    requiredConversion:
      "Transpose [z][y][x] to xyz-z-fastest with the tested grid utility. Density alone stays scalar: no amplitude, phase, normalization or rescaling is inferred. Explicit density+phase requires a separately tested amplitude reconstruction if wanted.",
    remainingGap:
      "Nonuniform grids and 1D/2D fields need separate curve/mesh adapters. Generic Fock/eigenvector coefficients are not spatial wavefunctions.",
    evidence: ["tests/grid-order.test.ts", "tests/orbital.test.ts"],
  },
  {
    id: "C7",
    title: "Atomic state density",
    sourceDocument: "TRACK_C_C7_ATOMIC_DENSITY_QVIS.md",
    existingModules: [
      "packages/quantum-scene/grid-order.ts",
      "packages/models/orbital.ts",
    ],
    vocabulary: ["fields.scalar-field", "annotations", "provenance.parameters"],
    compatibleScope:
      "Existing single-electron analytic orbitals and supplied regular density grids fit bounded fields; labels are descriptive, not calculations.",
    requiredConversion:
      "Keep absolute x/y/z origin, length/density units and state provenance. State/nucleus metadata must be explicit; annotations do not replace typed chemistry semantics.",
    remainingGap:
      "Species, nuclei, arbitrary quantum-number/nodal dictionaries and multi-state comparison need additive typed semantics/UI. No many-electron atomic solver exists.",
    evidence: ["tests/grid-order.test.ts", "tests/orbital.test.ts"],
  },
  {
    id: "C8",
    title: "Periodic crystal geometry",
    sourceDocument: "TRACK_C_C8_CRYSTAL_QVIS.md",
    existingModules: [
      "packages/quantum-scene/examples.ts",
      "packages/quantum-scene/reciprocal.ts",
    ],
    vocabulary: ["lattice", "reciprocal", "objects.segments"],
    compatibleScope:
      "Open square/honeycomb/cubic fixtures and 2pi-dual reciprocal guides already exist; C8 has a broader periodic structure scope.",
    requiredConversion:
      "Fractional-to-Cartesian conversion requires an explicit basis. Validate duality a_i dot b_j=2pi delta_ij; expand integer target-cell offsets without guessing bonds.",
    remainingGap:
      "Periodic bonds, species/orbital metadata and arbitrary crystal construction are genuinely new additive extensions. Do not flatten them into open lattice fixtures and claim equivalence.",
    evidence: [
      "tests/lattice-scenes.test.ts",
      "tests/reciprocal-scenes.test.ts",
    ],
  },
];
