import React, { useEffect, useRef, useState } from "react";
import type { QuantumBridge, RunSummary } from "../../../packages/contracts";
import type { ScenePayload } from "../../../packages/quantum-scene";
import type { SceneHandoffReceipt } from "../../../packages/quantum-scene/handoff";
import { supportsScene } from "../../../packages/quantum-scene/from-result";
import type {
  LatticeFamily,
  SceneExampleRequest,
} from "../../../packages/quantum-scene/examples";
import { SceneViewer,browserSceneDigest } from "../../../packages/quantum-3d/SceneViewer";
import {SceneChunkLoader} from "../../../packages/quantum-scene/stream";
import { FieldViewer } from "../../../packages/quantum-3d/FieldViewer";
import {StreamViewer,type SceneStreamSource} from "../../../packages/quantum-3d/StreamViewer";
import {sceneFocusForLaunch,type SceneLaunch} from "./scene-bridge";
import "../../../packages/quantum-3d/scene.css";

export function SceneLab({ bridge,launch }: { bridge: QuantumBridge;launch?:SceneLaunch|null }) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [runId, setRunId] = useState(launch?.runId??"");
  const [savedPayload, setPayload] = useState<ScenePayload | null>(null);
  const [imported, setImported] = useState<ScenePayload | null>(null);
  const [source, setSource] = useState<"saved" | "bundle" | "example"|"stream">("saved");
  const [stream,setStream]=useState<(SceneStreamSource&{id:string})|null>(null);
  const [example, setExample] = useState<{
    request: SceneExampleRequest;
    payload: ScenePayload;
  } | null>(null);
  const [family, setFamily] = useState<LatticeFamily>("square"),
    [repeats, setRepeats] = useState(["3", "3", "1"]);
  const [view,setView]=useState<"real"|"reciprocal">("real");
  const [savedView,setSavedView]=useState<"standard"|"bands">(launch?.view??"standard");
  const [intent,setIntent]=useState<SceneLaunch|null>(launch??null);
  const payload =
    source === "stream"?null:source === "example"
      ? (example?.payload ?? null)
      : source === "bundle"
        ? imported
        : savedPayload;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [handoff,setHandoff]=useState<SceneHandoffReceipt|null>(null);
  const sequence = useRef(0);
  async function refresh() {
    try {
      const values = (await bridge.listRuns()).filter((r) =>
        supportsScene(r.operation, r.model),
      );
      setRuns(values);
      setRunId((current) =>
        values.some((r) => r.runId === current)
          ? current
          : (current || values[0]?.runId || ""),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }
  useEffect(() => {
    void refresh();
  }, [bridge]);
  useEffect(()=>{
    if(!launch)return;
    setRunId(launch.runId);setSavedView(launch.view);setSource("saved");setIntent(launch);
  },[launch?.nonce]);
  const linked=source==="saved"&&payload?sceneFocusForLaunch(payload,intent):null;
  useEffect(() => {
    const request = ++sequence.current;
    if (source !== "saved") return;
    setPayload(null);
    setHandoff(null);
    setMessage("");
    if (!runId) {
      setBusy(false);
      return;
    }
    setBusy(true);
    void bridge
      .getScene(runId,savedView)
      .then((value) => {
        if (request === sequence.current) setPayload(value);
      })
      .catch((error) => {
        if (request === sequence.current)
          setMessage(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (request === sequence.current) setBusy(false);
      });
    return () => {
      sequence.current++;
    };
  }, [bridge, runId, source,savedView]);
  async function importScene() {
    setBusy(true);
    setMessage("");
    try {
      const value = await bridge.importScene();
      if (value) {
        setImported(value);
        setSource("bundle");setIntent(null);
        setMessage("Opened verified scene bundle · read-only preview");
      } else setMessage("Scene import cancelled");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  async function exportScene(format:"regular"|"stream"="regular") {
    const current = runId;
    setBusy(true);
    try {
      const path =
        source === "example" && example
          ? await bridge.exportSceneExample(example.request)
          : await bridge.exportScene(current,savedView,format);
      setMessage(
        path
          ? `Exported verified scene bundle: ${path}`
          : "Scene export cancelled",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  async function prepareHandoff(){
    if(source!=="saved"||!payload)return;
    const current=runId,selectedView=savedView,sourceHash=payload.scene.provenance.resultSha256;
    setHandoff(null);setBusy(true);setMessage("");
    try{
      const receipt=await bridge.prepareSceneHandoff(current,selectedView,sourceHash);
      if(receipt){setHandoff(receipt);setMessage("External-viewer bundle re-opened and verified against this saved run");}
      else setMessage("External-viewer handoff cancelled");
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
    finally{setBusy(false);}
  }
  async function openExample() {
    setBusy(true);
    setMessage("");
    try {
      const request: SceneExampleRequest = {
        family,
        repeats: repeats.map(Number) as [number, number, number],
        view,
      };
      if (repeats.some((v) => !v.trim()))
        throw new Error("Every repeat count is required");
      const value = await bridge.getSceneExample(request);
      setExample({ request, payload: value });
      setSource("example");setIntent(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  async function importStream() {
    setBusy(true);
    let opened: string | undefined;
    try {
      const s = await bridge.importSceneStream();
      if (s) {
        opened = s.id;
        const next: SceneStreamSource & { id: string } = {
          ...s,
          read: async (path, signal) => {
            signal.throwIfAborted();
            const bytes = await bridge.readSceneChunk(s.id, path);
            signal.throwIfAborted();
            return bytes;
          },
        };
        next.loader = new SceneChunkLoader(s.manifest, next.read, browserSceneDigest);
        // Keep the old viewer and its handle until the new preview is verified.
        await next.loader.load(0, new AbortController().signal);
        if (stream) void bridge.releaseSceneStream(stream.id);
        setStream(next);
        setSource("stream");setIntent(null);
        setMessage("Opened chunked scene · preview verified, remaining data checked on demand");
        opened = undefined;
      }
    } catch (error) {
      if (opened) void bridge.releaseSceneStream(opened);
      setMessage(`${error instanceof Error ? error.message : String(error)} · previous verified preview retained`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="scene-lab" data-testid="scenes-page">
      <div className="panel scene-intro">
        <p className="eyebrow">QVIS-001–013 · PORTABLE VISUALIZATION</p>
        <h2>One result. A portable scene.</h2>
        <p>
          Preview verified saved Bloch trajectories, SSH sublattices and bonds,
          Ising magnetization, QWZ curvature, supplied SSH/QWZ bands and hydrogenic orbital fields.
          Export the scene and binary datasets as a new .qscene folder. A
          verified external-viewer handoff is available for saved runs; Math3D
          still needs its own importer before direct opening is enabled.
        </p>
        <div className="scene-run-controls">
          <label>
            Saved numerical run{" "}
            <select
              aria-label="Scene saved run"
              value={runId}
              onChange={(e) => {
                setRunId(e.target.value);
                setSource("saved");setIntent(null);
              }}
              disabled={busy}
            >
              {!runs.length && <option value="">No compatible runs</option>}
              {runId&&!runs.some(run=>run.runId===runId)&&<option value={runId}>Requested run · {runId.slice(-8)}</option>}
              {runs.map((r) => (
                <option key={r.runId} value={r.runId}>
                  {r.model.replaceAll("_", " ")} · {r.engine} ·{" "}
                  {new Date(r.computedAt).toLocaleString()} ·{" "}
                  {r.runId.slice(-8)}
                </option>
              ))}
            </select>
          </label>
          <label>Saved view<select aria-label="Saved scene view" value={savedView} disabled={busy} onChange={e=>{setSavedView(e.target.value as "standard"|"bands");setSource("saved");setIntent(null);}}><option value="standard">Standard result scene</option><option value="bands">SSH / QWZ energy bands</option></select></label>
          <button type="button" disabled={busy} onClick={() => void refresh()}>
            Refresh runs
          </button>
          <button
            type="button"
            data-testid="export-scene"
            disabled={busy || !payload || source === "bundle"}
            onClick={() => void exportScene()}
          >
            Export scene bundle
          </button>
          <button
            type="button"
            data-testid="import-scene"
            disabled={busy}
            onClick={() => void importScene()}
          >
            Open scene bundle
          </button>
          <button data-testid="export-scene-stream" disabled={busy||source!=="saved"||!payload} onClick={()=>void exportScene("stream")}>Export chunked LOD bundle</button>
          <button data-testid="import-scene-stream" disabled={busy} onClick={()=>void importStream()}>Open chunked scene bundle</button>
          <button data-testid="prepare-scene-handoff" disabled={busy||source!=="saved"||!payload} onClick={()=>void prepareHandoff()}>Prepare verified external-viewer bundle</button>
          {source !== "saved" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {setSource("saved");setIntent(null);}}
            >
              Return to saved run
            </button>
          )}
        </div>
        <h3>Bounded lattice examples</h3>
        <div className="scene-run-controls">
          <label>Geometry view<select aria-label="Geometry view" value={view} disabled={busy} onChange={e=>setView(e.target.value as "real"|"reciprocal")}><option value="real">Real-space cells</option><option value="reciprocal">Primitive reciprocal zone</option></select></label>
          <label>
            Family
            <select
              aria-label="Geometry family"
              value={family}
              disabled={busy}
              onChange={(e) => {
                setFamily(e.target.value as LatticeFamily);
                setRepeats((r) => [
                  r[0],
                  r[1],
                  e.target.value === "simple_cubic" ? "3" : "1",
                ]);
              }}
            >
              <option value="square">Square</option>
              <option value="honeycomb">Honeycomb</option>
              <option value="simple_cubic">Simple cubic</option>
            </select>
          </label>
          {repeats.map((v, i) => (
            <label key={i}>
              Repeat {"xyz"[i]}
              <input
                type="number"
                min="1"
                max="8"
                aria-label={`Geometry repeat ${"xyz"[i]}`}
                value={v}
                disabled={busy || (i === 2 && family !== "simple_cubic")}
                onChange={(e) =>
                  setRepeats((old) =>
                    old.map((n, j) => (i === j ? e.target.value : n)),
                  )
                }
              />
            </label>
          ))}
          <button
            data-testid="open-geometry-example"
            disabled={busy}
            onClick={() => void openExample()}
          >
            Preview geometry example
          </button>
        </div>
        <p>
          Open boundaries, 1…8 cells per axis. Schematic nearest-neighbor
          spacing, no atom species, Hamiltonian or hopping values. Preview
          applies the controls; export uses the displayed snapshot. Examples
          never enter numerical run history.
        </p>
        <p data-testid="scene-source">
          {source==="stream"?"IMPORTED CHUNKED BUNDLE · READ-ONLY · unread chunks are not verified":source === "example"
            ? "GEOMETRY FIXTURE · NO WORKER RUN"
            : source === "bundle"
              ? "IMPORTED BUNDLE · READ-ONLY · hashes verify integrity, not publisher identity"
              : "SAVED NUMERICAL RUN"}
        </p>
      </div>
      {message && (
        <p className="runs-message" role="status">
          {message}
        </p>
      )}
      {source==="saved"&&handoff&&payload?.scene.provenance.resultSha256===handoff.resultSha256&&runId===handoff.runId&&savedView===handoff.view&&(
        <div className="panel scene-provenance" data-testid="scene-handoff-receipt">
          <p className="eyebrow">QVIS-023 · VERIFIED PORTABLE HANDOFF</p>
          <h3>Ready for an independent quantum-scene/v1 consumer</h3>
          <p>Re-opened from disk with metadata and every binary dataset hash checked. This verifies integrity against the saved run, not the identity of a future recipient.</p>
          <p><strong>Bundle:</strong> {handoff.directory}</p>
          <p><strong>Source:</strong> {handoff.runId} · {handoff.resultSha256}</p>
          <p><strong>View:</strong> {handoff.view} · {handoff.bundleSchema} · {handoff.sceneSchema}</p>
          <p><strong>Coordinates:</strong> {handoff.coordinates.axes.map((axis,i)=>`${axis} [${handoff.coordinates.units[i]}]`).join(" · ")} · {handoff.coordinates.handedness}-handed</p>
          <p><strong>Datasets:</strong> {handoff.datasets.map(d=>`${d.id}: ${d.count}×${d.components} ${d.unit}`).join(" · ")}</p>
          <p>Full saved-run scene only. The current lab time/site selection is a local viewer focus and was not transferred. No Math3D import or automatic launch has been verified.</p>
        </div>
      )}
      {busy && !payload && (
        <p role="status">Checking saved result and numerical artifacts…</p>
      )}
      {!runId && source === "saved" && (
        <div className="panel runs-empty">
          Run Dynamics, Topology, Many-body or Orbitals first, then refresh
          here, or open a scene bundle. Existing saved runs and imported bundles
          work without a live worker.
        </div>
      )}
      {source==="stream"&&stream&&<div className="panel"><StreamViewer source={stream}/></div>}
      {payload && (
        <>
          {source==="saved"&&<p className="scene-bridge-status" data-testid="scene-bridge-status">{linked?.message??"Full saved-run scene; no lab selection attached."}</p>}
          <div className="panel">
            {payload.scene.fields?.length ? (
              <FieldViewer key={payload.scene.id} payload={payload} focusGrid={linked?.focus?.kind==="voxel"?linked.focus.grid:null}/>
            ) : (
              <SceneViewer key={payload.scene.id} payload={payload} focus={linked?.focus?.kind==="object"?linked.focus:null}/>
            )}
          </div>
          <div className="panel scene-provenance">
            <p className="eyebrow">
              {source === "bundle"
                ? "SUPPLIED PROVENANCE / NOT INDEPENDENTLY AUTHENTICATED"
                : source === "example"
                  ? "GEOMETRY DESCRIPTOR / NOT A NUMERICAL RESULT"
                  : "SCIENTIFIC PROVENANCE"}
            </p>
            <h3>{payload.scene.title}</h3>
            <p>
              {payload.scene.provenance.engine}{" "}
              {payload.scene.provenance.engineVersion} ·{" "}
              {payload.scene.provenance.computedAt}
            </p>
            <p>
              {Object.entries(payload.scene.provenance.parameters ?? {})
                .map(([key, value]) => `${key} = ${value}`)
                .join(" · ")}
            </p>
            <code data-testid="scene-run-id">
              {payload.scene.provenance.kind === "geometry-fixture"
                ? "Fixture"
                : "Run"}
              : {payload.scene.provenance.runId}
              <br />
              {payload.scene.provenance.kind === "geometry-fixture"
                ? "Geometry descriptor"
                : "Result"}{" "}
              SHA-256: {payload.scene.provenance.resultSha256}
            </code>
            {payload.scene.provenance.source && (
              <p>
                Atlas: {payload.scene.provenance.source.entryId} · revision{" "}
                {payload.scene.provenance.source.revision}
              </p>
            )}
            <p>
              quantum-scene/v1 · {payload.scene.objects.length} objects ·{" "}
              {payload.scene.datasets
                .reduce((n, d) => n + d.bytes, 0)
                .toLocaleString()}{" "}
              bytes · {payload.scene.coordinates.handedness}-handed coordinates
            </p>
            <details>
              <summary>Scene metadata and artifact references</summary>
              <pre>{JSON.stringify(payload.scene, null, 2)}</pre>
            </details>
          </div>
        </>
      )}
    </section>
  );
}
