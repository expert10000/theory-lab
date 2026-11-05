import React, { useEffect, useState } from "react";
import { QEC_EXAMPLE } from "../../../packages/quantum-3d/qec-example";
import { reviewQecEvidence, type QecEvidence, type QecReviewedRound } from "../../../packages/quantum-3d/qec";

export function QecSyndromeViewer({ evidence = QEC_EXAMPLE }: { evidence?: QecEvidence }) {
  const [review, setReview] = useState<{ rounds: QecReviewedRound[]; correction: readonly number[];
    logical: "preserved" | "flipped"; sourceSha256: string } | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    let active = true;
    setReview(null); setError(""); setSelected(0);
    void reviewQecEvidence(evidence).then(value => { if (active) setReview(value); })
      .catch(cause => { if (active) setError(String((cause as Error).message ?? cause)); });
    return () => { active = false; };
  }, [evidence]);
  return <section className="panel" data-testid="qec-syndrome-viewer">
    <p className="eyebrow">QI-31 / SOURCE-CHECKED DECODER EVIDENCE</p>
    <h2>Three-qubit repetition code</h2>
    <p>Bounded X-error example with Z₀Z₁ and Z₁Z₂ checks. This is a pinned teaching record, not a worker run or a surface-code threshold estimate.</p>
    {error ? <p role="alert">QEC evidence refused: {error}</p> : !review ? <p role="status">Checking syndrome source…</p> : <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {review.rounds.map((round, index) => <button key={round.id} type="button" aria-pressed={selected === index}
          onClick={() => setSelected(index)}>{round.id} · {round.syndrome.join("")}</button>)}
      </div>
      <svg role="img" aria-label="Syndrome history and defect changes" viewBox="0 0 360 160" style={{ width: "100%", maxWidth: 600 }}>
        {review.rounds.map((round, index) => <g key={round.id}>
          <text x={65 + index * 110} y="20" fill="currentColor" fontSize="13">{round.id}</text>
          {[0, 1].map(stabilizer => <circle key={stabilizer} cx={72 + index * 110} cy={55 + stabilizer * 55} r="15"
            fill={round.defects.includes(stabilizer) ? "#e7824d" : round.syndrome[stabilizer] ? "#397ec6" : "#dce7ea"}
            stroke={selected === index ? "#111827" : "#64748b"} strokeWidth={selected === index ? 3 : 1} />)}
        </g>)}
        <text x="5" y="59" fill="currentColor" fontSize="12">Z₀Z₁</text>
        <text x="5" y="114" fill="currentColor" fontSize="12">Z₁Z₂</text>
        <text x="5" y="151" fill="currentColor" fontSize="11">Orange: new defect · blue: continuing syndrome</text>
      </svg>
      <div data-testid="qec-selected-round">Round {review.rounds[selected].id} · source errors X on [{review.rounds[selected].errors.join(", ") || "none"}]
        · syndrome {review.rounds[selected].syndrome.join("")} · new defects at stabilizers [{review.rounds[selected].defects.join(", ") || "none"}]
        · cumulative X pattern {review.rounds[selected].cumulativeErrors.join("")}.</div>
      <div data-testid="qec-decoder-result">Correction chain: X on qubit {review.correction.join(", ") || "none"} from the final syndrome.
        Residual logical X: {review.logical}. The single-error correction is ambiguous after two recorded faults.</div>
      <small>Every round belongs to source SHA-256 <code>{review.sourceSha256}</code>. Syndromes, defects, correction and logical result are checked independently from the pinned source record.</small>
    </>}
  </section>;
}
