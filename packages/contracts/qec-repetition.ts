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

/** Check the returned trace against the prescribed flips, independently of Python. */
export function verifyQecRepetitionStudy(flips: number[], value: QecRepetitionStudy): boolean {
  if (value?.schema !== "qec-repetition-study/v1" || value.code !== "three-bit-repetition" ||
      !Array.isArray(value.rounds) || value.rounds.length !== flips.length ||
      !/^[a-f0-9]{64}$/.test(value.sha256) || !Array.isArray(value.limitations)) return false;
  const bits = [0, 0, 0]; let previous = [0, 0];
  for (let i = 0; i < flips.length; i++) {
    const flip = flips[i], row = value.rounds[i];
    if (flip >= 0) bits[flip] ^= 1;
    const syndrome = [bits[0] ^ bits[1], bits[1] ^ bits[2]];
    const defects = syndrome.map((item, j) => item ^ previous[j]);
    if (!row || row.round !== i || row.flip !== flip ||
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
