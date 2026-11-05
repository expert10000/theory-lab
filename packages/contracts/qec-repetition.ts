/** A bounded ideal-measurement teaching example; not a surface-code result. */
export interface QecRepetitionStudy {
  schema: "qec-repetition-study/v1";
  code: "three-bit-repetition";
  initialLogical: 0;
  rounds: { round: number; flip: number; syndrome: [number, number]; defects: [number, number]; dataBits: [number, number, number] }[];
  decoder: { method: "final-syndrome-minimum-weight"; correctionBit: number;
    correctedBits: [number, number, number]; logicalResult: number; ambiguousMultipleErrors: boolean };
  limitations: string[];
  sha256: string;
}

/** Immutable host record for the bounded ideal example, separate from quantum-result/v1|v2. */
export interface QecRepetitionRun {
  schema: "qec-repetition-run/v1";
  runId: string; jobId: string; computedAt: string; workerVersion: string;
  flips: number[]; result: QecRepetitionStudy; resultSha256: string;
}
export type QecRepetitionRunSummary = Pick<QecRepetitionRun, "runId" | "computedAt" | "resultSha256"> & { rounds: number };

/** Check the returned trace against the prescribed flips, independently of Python. */
export function verifyQecRepetitionStudy(flips: number[], value: QecRepetitionStudy): boolean {
  const exact = (item: unknown, keys: string[]) => item !== null && typeof item === "object" &&
    !Array.isArray(item) && Object.keys(item).sort().join(",") === keys.sort().join(",");
  if (!exact(value, ["schema", "code", "initialLogical", "rounds", "decoder", "limitations", "sha256"]) ||
      value.schema !== "qec-repetition-study/v1" || value.code !== "three-bit-repetition" ||
      value.initialLogical !== 0 || !Array.isArray(flips) || flips.length < 1 || flips.length > 32 ||
      flips.some(bit => !Number.isInteger(bit) || bit < -1 || bit > 2) ||
      !Array.isArray(value.rounds) || value.rounds.length !== flips.length ||
      !/^[a-f0-9]{64}$/.test(value.sha256) ||
      JSON.stringify(value.limitations) !== JSON.stringify([
        "Only ideal parity checks and prescribed bit flips are modeled.",
        "Multiple data errors can share a syndrome; no surface-code or fault-tolerance claim.",
      ]) || !exact(value.decoder, ["method", "correctionBit", "correctedBits", "logicalResult", "ambiguousMultipleErrors"]))
    return false;
  const bits = [0, 0, 0]; let previous = [0, 0];
  for (let i = 0; i < flips.length; i++) {
    const flip = flips[i], row = value.rounds[i];
    if (flip >= 0) bits[flip] ^= 1;
    const syndrome = [bits[0] ^ bits[1], bits[1] ^ bits[2]];
    const defects = syndrome.map((item, j) => item ^ previous[j]);
    if (!exact(row, ["round", "flip", "syndrome", "defects", "dataBits"]) ||
        row.round !== i || row.flip !== flip ||
        JSON.stringify(row.dataBits) !== JSON.stringify(bits) ||
        JSON.stringify(row.syndrome) !== JSON.stringify(syndrome) ||
        JSON.stringify(row.defects) !== JSON.stringify(defects)) return false;
    previous = syndrome;
  }
  const correction = ({ "0,0": -1, "1,0": 0, "1,1": 1, "0,1": 2 } as Record<string, number>)[previous.join(",")];
  const corrected = [...bits]; if (correction >= 0) corrected[correction] ^= 1;
  return value.decoder?.method === "final-syndrome-minimum-weight" &&
    value.decoder.correctionBit === correction &&
    JSON.stringify(value.decoder.correctedBits) === JSON.stringify(corrected) &&
    value.decoder.logicalResult === corrected[0] &&
    value.decoder.ambiguousMultipleErrors === (flips.filter(bit => bit >= 0).length > 1);
}
