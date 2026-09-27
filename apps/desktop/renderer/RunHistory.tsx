import React, { useEffect, useState } from "react";
import type { QuantumBridge, RunExportFormat, RunSummary } from "../../../packages/contracts";

export function RunHistory({ bridge }: { bridge: QuantumBridge }) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function refresh() {
    setBusy(true);
    try { setRuns(await bridge.listRuns()); setMessage(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, [bridge]);
  async function exportOne(runId: string, format: RunExportFormat) {
    try {
      const path = await bridge.exportRun(runId, format);
      setMessage(path ? `Exported ${format.toUpperCase()}: ${path}` : "Export cancelled");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }
  return <section className="runs-page" data-testid="runs-page">
    <div className="panel runs-intro"><div><p className="eyebrow">DURABLE RUNS / QLAB-016</p><h2>Every completed calculation, accounted for.</h2>
      <p>Jobs, results, engine versions and SHA-256-verified numerical artifacts survive an app restart. Export a run as data, a figure, or a provenance manifest.</p></div>
      <button type="button" className="text-button" onClick={() => void refresh()} disabled={busy}>Refresh runs ↻</button></div>
    {message && <p className="runs-message" role="status">{message}</p>}
    {runs.length === 0 ? <div className="panel runs-empty">{busy ? "Loading saved runs…" : "No saved runs yet. Run any laboratory to create one."}</div> :
      <div className="runs-list">{runs.map(run => <article className="panel run-row" key={run.runId} data-testid="saved-run">
        <div><p className="eyebrow">{run.operation.toUpperCase()} / {run.model}</p><h3>{run.model.replaceAll("_", " ")}</h3>
          <small>{new Date(run.computedAt).toLocaleString()} · {run.engine} {run.engineVersion} · {run.durationMs.toFixed(1)} ms</small>
          <code>{run.runId} · {run.artifactSha256 ? `${run.artifactSha256.slice(0, 16)}…` : "inline spectrum"}</code></div>
        <div className="run-exports">{(["csv", "svg", "manifest"] as const).map(format =>
          <button type="button" key={format} aria-label={`Export ${format.toUpperCase()} ${run.runId}`} onClick={() => void exportOne(run.runId, format)}>{format.toUpperCase()}</button>)}</div>
      </article>)}</div>}
  </section>;
}
