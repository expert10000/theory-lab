import type { ManyBodyEngineName, ManyBodyJob, ManyBodyModel } from "../contracts";

export const MANY_BODY_DEFAULTS = {
  sites: "4", interaction: "1", transverse: "0.8", longitudinal: "0.15",
  boundary: "open" as const, engine: "native" as const,
};

export function manyBodyJob(jobId: string,
  input: Pick<typeof MANY_BODY_DEFAULTS, "sites" | "interaction" | "transverse" | "longitudinal">,
  boundary: ManyBodyModel["parameters"]["boundary"], engine: ManyBodyEngineName): ManyBodyJob {
  const fields = [input.sites, input.interaction, input.transverse, input.longitudinal];
  if (fields.some(value => !value.trim())) throw new Error("All Ising-chain parameters are required");
  const [sites, interaction, transverse, longitudinal] = fields.map(Number);
  if (!Number.isInteger(sites) || sites < 2 || sites > 8 ||
      [interaction, transverse, longitudinal].some(value => !Number.isFinite(value) || Math.abs(value) > 10))
    throw new Error("Use 2–8 sites and fields/coupling within ±10");
  return { schema: "quantum-job/v1", jobId, operation: "many_body", engine,
    model: { type: "ising_chain", parameters: { sites, interaction, transverse, longitudinal, boundary } } };
}
