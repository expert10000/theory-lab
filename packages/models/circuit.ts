import type { CircuitEngineName, CircuitJob } from "../contracts";

export const CIRCUIT_DEFAULTS = {
  EJ: "20", EC: "0.25", ng: "0.2", ncut: "12", levels: "5", engine: "native" as const,
};

export function circuitJob(jobId: string, input: Pick<typeof CIRCUIT_DEFAULTS, "EJ" | "EC" | "ng" | "ncut" | "levels">,
  engine: CircuitEngineName): CircuitJob {
  const fields = [input.EJ, input.EC, input.ng, input.ncut, input.levels];
  if (fields.some(value => !value.trim())) throw new Error("All transmon parameters are required");
  const [EJ, EC, ng, ncut, levels] = fields.map(Number);
  if (!Number.isFinite(EJ) || EJ < 0 || EJ > 100 || !Number.isFinite(EC) || EC <= 0 || EC > 10 ||
      !Number.isFinite(ng) || ng < -1 || ng > 1 || !Number.isInteger(ncut) || ncut < 3 || ncut > 40 ||
      !Number.isInteger(levels) || levels < 3 || levels > 8 || levels > 2 * ncut + 1)
    throw new Error("Use EJ 0–100, EC >0–10, ng ±1, ncut 3–40, and 3–8 levels within the basis");
  return { schema: "quantum-job/v1", jobId, operation: "circuit", engine,
    model: { type: "transmon", parameters: { EJ, EC, ng, ncut, levels } } };
}
