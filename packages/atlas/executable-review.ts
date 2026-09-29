import { ATLAS_RECONCILIATION, type AtlasReconciliationEntry } from "./reconciliation";

export interface ScientificMappingReview {
  conversion: string;
  basis: string;
  boundedScope: string;
  evidence: readonly string[];
}
/** Review evidence only. The existing atlasBinding switch remains execution authority. */
export const BINDING_REVIEWS: Record<string, ScientificMappingReview> = {
  two_level_pauli: {
    conversion: "delta=2*d_z, omega=2*d_x; d_0=d_y=0; hbar=1.",
    basis: "Pauli sigma_z basis, same ordering; no global shift in this subspace.",
    boundedScope: "Real 2x2 Hermitian spectrum, not arbitrary four-coefficient Pauli input.",
    evidence: ["tests/atlas.test.ts", "workers/quantum-python/tests/test_atlas_mapping.py"],
  },
  semiclassical_rabi_drive: {
    conversion: "delta=omega_0, amplitude=2*Omega, frequency=omega_d, phase=phi; hbar=1.",
    basis: "Lab sigma_z eigenbasis; Atlas drive is classical, not a quantized oscillator.",
    boundedScope: "Existing bounded time samples and initial basis state; no pulse sequence inferred.",
    evidence: ["tests/atlas.test.ts", "workers/quantum-python/tests/test_atlas_mapping.py", "workers/quantum-python/tests/test_evolution.py"],
  },
  landau_zener: {
    conversion: "sweepRate=v, gap=Delta, bias=0; hbar=1.",
    basis: "Diabatic sigma_z basis; finite-time populations are not an asymptotic S matrix.",
    boundedScope: "Finite passage only, with explicit simulation window.",
    evidence: ["tests/atlas.test.ts", "workers/quantum-python/tests/test_atlas_mapping.py", "workers/quantum-python/tests/test_evolution.py"],
  },
  floquet_two_level: {
    conversion: "delta=Delta, amplitude=2*A, frequency=omega, phase=0; hbar=1.",
    basis: "Pauli basis; quasienergies modulo omega; evolution wire operation is unchanged.",
    boundedScope: "Existing strong-drive evolution and period-propagator diagnostics, not a new floquet job.",
    evidence: ["tests/atlas.test.ts", "workers/quantum-python/tests/test_atlas_mapping.py", "workers/quantum-python/tests/test_floquet.py"],
  },
  jaynes_cummings: {
    conversion: "qubitFrequency=omega_q, cavityFrequency=omega_c, coupling=g; subtract omega_q/2 from lab absolute energies.",
    basis: "Atlas Fock x qubit to lab qubit x Fock by unitary permutation; qubit |g>,|e> projectors explicit.",
    boundedScope: "Six-level default Fock cutoff is a Lab choice, not an Atlas parameter; monitor cutoff occupation.",
    evidence: ["tests/atlas.test.ts", "workers/quantum-python/tests/test_atlas_mapping.py", "workers/quantum-python/tests/test_cavity.py"],
  },
  rabi: {
    conversion: "qubitFrequency=omega_q, cavityFrequency=omega_c, coupling=g; subtract omega_q/2 from lab absolute energies.",
    basis: "Fock x qubit to qubit x Fock permutation; counter-rotating terms retained.",
    boundedScope: "Eight-level default Fock cutoff; not collective Dicke or semiclassical Rabi dynamics.",
    evidence: ["tests/atlas.test.ts", "workers/quantum-python/tests/test_atlas_mapping.py", "workers/quantum-python/tests/test_cavity.py"],
  },
  ising_chain: {
    conversion: "interaction=J, transverse=h, longitudinal=0; Pauli, not spin-1/2 operators.",
    basis: "Full computational tensor basis with explicit -J ZZ and -h X signs.",
    boundedScope: "Four-site open default, finite chain; no decoding, thermodynamic limit or stabilizer computation.",
    evidence: ["tests/atlas.test.ts", "workers/quantum-python/tests/test_atlas_mapping.py", "workers/quantum-python/tests/test_many_body.py"],
  },
  ssh: {
    conversion: "t1=t_1, t2=t_2; lattice spacing and hopping energy convention unchanged.",
    basis: "Open-chain |n,A>,|n,B>; Bloch d_y=+t2*sin(k), explicit k ordering.",
    boundedScope: "16-cell default, 101 k samples; winding undefined at bulk gap closure.",
    evidence: ["tests/atlas.test.ts", "workers/quantum-python/tests/test_atlas_mapping.py", "workers/quantum-python/tests/test_topology.py"],
  },
  qwz: {
    conversion: "mass=m; hopping, spacing, hbar=1; lower occupied band.",
    basis: "H=sin(kx) sigma_x+sin(ky) sigma_y+(m+cos(kx)+cos(ky)) sigma_z.",
    boundedScope: "21x21 default mesh; gapless and unresolved invariants are not verified integers.",
    evidence: ["tests/atlas.test.ts", "workers/quantum-python/tests/test_atlas_mapping.py", "workers/quantum-python/tests/test_topology.py"],
  },
};

export const ADDITIONAL_MAPPING_REVIEWS: Record<string, string> = {
  coulomb_one_body: "Adapter candidate only: Atlas reduced mass m must be fixed to electron mass in declared atomic units, kappa=Z in 1..6 integer charge, hbar=1. Existing hydrogenic n<=3 is a state selection, not the full Coulomb spectrum. Require explicit units, mass restriction and energy/radial checks before enabling.",
  spin_half_zeeman: "Adapter candidate only: derive gyromagnetic sign and hbar/2 factors, restrict transverse field to the real x-z plane, specify physical energy scale. The full vector/y component needs a model extension.",
  rotating_frame_qubit: "New effective-model path required: specify frame, detuning sign, rotation and RWA validity. A lab-frame cosine solver is not the same result contract semantics.",
  ramsey_sequence_effective: "Pulse schedule and phase conventions are missing; continuous drive must not substitute for a Ramsey sequence.",
  harmonic_oscillator: "A cavity component is not a standalone oscillator job; define Fock/position output, cutoff and analytic ladder tests.",
  driven_harmonic_oscillator: "Standalone drive/displacement and truncation diagnostics are needed; open JC has an additional qubit and dissipation.",
  dispersive_jc: "Source uses atom x cavity and rotating-frame H_eff=(Delta+chi)Pe+chi*n*sigma_z, chi=g^2/Delta. Freeze a nonzero-detuning validity domain, n_crit, state/basis/global-shift conversions and compare to full JC before integration.",
  tavis_cummings: "Source uses emitters x cavity, rotating-frame Delta*sum(Pe)+g*(a^dag J_-+a J_+). New collective parameters, 2^N*cutoff budget and result shapes are needed; test N=1 limit, sqrt(N) bright coupling and dark states. Do not map to single-emitter JC.",
  dicke: "Collective model required; one-qubit Rabi is only the N=1 restriction, not an enabled mapping.",
  repetition_code_ising: "Existing Ising diagonalization is not QEC execution. Specify stabilizers, logical operators and decoding separately.",
  surface_code_stabilizer: "reference_lab program is not a one-to-one Hamiltonian solver. Separate code geometry, stabilizers, syndrome and numerical result boundaries; test commutation and logical dimension.",
  surface_code_planar: "Reference program includes decoding workflows, not an enabled planar-code Lab job. Require bounded code size, syndrome/logical conventions and failure-rate statistics.",
  syndrome_defect_effective: "A reference_lab syndrome program does not establish an effective-defect Hamiltonian spectrum or transport solver. Define that scientific mapping independently.",
};

export interface ExecutableReview {
  atlasId: string;
  disposition: "preserved-binding" | "adapter-candidate" | "new-model-required" | "reference-only";
  enabled: boolean;
  scientificMapping: ScientificMappingReview | null;
  nextRequirement: string;
}
function review(row: AtlasReconciliationEntry): ExecutableReview {
  const scientificMapping = BINDING_REVIEWS[row.atlasId] ?? null;
  if (Boolean(row.lab) !== Boolean(scientificMapping)) throw new Error(`Unreviewed binding ${row.atlasId}`);
  return {
    atlasId: row.atlasId,
    disposition: row.lab ? "preserved-binding" : ["coulomb_one_body", "spin_half_zeeman"].includes(row.atlasId)
      ? "adapter-candidate" : ADDITIONAL_MAPPING_REVIEWS[row.atlasId] ? "new-model-required" : "reference-only",
    enabled: Boolean(row.lab),
    scientificMapping,
    nextRequirement: ADDITIONAL_MAPPING_REVIEWS[row.atlasId] ?? (row.lab
      ? "Preserve the current tested conversion, host controls and runtime capability gates; wider scope requires additive tests."
      : "No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling."),
  };
}
export const EXECUTABLE_REVIEWS = ATLAS_RECONCILIATION.map(review);
export const executableReview = (id: string) => EXECUTABLE_REVIEWS.find(row => row.atlasId === id);
