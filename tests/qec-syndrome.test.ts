import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewQecEvidence } from "../packages/quantum-3d/qec";
import { QEC_EXAMPLE } from "../packages/quantum-3d/qec-example";

test("source-checked repetition evidence links rounds, defects, correction and logical result", async () => {
  const reviewed = await reviewQecEvidence(QEC_EXAMPLE);
  assert.deepEqual(reviewed.rounds.map(round => round.defects), [[], [0, 1], [0]]);
  assert.deepEqual(reviewed.correction, [2]);
  assert.equal(reviewed.logical, "flipped");
  await assert.rejects(reviewQecEvidence({ ...QEC_EXAMPLE, source: { ...QEC_EXAMPLE.source,
    rounds: QEC_EXAMPLE.source.rounds.map((round, index) => index === 1 ? { ...round, syndrome: [0, 0] as const } : round) } }),
  /source hash changed/);
  await assert.rejects(reviewQecEvidence({ ...QEC_EXAMPLE, correction: [1] }), /correction/);
});
