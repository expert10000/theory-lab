import { atlasEntry } from "./index";

export type AtlasBinding =
  | { kind: "spectrum"; atlasId: "two_level_pauli"; modelId: "two_level"; parameters: { delta: number; omega: number }; convention: string }
  | { kind: "dynamics"; atlasId: "semiclassical_rabi_drive" | "landau_zener" | "floquet_two_level"; modelId: "driven_two_level" | "landau_zener" | "strong_drive"; parameters: Record<string, number>; convention: string }
  | { kind: "cavity"; atlasId: "jaynes_cummings" | "rabi"; modelId: "jaynes_cummings" | "quantum_rabi"; parameters: { qubitFrequency: number; cavityFrequency: number; coupling: number; cutoff: number }; convention: string }
  | { kind: "many_body"; atlasId: "ising_chain"; modelId: "ising_chain"; parameters: { sites: number; interaction: number; transverse: number; longitudinal: number; boundary: "open" }; convention: string }
  | { kind: "topology"; atlasId: "ssh"; modelId: "ssh"; parameters: { t1: number; t2: number; cells: number; kPoints: number }; convention: string }
  | { kind: "topology"; atlasId: "qwz"; modelId: "qwz"; parameters: { mass: number; grid: number }; convention: string };

function value(id: string, symbol: string): number {
  const defaultValue = atlasEntry(id)?.parameters.find(parameter => parameter.symbol === symbol)?.default;
  if (typeof defaultValue !== "number" || !Number.isFinite(defaultValue)) throw new Error(`Missing numeric Atlas default ${id}.${symbol}`);
  return defaultValue;
}

// These are deliberately narrow embeddings of Atlas Hamiltonians into existing lab models.
// Atlas itself does not mark any entry runnable. The app owns and tests these adapters.
export function atlasBinding(id: string): AtlasBinding | null {
  switch (id) {
    case "two_level_pauli":
      return { kind: "spectrum", atlasId: id, modelId: "two_level",
        parameters: { delta: 2 * value(id, "d_z"), omega: 2 * value(id, "d_x") },
        convention: "Subspace d₀ = dᵧ = 0; lab Δ = 2d_z and Ω = 2d_x. Atlas's full four-parameter model is not implemented." };
    case "semiclassical_rabi_drive":
      return { kind: "dynamics", atlasId: id, modelId: "driven_two_level",
        parameters: { delta: value(id, "omega_0"), amplitude: 2 * value(id, "Omega"), frequency: value(id, "omega_d"), phase: value(id, "phi") },
        convention: "ħ = 1; lab Δ = ω₀, A = 2Ω, ω = ωd, φ unchanged. This is a classical drive, not the quantum Rabi cavity model." };
    case "landau_zener":
      return { kind: "dynamics", atlasId: id, modelId: "landau_zener",
        parameters: { sweepRate: value(id, "v"), gap: value(id, "Delta"), bias: 0 },
        convention: "Atlas H = vt σz/2 + Δ σx/2; lab sweepRate = v, gap = Δ, bias = 0. Finite simulation window does not equal asymptotic LZ scattering." };
    case "floquet_two_level":
      return { kind: "dynamics", atlasId: id, modelId: "strong_drive",
        parameters: { delta: value(id, "Delta"), amplitude: 2 * value(id, "A"), frequency: value(id, "omega"), phase: 0 },
        convention: "Lab uses A_lab cos(ωt + φ) σx/2: A_lab = 2A_Atlas, φ = 0, ħ = 1. Quasienergies are modulo ω." };
    case "jaynes_cummings":
    case "rabi":
      return { kind: "cavity", atlasId: id, modelId: id === "rabi" ? "quantum_rabi" : "jaynes_cummings",
        parameters: { qubitFrequency: value(id, "omega_q"), cavityFrequency: value(id, "omega_c"), coupling: value(id, "g"), cutoff: id === "rabi" ? 8 : 6 },
        convention: "ħ = 1. Atlas basis is Fock × qubit; lab basis is qubit × Fock (unitary permutation). Lab ωq|e⟩⟨e| adds global ωq/2 to Atlas energies; subtract it for absolute-spectrum comparison. Finite Fock cutoff is a lab choice." };
    case "ising_chain":
      return { kind: "many_body", atlasId: id, modelId: "ising_chain",
        parameters: { sites: 4, interaction: value(id, "J"), transverse: value(id, "h"), longitudinal: 0, boundary: "open" },
        convention: "Finite open chain, four sites, zero longitudinal field. Lab H = −JΣσᶻᵢσᶻᵢ₊₁ − hΣσˣᵢ; no thermodynamic-limit claim." };
    case "ssh":
      return { kind: "topology", atlasId: id, modelId: "ssh",
        parameters: { t1: value(id, "t_1"), t2: value(id, "t_2"), cells: 16, kPoints: 101 },
        convention: "Atlas t₁/t₂ are the lab intracell/intercell hoppings. Bloch H(k)=(t₁+t₂ cos k)σx+t₂ sin k σy; open chain uses |n,A⟩,|n,B⟩ and 16 cells. Winding requires nonzero bulk gap." };
    case "qwz":
      return { kind: "topology", atlasId: id, modelId: "qwz",
        parameters: { mass: value(id, "m"), grid: 21 },
        convention: "Atlas H(k)=sin kₓ σx+sin kᵧ σy+(m+cos kₓ+cos kᵧ)σz, with lattice spacing, hopping scale and ħ set to 1. The lab computes the lower-band FHS Chern number and an independent midpoint Berry-curvature integral; at m=−2, 0, 2 the invariant is undefined." };
    default: return null;
  }
}
