import { ATLAS_RECONCILIATION } from "./reconciliation";
import { EXECUTABLE_REVIEWS } from "./executable-review";

export interface PhysicsGapGroup {
  id: string;
  title: string;
  priority: 1 | 2 | 3 | 4;
  atlasIds: readonly string[];
  kind: "parameter-adapter" | "new-model";
  dependencies: readonly string[];
  reuse: string;
  missing: string;
  acceptance: readonly string[];
}
/** Review backlog, NOT model dispatch, enabled jobs or authorization to implement every item. */
export const PHYSICS_GAP_GROUPS: PhysicsGapGroup[] = [
  {
    id: "G01",
    title: "Restricted Coulomb/Zeeman parameter adapters",
    priority: 1,
    kind: "parameter-adapter",
    atlasIds: ["coulomb_one_body", "spin_half_zeeman"],
    dependencies: [],
    reuse:
      "Existing hydrogenic orbital and real two-level jobs, result verification and desktop controls.",
    missing:
      "Explicit physical unit, reduced-mass and gyromagnetic conventions; full vector/mass scope is not supported by current jobs.",
    acceptance: [
      "Reject unsupported mass, charge, y-field and unit conventions",
      "Verify E_n=-Z^2/(2n^2) and radial moments",
      "Verify Zeeman signs and Pauli factors independently",
      "Enable only the tested restricted mapping",
    ],
  },
  {
    id: "G02",
    title: "Standalone oscillator family",
    priority: 2,
    kind: "new-model",
    atlasIds: [
      "harmonic_oscillator",
      "harmonic_oscillator_nd",
      "driven_harmonic_oscillator",
      "parametric_oscillator",
      "anharmonic_oscillator",
      "double_well",
    ],
    dependencies: [],
    reuse:
      "Cavity Fock mathematics, existing supervised jobs, binary artifacts, sweeps, native/QuTiP comparisons and scalar/complex viewers.",
    missing:
      "Standalone job/results and controls; oscillator component in JC is not an independent solver. Spatial outputs need an explicit basis transform.",
    acceptance: [
      "Start with one-dimensional harmonic E_n=hbar*omega*(n+1/2)",
      "Declare finite cutoff and show convergence/boundary occupation",
      "Independent QuTiP/native spectrum and dynamics checks",
      "Add driven/parametric/anharmonic/ND/double-well scope only with its own tests",
    ],
  },
  {
    id: "G03",
    title: "Spatial potentials and scattering",
    priority: 3,
    kind: "new-model",
    atlasIds: [
      "free_particle",
      "particle_in_box",
      "finite_square_well",
      "delta_potential",
      "linear_potential",
      "central_potential",
    ],
    dependencies: [],
    reuse:
      "Validated field/binary pipeline and offline scene views; no replacement workspace.",
    missing:
      "Grid/basis operators, boundary conditions, bound-versus-continuum semantics, discretization/error controls and solver jobs.",
    acceptance: [
      "Box analytic spectrum and mesh convergence",
      "Separate bound-state normalization from scattering normalization",
      "Explicit potential/length/mass/hbar units",
      "No finite-grid eigenvalues claimed as continuum scattering data",
    ],
  },
  {
    id: "G04",
    title: "Atomic/spin operators beyond restricted qubits",
    priority: 3,
    kind: "new-model",
    atlasIds: [
      "pauli_particle_em",
      "linear_stark",
      "spin_orbit_ls",
      "hyperfine_dipole",
      "spin_one_zfs",
    ],
    dependencies: [],
    reuse:
      "Existing bounded spectra, hydrogenic basis references and scalar-field visualization.",
    missing:
      "Spin-1/angular-momentum/operator products, EM gauge and atomic perturbation bases; hydrogenic labels do not calculate these effects.",
    acceptance: [
      "Explicit basis, degeneracies and spin normalization",
      "Hermiticity and selection-rule tests",
      "Gauge/unit and perturbative-domain documentation",
      "No many-electron chemistry claim",
    ],
  },
  {
    id: "G05",
    title: "Rotating frames and Ramsey sequences",
    priority: 2,
    kind: "new-model",
    atlasIds: ["rotating_frame_qubit", "ramsey_sequence_effective"],
    dependencies: [],
    reuse:
      "Existing evolution solvers, Bloch adapters and comparison diagnostics.",
    missing:
      "Effective frame/RWA semantics, pulse schedule and phase controls; existing continuous-drive lab stays available unchanged.",
    acceptance: [
      "Frame/sign/phase transformation tests",
      "RWA validity range against full drive",
      "Ramsey fringe phase and limiting pulse checks",
      "Explicit time/pulse resolution without invented interpolation",
    ],
  },
  {
    id: "G06",
    title: "Dispersive and collective light–matter models",
    priority: 3,
    kind: "new-model",
    atlasIds: ["dispersive_jc", "tavis_cummings", "dicke"],
    dependencies: [],
    reuse:
      "Existing JC/Rabi labs and pinned source programs as numerical references, not source-path dispatch.",
    missing:
      "Effective-domain controls, emitter counts, collective basis, bounded new jobs/results and observable adapters.",
    acceptance: [
      "Dispersive error scaling versus full JC and n_crit",
      "Tavis N=1 restriction and sqrt(N) bright/dark sectors",
      "Dicke counter-rotating terms and parity",
      "Hilbert dimension/time/cutoff limits and independent engine checks",
    ],
  },
  {
    id: "G07",
    title: "Additional lattice and band Hamiltonians",
    priority: 2,
    kind: "new-model",
    atlasIds: [
      "rice_mele",
      "tight_binding_generic",
      "bloch_two_band",
      "graphene_nn",
      "dirac_2d",
      "haldane",
      "bhz",
      "bbh",
      "weyl_minimal",
      "nodal_line_two_band",
    ],
    dependencies: [],
    reuse:
      "Existing SSH/QWZ topology, band/reciprocal/vector scenes and verified export/import.",
    missing:
      "Explicit per-model matrices, k domains, boundaries, occupied bands, topology algorithms and numerical result adapters. Rice–Mele is a natural first extension, not already implemented.",
    acceptance: [
      "Rice–Mele zero-staggering SSH limit",
      "Hermitian band matrices and independent analytic points",
      "Mesh convergence and gapless/undefined invariant handling",
      "No discrete spectrum relabeled as bands; no automatic topology inference",
    ],
  },
  {
    id: "G08",
    title: "XY and Heisenberg chains",
    priority: 2,
    kind: "new-model",
    atlasIds: ["xy_chain", "heisenberg_chain"],
    dependencies: [],
    reuse:
      "Existing finite-chain native/optional QuSpin path, sweeps and site scenes.",
    missing:
      "XX/YY/ZZ operators and model-specific spin/Pauli conventions; Ising execution remains intact.",
    acceptance: [
      "Small-chain analytic spectra",
      "Spin versus Pauli factor tests",
      "Independent native/QuSpin when installed",
      "Finite-size/open/periodic boundary convergence, no thermodynamic claim",
    ],
  },
  {
    id: "G09",
    title: "Hall and magnetic lattice models",
    priority: 3,
    kind: "new-model",
    atlasIds: ["landau_continuum", "hofstadter", "integer_qh_effective"],
    dependencies: ["G07"],
    reuse:
      "Momentum/band/Berry displays and existing verified/unresolved topology conventions.",
    missing:
      "Magnetic flux/gauge, magnetic unit cells, continuum-versus-lattice basis, occupied bands and transport semantics.",
    acceptance: [
      "Landau ladder and flux/gauge equivalence",
      "Rational-flux magnetic-cell budget",
      "Band/Chern convergence where defined",
      "Do not claim conductivity from a viewer annotation alone",
    ],
  },
  {
    id: "G10",
    title: "Correlated particles and impurity models",
    priority: 4,
    kind: "new-model",
    atlasIds: [
      "hubbard",
      "bose_hubbard",
      "extended_hubbard",
      "t_j_model",
      "heisenberg_from_hubbard",
      "anderson_impurity",
    ],
    dependencies: [],
    reuse:
      "Existing job supervision, persistence, finite-chain controls and native comparison pattern.",
    missing:
      "Fermion/boson statistics, particle sectors, onsite occupancy cutoffs and interaction/operator result shapes; Ising basis is not a Hubbard solver.",
    acceptance: [
      "Noninteracting and isolated-site limits",
      "Fermionic signs and number conservation",
      "Bounded sector/cutoff scaling",
      "Large-U effective exchange checks for the derived Heisenberg entry",
    ],
  },
  {
    id: "G11",
    title: "Superconducting and BdG models",
    priority: 4,
    kind: "new-model",
    atlasIds: ["kitaev_chain", "bcs_reduced", "bdg_swave"],
    dependencies: [],
    reuse:
      "Spectra, finite-site/band displays and topology status semantics; transmon remains a distinct existing circuit lab.",
    missing:
      "Nambu basis, pairing conventions, particle-hole redundancy, finite-chain versus mean-field many-body interpretation.",
    acceptance: [
      "Particle-hole spectral symmetry",
      "Pairing-zero normal-state limit",
      "Finite-size edge versus bulk-gap diagnostics",
      "No transmon-to-BCS equivalence or unsupported self-consistency claim",
    ],
  },
  {
    id: "G12",
    title: "QEC stabilizers, defects and logical Hamiltonians",
    priority: 4,
    kind: "new-model",
    atlasIds: [
      "surface_code_stabilizer",
      "repetition_code_ising",
      "toric_code",
      "surface_code_planar",
      "surface_code_with_fields",
      "color_code_stabilizer",
      "bacon_shor_gauge",
      "stabilizer_penalty_generic",
      "encoded_adiabatic_penalty",
      "logical_pauli_effective",
      "syndrome_defect_effective",
    ],
    dependencies: [],
    reuse:
      "Existing scene primitives for supplied layouts and pinned reference_lab programs; no new QEC workbench framework.",
    missing:
      "Stabilizer/gauge/logical operator jobs, code geometry, defects/noise/decoding semantics and bounded statistical result contracts.",
    acceptance: [
      "Commutation/gauge tests and code-space dimension",
      "Logical versus physical Pauli conventions",
      "Known syndrome/error/decoder limiting cases",
      "Distinguish Hamiltonian spectrum, syndrome observations and Monte Carlo failure rates",
    ],
  },
];

export interface PhysicsGapReview {
  atlasId: string;
  status: "covered-subspace" | "parameter-adapter" | "new-model";
  groupId: string | null;
  priority: 0 | 1 | 2 | 3 | 4;
  scope: string;
}
export const PHYSICS_GAP_REVIEWS: PhysicsGapReview[] = ATLAS_RECONCILIATION.map(
  (row) => {
    const matches = PHYSICS_GAP_GROUPS.filter((g) =>
      g.atlasIds.includes(row.atlasId),
    );
    if (row.lab) {
      if (matches.length)
        throw new Error(`Bound model classified as missing: ${row.atlasId}`);
      return {
        atlasId: row.atlasId,
        status: "covered-subspace",
        groupId: null,
        priority: 0,
        scope: row.lab.implementation.scope,
      };
    }
    if (matches.length !== 1)
      throw new Error(`Gap review must cover ${row.atlasId} exactly once`);
    const g = matches[0];
    return {
      atlasId: row.atlasId,
      status: g.kind,
      groupId: g.id,
      priority: g.priority,
      scope: EXECUTABLE_REVIEWS.find((r) => r.atlasId === row.atlasId)!
        .nextRequirement,
    };
  },
);
export const physicsGapReview = (id: string) =>
  PHYSICS_GAP_REVIEWS.find((r) => r.atlasId === id);
