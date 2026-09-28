import React, { useEffect, useRef, useState } from "react";
import type { QuantumBridge, RunSummary } from "../../../packages/contracts";
import type { ScenePayload } from "../../../packages/quantum-scene";
import { supportsScene } from "../../../packages/quantum-scene/from-result";
import type {
  LatticeFamily,
  SceneExampleRequest,
} from "../../../packages/quantum-scene/examples";
import { SceneViewer } from "../../../packages/quantum-3d/SceneViewer";
import { FieldViewer } from "../../../packages/quantum-3d/FieldViewer";
import "../../../packages/quantum-3d/scene.css";

export function SceneLab({ bridge }: { bridge: QuantumBridge }) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [runId, setRunId] = useState("");
  const [savedPayload, setPayload] = useState<ScenePayload | null>(null);
  const [imported, setImported] = useState<ScenePayload | null>(null);
  const [source, setSource] = useState<"saved" | "bundle" | "example">("saved");
  const [example, setExample] = useState<{
    request: SceneExampleRequest;
    payload: ScenePayload;
  } | null>(null);
  const [family, setFamily] = useState<LatticeFamily>("square"),
    [repeats, setRepeats] = useState(["3", "3", "1"]);
  const [view,setView]=useState<"real"|"reciprocal">("real");
  const payload =
    source === "example"
      ? (example?.payload ?? null)
      : source === "bundle"
        ? imported
        : savedPayload;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
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
          : (values[0]?.runId ?? ""),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }
  useEffect(() => {
    void refresh();
  }, [bridge]);
  useEffect(() => {
    const request = ++sequence.current;
    if (source !== "saved") return;
    setPayload(null);
    setMessage("");
    if (!runId) {
      setBusy(false);
      return;
    }
    setBusy(true);
    void bridge
      .getScene(runId)
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
  }, [bridge, runId, source]);
  async function importScene() {
    setBusy(true);
    setMessage("");
    try {
      const value = await bridge.importScene();
      if (value) {
        setImported(value);
        setSource("bundle");
        setMessage("Opened verified scene bundle · read-only preview");
      } else setMessage("Scene import cancelled");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  async function exportScene() {
    const current = runId;
    setBusy(true);
    try {
      const path =
        source === "example" && example
          ? await bridge.exportSceneExample(example.request)
          : await bridge.exportScene(current);
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
      setSource("example");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="scene-lab" data-testid="scenes-page">
      <div className="panel scene-intro">
        <p className="eyebrow">QVIS-001–009 · PORTABLE VISUALIZATION</p>
        <h2>One result. A portable scene.</h2>
        <p>
          Preview verified saved Bloch trajectories, SSH sublattices and bonds,
          Ising magnetization, QWZ curvature and hydrogenic orbital fields.
          Export the scene and binary datasets as a new .qscene folder. This Lab
          has no Math3D connection.
        </p>
        <div className="scene-run-controls">
          <label>
            Saved numerical run{" "}
            <select
              aria-label="Scene saved run"
              value={runId}
              onChange={(e) => {
                setRunId(e.target.value);
                setSource("saved");
              }}
              disabled={busy}
            >
              {!runs.length && <option value="">No compatible runs</option>}
              {runs.map((r) => (
                <option key={r.runId} value={r.runId}>
                  {r.model.replaceAll("_", " ")} · {r.engine} ·{" "}
                  {new Date(r.computedAt).toLocaleString()} ·{" "}
                  {r.runId.slice(-8)}
                </option>
              ))}
            </select>
          </label>
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
          {source !== "saved" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setSource("saved")}
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
          {source === "example"
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
      {payload && (
        <>
          <div className="panel">
            {payload.scene.fields?.length ? (
              <FieldViewer key={payload.scene.id} payload={payload} />
            ) : (
              <SceneViewer key={payload.scene.id} payload={payload} />
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
