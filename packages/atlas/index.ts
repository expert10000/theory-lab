import snapshot from "./atlas.v1.json";

export interface AtlasEntry {
  id: string; name: string; family: string; sourceFile: string;
  formula: { latex: string }; basis: { description: string };
  parameters: { symbol: string; name: string; unit_convention: string; description: string; default: string | number }[];
  assumptions: string[]; symmetries: string[]; conserved_quantities: string[];
  important_limits: { condition: string; result: string }[];
  observables: string[]; relations: { type: string; target: string; condition: string }[];
  references: { chapters: string[]; computational_examples: string[] };
  computation: { adapter: null; runnable: null; default_preset: string | null };
  presentation: { summary: string; tags: string[]; difficulty: string };
}
export const ATLAS_REVISION = snapshot.sourceRevision;
export const ATLAS_SOURCE = snapshot.sourceRepository;
export const ATLAS_ENTRIES = snapshot.entries as AtlasEntry[];
export const ATLAS_PRESETS = snapshot.presets;
export const atlasEntry = (id: string) => ATLAS_ENTRIES.find(entry => entry.id === id);
export const atlasUrl = (entry: AtlasEntry) => `${ATLAS_SOURCE}/blob/${ATLAS_REVISION}/data/hamiltonian_atlas/${entry.sourceFile}`;
