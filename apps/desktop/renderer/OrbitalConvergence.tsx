import React, { useEffect, useRef, useState } from "react";
import type {
  OrbitalJob,
  OrbitalResult,
  QuantumBridge,
} from "../../../packages/contracts";
import {
  convergencePlan,
  convergenceRows,
  type ConvergenceMode,
} from "../../../packages/models/orbital-convergence";

type Study = {
  base: OrbitalJob;
  mode: ConvergenceMode;
  results: OrbitalResult[];
  complete: boolean;
};
export function OrbitalConvergence({
  bridge,
  preview,
  ready,
  busy,
  onBusy,
  restoreEpoch,
}: {
  bridge: QuantumBridge;
  preview: OrbitalJob | null;
  ready: boolean;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  restoreEpoch?: number;
}) {
  const [mode, setMode] = useState<ConvergenceMode>("grid"),
    [study, setStudy] = useState<Study | null>(null);
  const [running, setRunning] = useState(false),
    [progress, setProgress] = useState(0),
    [message, setMessage] = useState("");
  const active = useRef<string | null>(null),
    cancelled = useRef(false),
    sequence = useRef(0),
    alive = useRef(true);
  useEffect(
    () =>
      bridge.onProgress((p) => {
        if (p.jobId === active.current) setProgress(p.fraction);
      }),
    [bridge],
  );
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      cancelled.current = true;
      sequence.current++;
    };
  }, []);
  useEffect(() => {
    if (restoreEpoch) {
      cancelled.current = true;
      sequence.current++;
      setStudy(null);
      setMessage("");
    }
  }, [restoreEpoch]);
  let plan: OrbitalJob[] = [];
  let validation = "";
  if (preview)
    try {
      plan = convergencePlan(preview, mode, "preview-study");
    } catch (e) {
      validation = String(e);
    }
  const stale =
    !!study &&
    (study.mode !== mode ||
      !preview ||
      JSON.stringify(preview.model) !== JSON.stringify(study.base.model));
  const rows = study
    ? convergenceRows(study.base, study.mode, study.results)
    : [];
  async function run() {
    if (!preview || !ready || busy || !plan.length) return;
    const base = structuredClone(preview),
      selectedMode = mode,
      request = ++sequence.current;
    const jobs = convergencePlan(
      base,
      selectedMode,
      `study-${crypto.randomUUID()}`,
    );
    cancelled.current = false;
    setRunning(true);
    onBusy(true);
    setProgress(0);
    setMessage("");
    const results: OrbitalResult[] = [];
    setStudy({ base, mode: selectedMode, results: [], complete: false });
    try {
      for (const job of jobs) {
        if (cancelled.current || request !== sequence.current) break;
        active.current = job.jobId;
        setProgress(0);
        const result = await bridge.orbital(job);
        active.current = null;
        if (!alive.current || request !== sequence.current) break;
        const next = [...results, result];
        convergenceRows(base, selectedMode, next);
        results.push(result);
        setStudy({
          base,
          mode: selectedMode,
          results: [...results],
          complete: false,
        });
      }
      if (alive.current && request === sequence.current) {
        const complete = !cancelled.current && results.length === jobs.length;
        setStudy({ base, mode: selectedMode, results: [...results], complete });
        setMessage(
          complete
            ? `Study complete · ${results.length} verified saved runs`
            : `Study stopped · ${results.length} completed runs retained`,
        );
      }
    } catch (e) {
      if (alive.current && request === sequence.current)
        setMessage(
          cancelled.current
            ? `Study cancelled · ${results.length} completed runs retained`
            : e instanceof Error
              ? e.message
              : String(e),
        );
    } finally {
      active.current = null;
      if (alive.current) setRunning(false);
      onBusy(false);
    }
  }
  async function cancel() {
    cancelled.current = true;
    if (active.current)
      try {
        await bridge.cancel(active.current);
      } catch (e) {
        setMessage(String(e));
      }
  }
  return (
    <section
      className="panel orbital-convergence"
      data-testid="orbital-convergence"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">QVIS-007 / NUMERICAL CONVERGENCE</p>
          <h2>Change one numerical variable at a time.</h2>
        </div>
        {study && (
          <span className={`result-badge ${stale ? "stale" : ""}`}>
            {stale
              ? "OUT OF DATE"
              : running
                ? "RUNNING"
                : study.complete
                  ? "STUDY COMPLETE"
                  : "PARTIAL STUDY"}
          </span>
        )}
      </div>
      <div className="scene-run-controls">
        <label>
          Study
          <select
            aria-label="Orbital convergence mode"
            disabled={busy}
            value={mode}
            onChange={(e) => setMode(e.target.value as ConvergenceMode)}
          >
            <option value="grid">
              Grid refinement · fixed cube half-width
            </option>
            <option value="box">Box growth · fixed grid spacing</option>
          </select>
        </label>
        <button
          data-testid="run-orbital-study"
          disabled={!ready || busy || !plan.length}
          onClick={() => void run()}
        >
          Run convergence study
        </button>
        {running && (
          <button
            data-testid="cancel-orbital-study"
            onClick={() => void cancel()}
          >
            Cancel study
          </button>
        )}
      </div>
      <p>
        {mode === "grid"
          ? "Hold the current half-width fixed and compare 21³, 31³, 41³ and 49³ points. Smaller spacing tests Cartesian discretization at the same finite box."
          : "Hold the current spacing fixed and use admissible 21³, 31³, 41³ and 49³ boxes. Half-width grows with point count, isolating box size from spacing."}{" "}
        {plan.length} bounded jobs. Quantum numbers, basis, charge and engine
        stay fixed.
      </p>
      {validation && <p className="validation">{validation}</p>}
      {running && (
        <p role="status">
          {rows.length} completed cases · active grid{" "}
          {Math.round(progress * 100)}% · each completed case is saved
        </p>
      )}
      {message && (
        <p className="runs-message" role="status">
          {message}
        </p>
      )}
      {study && (
        <>
          <p>
            Recorded study:{" "}
            {study.mode === "grid" ? "fixed half-width" : "fixed spacing"} · n=
            {study.base.model.parameters.n}, l={study.base.model.parameters.l},
            m={study.base.model.parameters.m},{" "}
            {study.base.model.parameters.basis}, Z=
            {study.base.model.parameters.Z}.
          </p>
          <div className="convergence-table-wrap">
            <table className="convergence-table">
              <thead>
                <tr>
                  <th>Grid</th>
                  <th>Half-width / a₀</th>
                  <th>Spacing / a₀</th>
                  <th>Grid integral I</th>
                  <th>I − 1</th>
                  <th>|ΔI|</th>
                  <th>Sphere reference interval</th>
                  <th>Distance outside interval</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.runId}
                    data-testid="orbital-study-row"
                    title={`Saved run: ${row.runId}`}
                  >
                    <td>{row.grid}³</td>
                    <td>{row.radius.toPrecision(5)}</td>
                    <td>{row.spacing.toPrecision(5)}</td>
                    <td>{row.integral.toFixed(8)}</td>
                    <td>{row.signedUnityError.toExponential(3)}</td>
                    <td>{row.deltaPrevious?.toExponential(3) ?? "—"}</td>
                    <td>
                      {row.sphereBounds
                        ? row.sphereBounds.map((v) => v.toFixed(6)).join(" … ")
                        : "not recorded"}
                    </td>
                    <td>{row.outsideBounds?.toExponential(3) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            I − 1 includes missing tails and quadrature error; it is not a pure
            discretization error. |ΔI| compares consecutive cases, not a
            certified tolerance. The cube lies between spheres of radii R and
            √3R: their radial integrals give a reference interval for the true
            cube probability. Interval values are numerical quadrature
            estimates. No grid normalization or automatic “converged” claim is
            applied.
          </p>
          <details>
            <summary>Saved case identifiers</summary>
            {rows.map((r) => (
              <p key={r.runId}>
                <code>{r.runId}</code> · {r.grid}³ · half-width{" "}
                {r.radius.toPrecision(5)} a₀
              </p>
            ))}
          </details>
        </>
      )}
    </section>
  );
}
