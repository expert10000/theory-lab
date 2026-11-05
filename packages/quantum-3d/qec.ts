export type QecBit = 0 | 1;
export type QecRound = { id: string; errors: readonly number[]; syndrome: readonly [QecBit, QecBit] };
export type QecSource = { schema: "repetition-3-syndrome/v1"; code: "Z0Z1,Z1Z2";
  rounds: readonly QecRound[] };
export type QecEvidence = { source: QecSource; sourceSha256: string;
  correction: readonly number[]; logical: "preserved" | "flipped" };
export type QecReviewedRound = QecRound & { defects: readonly number[]; cumulativeErrors: readonly [QecBit, QecBit, QecBit] };

const xor = (a: number, b: number): QecBit => (a ^ b) as QecBit;
const hex = (bytes: Uint8Array) => [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");

/** Review recorded syndrome rounds and a declared minimal correction; no Monte Carlo decoder is run. */
export async function reviewQecEvidence(evidence: QecEvidence): Promise<{
  rounds: QecReviewedRound[]; correction: readonly number[]; logical: "preserved" | "flipped";
  sourceSha256: string }> {
  const { source } = evidence;
  if (source.schema !== "repetition-3-syndrome/v1" || source.code !== "Z0Z1,Z1Z2" ||
      source.rounds.length < 2 || source.rounds.length > 32 ||
      !/^[a-f0-9]{64}$/.test(evidence.sourceSha256)) throw new TypeError("Invalid QEC source contract");
  const digest = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(source)))));
  if (digest !== evidence.sourceSha256) throw new TypeError("QEC source hash changed");
  const errors: [QecBit, QecBit, QecBit] = [0, 0, 0];
  let previous: [QecBit, QecBit] = [0, 0];
  const rounds: QecReviewedRound[] = [];
  for (const [index, round] of source.rounds.entries()) {
    if (round.id !== `r${index}` || round.errors.length > 3 ||
        new Set(round.errors).size !== round.errors.length ||
        round.errors.some(bit => !Number.isInteger(bit) || bit < 0 || bit > 2) ||
        round.syndrome.length !== 2 || round.syndrome.some(bit => bit !== 0 && bit !== 1))
      throw new TypeError("Invalid QEC round");
    for (const bit of round.errors) errors[bit] = xor(errors[bit], 1);
    const expected: [QecBit, QecBit] = [xor(errors[0], errors[1]), xor(errors[1], errors[2])];
    if (round.syndrome[0] !== expected[0] || round.syndrome[1] !== expected[1])
      throw new TypeError(`QEC syndrome disagrees with recorded errors at ${round.id}`);
    rounds.push({ ...round, defects: [0, 1].filter(bit => round.syndrome[bit] !== previous[bit]),
      cumulativeErrors: [...errors] as [QecBit, QecBit, QecBit] });
    previous = expected;
  }
  const correction = previous[0] === 0 && previous[1] === 0 ? [] :
    previous[0] === 1 && previous[1] === 0 ? [0] : previous[0] === 1 ? [1] : [2];
  if (JSON.stringify(correction) !== JSON.stringify(evidence.correction))
    throw new TypeError("QEC correction does not match final syndrome");
  for (const bit of correction) errors[bit] = xor(errors[bit], 1);
  const logical = errors.every(bit => bit === 1) ? "flipped" : "preserved";
  if (logical !== evidence.logical) throw new TypeError("QEC logical result disagrees with correction chain");
  return { rounds, correction, logical, sourceSha256: digest };
}
