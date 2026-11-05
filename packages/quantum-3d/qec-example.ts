import type { QecEvidence, QecSource } from "./qec";

export const QEC_EXAMPLE_SOURCE: QecSource = {
  schema: "repetition-3-syndrome/v1", code: "Z0Z1,Z1Z2",
  rounds: [
    { id: "r0", errors: [], syndrome: [0, 0] },
    { id: "r1", errors: [1], syndrome: [1, 1] },
    { id: "r2", errors: [0], syndrome: [0, 1] },
  ],
};

export const QEC_EXAMPLE: QecEvidence = {
  source: QEC_EXAMPLE_SOURCE,
  sourceSha256: "c785373a5532b5ebe0bd346c0b251b95b03696c90bd19b94e4c1c97daaa218e8",
  correction: [2], logical: "flipped",
};
