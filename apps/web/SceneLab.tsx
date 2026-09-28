import React, { useEffect, useRef, useState } from "react";
import type { RunSummary } from "../../packages/contracts";
import {
  assertScene,
  verifyScenePayload,
  type ScenePayload,
} from "../../packages/quantum-scene";
import { supportsScene } from "../../packages/quantum-scene/from-result";
import {
  assertStream,
  SceneChunkLoader,
  MAX_STREAM_METADATA,
  STREAM_CHUNK_BYTES,
} from "../../packages/quantum-scene/stream";
import {
  readBrowserBundle,
  boundedResponse,
} from "../../packages/quantum-scene/browser-bundle";
import {
  SceneViewer,
  browserSceneDigest,
} from "../../packages/quantum-3d/SceneViewer";
import { FieldViewer } from "../../packages/quantum-3d/FieldViewer";
import {
  StreamViewer,
  type SceneStreamSource,
} from "../../packages/quantum-3d/StreamViewer";
import "../../packages/quantum-3d/scene.css";
export function WebSceneLab({
  token,
  runs,
}: {
  token: string;
  runs: RunSummary[];
}) {
  const compatible = runs.filter((r) => supportsScene(r.operation, r.model)),
    [runId, setRunId] = useState(""),
    [view, setView] = useState("standard"),
    [payload, setPayload] = useState<ScenePayload | null>(null),
    [stream, setStream] = useState<SceneStreamSource | null>(null),
    [source, setSource] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    sequence = useRef(0),
    controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      sequence.current++;
      controller.current?.abort();
    },
    [],
  );
  async function api(path: string, signal: AbortSignal) {
    const r = await fetch(path, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    if (!r.ok) throw new Error(`Scene request failed (HTTP ${r.status})`);
    return r;
  }
  async function load(chunked: boolean) {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    const serial = ++sequence.current;
    setBusy(true);
    setMessage("");
    try {
      const id = runId || compatible[0]?.runId;
      if (!id || !/^[A-Za-z0-9_-]{1,100}$/.test(id))
        throw new Error("Choose a compatible saved run");
      const base = `/api/scenes/${id}`,
        query = `?view=${view}`;
      if (chunked) {
        const bytes = await boundedResponse(
            await api(`${base}/stream${query}`, c.signal),
            MAX_STREAM_METADATA,
          ),
          manifest: unknown = JSON.parse(new TextDecoder().decode(bytes));
        assertStream(manifest);
        if (manifest.levels.some((l) => l.scene.provenance.runId !== id))
          throw new Error("Scene run mismatch");
        const source: SceneStreamSource = {
          manifest,
          read: async (path, signal) =>
            boundedResponse(
              await api(`${base}/chunks/${path}${query}`, signal),
              STREAM_CHUNK_BYTES,
            ),
        };
        source.loader = new SceneChunkLoader(
          manifest,
          source.read,
          browserSceneDigest,
        );
        await source.loader.load(0, c.signal);
        if (serial === sequence.current) {
          setStream(source);
          setPayload(null);
          setSource("GATEWAY SAVED RUN · CHUNKED");
        }
      } else {
        const bytes = await boundedResponse(
            await api(`${base}${query}`, c.signal),
            128 * 1024,
          ),
          scene: unknown = JSON.parse(new TextDecoder().decode(bytes));
        assertScene(scene);
        if (scene.provenance.runId !== id)
          throw new Error("Scene run mismatch");
        const artifacts: Record<string, Uint8Array> = {};
        for (const d of scene.datasets)
          artifacts[d.path] = await boundedResponse(
            await api(`${base}/datasets/${d.id}${query}`, c.signal),
            d.bytes,
          );
        const p = { scene, artifacts };
        await verifyScenePayload(p, browserSceneDigest);
        if (serial === sequence.current) {
          setPayload(p);
          setStream(null);
          setSource("GATEWAY SAVED RUN · SHA-256 VERIFIED");
        }
      }
    } catch (e) {
      if (serial === sequence.current)
        setMessage(
          c.signal.aborted
            ? "Loading cancelled · previous verified preview retained"
            : `${e instanceof Error ? e.message : String(e)} · previous verified preview retained`,
        );
    } finally {
      if (serial === sequence.current) setBusy(false);
    }
  }
  async function importFiles(files: File[]) {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    const serial = ++sequence.current;
    setBusy(true);
    setMessage("");
    try {
      const result = await readBrowserBundle(
        files.map((f) => ({
          path: f.webkitRelativePath || f.name,
          size: f.size,
          read: async () => new Uint8Array(await f.arrayBuffer()),
        })),
        browserSceneDigest,
        c.signal,
      );
      let source: SceneStreamSource | undefined;
      if (result.kind === "stream") {
        source = {
          ...result,
          loader: new SceneChunkLoader(
            result.manifest,
            result.read,
            browserSceneDigest,
          ),
        };
        await source.loader!.load(0, c.signal);
      }
      c.signal.throwIfAborted();
      if (serial === sequence.current) {
        if (result.kind === "regular") {
          setPayload(result.payload);
          setStream(null);
        } else {
          setPayload(null);
          setStream(source!);
        }
        setSource(
          "IMPORTED BUNDLE · READ-ONLY · supplied provenance is not authenticated",
        );
      }
    } catch (e) {
      if (serial === sequence.current)
        setMessage(
          `${c.signal.aborted ? "Loading cancelled" : e instanceof Error ? e.message : String(e)} · previous verified preview retained`,
        );
    } finally {
      if (serial === sequence.current) setBusy(false);
    }
  }
  return (
    <section className="scene-lab" data-testid="web-scenes">
      <h1>Portable scenes · QVIS v0.1</h1>
      <p>
        Same scene/field/topology viewers as desktop. Offline folder imports
        stay in this browser: no upload, worker call or fabricated run-history
        entry.
      </p>
      <div className="scene-run-controls">
        <label>
          Saved numerical run
          <select
            aria-label="Web scene saved run"
            value={runId || compatible[0]?.runId || ""}
            disabled={busy}
            onChange={(e) => setRunId(e.target.value)}
          >
            <option value="" disabled>
              No compatible run
            </option>
            {compatible.map((r) => (
              <option key={r.runId} value={r.runId}>
                {r.model} · {r.runId.slice(-8)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Saved view
          <select
            aria-label="Web scene view"
            value={view}
            disabled={busy}
            onChange={(e) => setView(e.target.value)}
          >
            <option value="standard">Standard scene</option>
            <option value="bands">SSH / QWZ bands</option>
          </select>
        </label>
        <button disabled={busy || !token} onClick={() => void load(false)}>
          Load saved scene
        </button>
        <button disabled={busy || !token} onClick={() => void load(true)}>
          Load chunked preview
        </button>
        <button disabled={!busy} onClick={() => controller.current?.abort()}>
          Cancel scene request
        </button>
      </div>
      <label>
        Open scene folder
        <input
          aria-label="Open scene folder"
          type="file"
          multiple
          {...({ webkitdirectory: "" } as any)}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            void importFiles(files);
          }}
        />
      </label>
      <p data-testid="web-scene-source">{source}</p>
      {message && <p role="alert">{message}</p>}
      {stream && <StreamViewer source={stream} />}{" "}
      {payload &&
        (payload.scene.fields?.length ? (
          <FieldViewer key={payload.scene.id} payload={payload} />
        ) : (
          <SceneViewer key={payload.scene.id} payload={payload} />
        ))}
      {payload && (
        <>
          <p>
            {payload.scene.title} · Run: {payload.scene.provenance.runId}
          </p>
          <details>
            <summary>Scene provenance</summary>
            <pre>{JSON.stringify(payload.scene.provenance, null, 2)}</pre>
          </details>
        </>
      )}
    </section>
  );
}
