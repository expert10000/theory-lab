import React, { useEffect, useRef, useState } from "react";
import type { QuantumBridge, RunSummary } from "../../../packages/contracts";
import type { ScenePayload } from "../../../packages/quantum-scene";
import { supportsScene } from "../../../packages/quantum-scene/from-result";
import { SceneViewer } from "../../../packages/quantum-3d/SceneViewer";
import { FieldViewer } from "../../../packages/quantum-3d/FieldViewer";
import "../../../packages/quantum-3d/scene.css";

export function SceneLab({ bridge }: { bridge: QuantumBridge }) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [runId, setRunId] = useState("");
  const [savedPayload, setPayload] = useState<ScenePayload | null>(null);
  const [imported, setImported] = useState<ScenePayload | null>(null);
  const [source, setSource] = useState<"saved" | "bundle">("saved");
  const payload = source === "bundle" ? imported : savedPayload;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const sequence = useRef(0);
  async function refresh() {
    try {
      const values = (await bridge.listRuns()).filter(r => supportsScene(r.operation, r.model));
      setRuns(values); setRunId(current => values.some(r => r.runId === current) ? current : values[0]?.runId ?? "");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }
  useEffect(() => { void refresh(); }, [bridge]);
  useEffect(() => {
    const request = ++sequence.current;
    if (source === "bundle") return;
    setPayload(null); setMessage("");
    if (!runId) { setBusy(false); return; }
    setBusy(true);
    void bridge.getScene(runId).then(value => { if (request === sequence.current) setPayload(value); })
      .catch(error => { if (request === sequence.current) setMessage(error instanceof Error ? error.message : String(error)); })
      .finally(() => { if (request === sequence.current) setBusy(false); });
    return () => { sequence.current++; };
  }, [bridge, runId, source]);
  async function importScene() {
    setBusy(true); setMessage("");
    try {
      const value = await bridge.importScene();
      if (value) { setImported(value); setSource("bundle"); setMessage("Opened verified scene bundle · read-only preview"); }
      else setMessage("Scene import cancelled");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  async function exportScene() {
    const current = runId; setBusy(true);
    try {
      const path = await bridge.exportScene(current);
      setMessage(path ? `Exported verified scene bundle: ${path}` : "Scene export cancelled");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  return <section className="scene-lab" data-testid="scenes-page">
    <div className="panel scene-intro"><p className="eyebrow">QVIS-001–006 · PORTABLE VISUALIZATION</p>
      <h2>One result. A portable scene.</h2>
      <p>Preview verified saved Bloch trajectories, SSH sublattices and bonds, Ising magnetization, QWZ curvature and hydrogenic orbital fields. Export the scene and binary datasets as a new .qscene folder. This Lab has no Math3D connection.</p>
      <div className="scene-run-controls"><label>Saved numerical run <select aria-label="Scene saved run" value={runId} onChange={e => { setRunId(e.target.value); setSource("saved"); }} disabled={busy}>
        {!runs.length && <option value="">No compatible runs</option>}{runs.map(r => <option key={r.runId} value={r.runId}>{r.model.replaceAll("_", " ")} · {r.engine} · {new Date(r.computedAt).toLocaleString()} · {r.runId.slice(-8)}</option>)}
      </select></label><button type="button" disabled={busy} onClick={() => void refresh()}>Refresh runs</button>
      <button type="button" data-testid="export-scene" disabled={busy || !payload || source !== "saved"} onClick={() => void exportScene()}>Export scene bundle</button>
      <button type="button" data-testid="import-scene" disabled={busy} onClick={() => void importScene()}>Open scene bundle</button>
      {source === "bundle" && <button type="button" disabled={busy} onClick={() => setSource("saved")}>Return to saved run</button>}</div>
      <p data-testid="scene-source">{source === "bundle" ? "IMPORTED BUNDLE · READ-ONLY · hashes verify integrity, not publisher identity" : "SAVED NUMERICAL RUN"}</p>
    </div>
    {message && <p className="runs-message" role="status">{message}</p>}
    {busy && !payload && <p role="status">Checking saved result and numerical artifacts…</p>}
    {!runId && source === "saved" && <div className="panel runs-empty">Run Dynamics, Topology, Many-body or Orbitals first, then refresh here, or open a scene bundle. Existing saved runs and imported bundles work without a live worker.</div>}
    {payload && <><div className="panel">{payload.scene.fields?.length ? <FieldViewer key={payload.scene.id} payload={payload}/> : <SceneViewer key={payload.scene.id} payload={payload} />}</div>
      <div className="panel scene-provenance"><p className="eyebrow">{source === "bundle" ? "SUPPLIED PROVENANCE / NOT INDEPENDENTLY AUTHENTICATED" : "SCIENTIFIC PROVENANCE"}</p><h3>{payload.scene.title}</h3>
        <p>{payload.scene.provenance.engine} {payload.scene.provenance.engineVersion} · {payload.scene.provenance.computedAt}</p>
        <p>{Object.entries(payload.scene.provenance.parameters ?? {}).map(([key, value]) => `${key} = ${value}`).join(" · ")}</p>
        <code data-testid="scene-run-id">Run: {payload.scene.provenance.runId}<br />Result SHA-256: {payload.scene.provenance.resultSha256}</code>
        {payload.scene.provenance.source && <p>Atlas: {payload.scene.provenance.source.entryId} · revision {payload.scene.provenance.source.revision}</p>}
        <p>quantum-scene/v1 · {payload.scene.objects.length} objects · {payload.scene.datasets.reduce((n, d) => n + d.bytes, 0).toLocaleString()} bytes · {payload.scene.coordinates.handedness}-handed coordinates</p>
        <details><summary>Scene metadata and artifact references</summary><pre>{JSON.stringify(payload.scene, null, 2)}</pre></details>
      </div></>}
  </section>;
}
