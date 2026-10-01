import type { QuantumJob } from "../contracts";
import {
  ATLAS_ENTRIES,
  ATLAS_SOURCE_BINDINGS,
  type TheorySourceBinding,
} from "./index";
import { atlasBinding, type AtlasBinding } from "./bindings";

type LabModelId = QuantumJob["model"]["type"];
type Operation = QuantumJob["operation"];
export interface LabImplementation {
  module: string;
  operations: readonly Operation[];
  engines: readonly QuantumJob["engine"][];
  webControl: boolean;
  gatewayOperations: readonly Operation[];
  sceneViews: readonly ("standard" | "bands")[];
  sceneOperation: Operation | null;
  scope: string;
}
const implementation = (
  module: string,
  operations: LabImplementation["operations"],
  engines: LabImplementation["engines"],
  webControl: boolean,
  gatewayOperations: LabImplementation["gatewayOperations"],
  sceneViews: LabImplementation["sceneViews"],
  scope: string,
): LabImplementation => ({
  module,
  operations,
  engines,
  webControl,
  gatewayOperations,
  sceneViews,
  sceneOperation: sceneViews.length ? operations[0] : null,
  scope,
});

/** Existing code inventory, not a new execution registry. Engine availability is runtime-reported. */
export const LAB_IMPLEMENTATIONS: Record<LabModelId, LabImplementation> = {
  anharmonic_oscillator: implementation("packages/models/oscillator-anharmonic.ts", ["oscillator_anharmonic"], ["native", "qutip"], false, [], [],
    "D1: bounded m=1 confining quartic oscillator in a truncated harmonic Fock basis; reviewed eigenpairs, no automatic Atlas binding, web/scene/Math3D path or double-well scope."),
  parametric_oscillator: implementation("packages/models/oscillator-parametric.ts", ["oscillator_parametric"], ["native", "qutip"], false, [], [],
    "D1: bounded stable quadratic coupling, vacuum input and finite Fock spectrum/dynamics with squeezing diagnostics. Atlas default remains reference-only until mapping review; no web/scene/Math3D coupling."),
  damped_harmonic_oscillator: implementation("packages/models/oscillator-damped.ts", ["oscillator_damped"], ["native", "qutip"], false, [], [],
    "D1: bounded loss/thermal Lindblad oscillator in a finite Fock basis. No Atlas binding, web computation, scene adapter or Math3D coupling."),
  driven_harmonic_oscillator: implementation("packages/models/oscillator-drive.ts", ["oscillator_drive", "oscillator_pulse"], ["native", "qutip"], false, [], [],
    "D1: bounded monochromatic and declarative Gaussian complex forcing (packages/models/oscillator-pulse.ts), Fock/projected-coherent inputs, dimensionless q,p and hbar=1. Includes omega/2 Atlas energy offset; existing Atlas preset remains monochromatic. No arbitrary waveform, damping, parametric/anharmonic/ND or scene/Math3D adapter."),
  harmonic_oscillator: implementation("packages/models/oscillator.ts", ["oscillator", "oscillator_evolve"], ["native", "qutip"], false, [], [],
    "D1: static spectrum/stationary density plus bounded free Fock/coherent evolution (packages/models/oscillator-dynamics.ts); dimensionless q,p and hbar=1. Atlas binding still loads static defaults. No driven/anharmonic/ND model or 3D scene adapter."),
  two_level: implementation(
    "packages/models/index.ts",
    ["diagonalize"],
    ["native", "qutip"],
    true,
    ["diagonalize"],
    [],
    "Restricted real two-level Hamiltonian; not all four Pauli coefficients.",
  ),
  driven_two_level: implementation(
    "packages/models/index.ts",
    ["evolve", "sweep"],
    ["native", "qutip", "dynamiqs"],
    true,
    ["evolve"],
    ["standard"],
    "Classical periodic drive; web has evolution controls, not sweeps.",
  ),
  landau_zener: implementation(
    "packages/models/index.ts",
    ["evolve", "sweep"],
    ["native", "qutip", "dynamiqs"],
    false,
    ["evolve"],
    ["standard"],
    "Finite-time linear passage; not asymptotic scattering.",
  ),
  stuckelberg: implementation(
    "packages/models/index.ts",
    ["evolve", "sweep"],
    ["native", "qutip", "dynamiqs"],
    false,
    ["evolve"],
    ["standard"],
    "Finite-time double passage; no distinct canonical Atlas binding.",
  ),
  strong_drive: implementation(
    "packages/models/index.ts",
    ["evolve", "sweep"],
    ["native", "qutip", "dynamiqs"],
    false,
    ["evolve"],
    ["standard"],
    "Driven two-level evolution with desktop Floquet diagnostics; no extra floquet wire operation.",
  ),
  jaynes_cummings: implementation(
    "packages/models/cavity.ts",
    ["cavity"],
    ["native", "qutip"],
    false,
    [],
    [],
    "Finite Fock cutoff; tensor permutation and global energy offset relative to Atlas.",
  ),
  quantum_rabi: implementation(
    "packages/models/cavity.ts",
    ["cavity"],
    ["native", "qutip"],
    false,
    [],
    [],
    "Finite qubit-cavity model, not the semiclassical drive. No portable cavity scene adapter.",
  ),
  open_jaynes_cummings: implementation(
    "packages/models/lindblad.ts",
    ["lindblad"],
    ["native", "qutip"],
    false,
    [],
    [],
    "Driven dissipative qubit-cavity model; not a second closed-Hamiltonian Atlas binding.",
  ),
  ising_chain: implementation(
    "packages/models/many_body.ts",
    ["many_body"],
    ["native", "quspin"],
    false,
    [],
    ["standard"],
    "Finite 2–8-site chain; optional QuSpin, not a thermodynamic solution or QEC executor.",
  ),
  transmon: implementation(
    "packages/models/circuit.ts",
    ["circuit"],
    ["native", "scqubits"],
    false,
    ["circuit"],
    [],
    "Finite charge-basis spectrum with optional scqubits; no current Atlas binding or web compute form.",
  ),
  ssh: implementation(
    "packages/models/topology.ts",
    ["topology"],
    ["native"],
    true,
    ["topology"],
    ["standard", "bands"],
    "Finite open chain and supplied two-band path; gap closure gives undefined winding.",
  ),
  qwz: implementation(
    "packages/models/topology.ts",
    ["topology"],
    ["native"],
    true,
    ["topology"],
    ["standard", "bands"],
    "Periodic two-band grid, supplied curvature/bands; unresolved mesh is not verified topology.",
  ),
  hydrogenic: implementation(
    "packages/models/orbital.ts",
    ["orbital"],
    ["native"],
    false,
    [],
    ["standard"],
    "Analytic single-electron Coulomb 1s–3d, infinite nuclear mass; no many-electron solver.",
  ),
};

export function webSupportsAtlasBinding(binding: AtlasBinding): boolean {
  return LAB_IMPLEMENTATIONS[binding.modelId].webControl;
}
const primaryOperation: Record<AtlasBinding["kind"], Operation> = {
  oscillator_drive: "oscillator_drive",
  oscillator: "oscillator",
  spectrum: "diagonalize",
  dynamics: "evolve",
  cavity: "cavity",
  many_body: "many_body",
  topology: "topology",
};
export interface RelatedLab {
  modelId: LabModelId;
  limitation: string;
}
// Explicit reviewed relationships, not name matching and not executable adapters.
const relatedLabs: Record<string, RelatedLab[]> = {
  coulomb_one_body: [
    {
      modelId: "hydrogenic",
      limitation:
        "Restricted hydrogenic states exist, but no Atlas-default-to-orbital parameter binding is tested.",
    },
  ],
  spin_half_zeeman: [
    {
      modelId: "two_level",
      limitation:
        "A restricted spin Hamiltonian could embed in the real two-level subspace; vector/sign/unit conversion is not bound.",
    },
  ],
  rotating_frame_qubit: [
    {
      modelId: "driven_two_level",
      limitation:
        "Related drive family; rotating-frame approximation is not an implemented Atlas binding.",
    },
  ],
  ramsey_sequence_effective: [
    {
      modelId: "driven_two_level",
      limitation: "A continuous cosine drive is not a pulsed Ramsey sequence.",
    },
  ],
  harmonic_oscillator: [
    {
      modelId: "jaynes_cummings",
      limitation:
        "Cavity mode is an oscillator component, not a standalone oscillator laboratory or binding.",
    },
  ],
  driven_harmonic_oscillator: [
    {
      modelId: "open_jaynes_cummings",
      limitation:
        "Driven cavity component exists; a standalone driven-oscillator model is not bound.",
    },
  ],
  dispersive_jc: [
    {
      modelId: "jaynes_cummings",
      limitation:
        "Parent full JC solver exists; the effective dispersive Hamiltonian and diagnostics are not a tested binding.",
    },
  ],
  dicke: [
    {
      modelId: "quantum_rabi",
      limitation: "One-qubit quantum Rabi is not a collective Dicke solver.",
    },
  ],
  repetition_code_ising: [
    {
      modelId: "ising_chain",
      limitation:
        "Ising spectrum exists; repetition-code stabilizers, decoding and correction are not implemented.",
    },
  ],
};

export interface AtlasReconciliationEntry {
  atlasId: string;
  reference: true;
  sourceExample: TheorySourceBinding | null;
  status: "lab-bound" | "related-only" | "theory-example" | "reference";
  lab: {
    modelId: AtlasBinding["modelId"];
    operation: Operation;
    implementation: LabImplementation;
    convention: string;
  } | null;
  relatedLabs: readonly RelatedLab[];
  gap: string;
}
export function reconcileAtlas(id: string): AtlasReconciliationEntry | null {
  if (!ATLAS_ENTRIES.some((entry) => entry.id === id)) return null;
  const binding = atlasBinding(id),
    sourceExample = ATLAS_SOURCE_BINDINGS[id] ?? null,
    related = relatedLabs[id] ?? [];
  return {
    atlasId: id,
    reference: true,
    sourceExample,
    status: binding
      ? "lab-bound"
      : related.length
        ? "related-only"
        : sourceExample
          ? "theory-example"
          : "reference",
    lab: binding
      ? {
          modelId: binding.modelId,
          operation: primaryOperation[binding.kind],
          implementation: LAB_IMPLEMENTATIONS[binding.modelId],
          convention: binding.convention,
        }
      : null,
    relatedLabs: related,
    gap: binding
      ? "No new executor needed for the tested subspace; broader Atlas scope remains outside the binding."
      : sourceExample
        ? "Theory-side program exists; integration needs existing Lab contracts, bounded results and numerical validation."
        : related.length
          ? "Existing related physics is not an executable Atlas binding; explicit scientific mapping and tests are missing."
          : "Reference-only in Lab: no reviewed executable binding. Reconciliation does not claim a new solver.",
  };
}
export const ATLAS_RECONCILIATION = ATLAS_ENTRIES.map((entry) =>
  reconcileAtlas(entry.id)!,
);
