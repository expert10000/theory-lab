import React, { useEffect, useRef, useState } from "react";
import type {
  OrbitalResult,
  QuantumBridge,
  WorkerStatus,
} from "../../../packages/contracts";
import {
  ORBITAL_DEFAULTS,
  orbitalJob,
  type OrbitalDraft,
} from "../../../packages/models/orbital";
import type { ScenePayload } from "../../../packages/quantum-scene";
import { FieldViewer } from "../../../packages/quantum-3d/FieldViewer";

const presets = [
  [1, 0, "1s"],
  [2, 0, "2s"],
  [2, 1, "2p"],
  [3, 0, "3s"],
  [3, 1, "3p"],
  [3, 2, "3d"],
] as const;
export function OrbitalLab({
  bridge,
  status,
  restored,
  restoreEpoch,
  onSnapshot,
}: {
  bridge: QuantumBridge;
  status: WorkerStatus;
  restored?: OrbitalDraft | null;
  restoreEpoch?: number;
  onSnapshot?: (draft: OrbitalDraft) => void;
}) {
  const [draft, setDraft] = useState<OrbitalDraft>(ORBITAL_DEFAULTS);
  const [result, setResult] = useState<OrbitalResult | null>(null),
    [payload, setPayload] = useState<ScenePayload | null>(null);
  const [running, setRunning] = useState(false),
    [progress, setProgress] = useState(0),
    [message, setMessage] = useState("");
  const jobId = useRef<string | null>(null),
    sequence = useRef(0);
  useEffect(() => {
    if (restoreEpoch) {
      sequence.current++;
      setDraft(restored ?? ORBITAL_DEFAULTS);
      setResult(null);
      setPayload(null);
    }
  }, [restoreEpoch]);
  useEffect(() => onSnapshot?.(draft), [draft, onSnapshot]);
  useEffect(
    () =>
      bridge.onProgress((p) => {
        if (p.jobId === jobId.current) setProgress(p.fraction);
      }),
    [bridge],
  );
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  const change = <K extends keyof OrbitalDraft>(
    key: K,
    value: OrbitalDraft[K],
  ) => setDraft((old) => ({ ...old, [key]: value }));
  let preview: ReturnType<typeof orbitalJob> | null = null,
    validation = "";
  try {
    preview = orbitalJob("preview", draft);
  } catch (e) {
    validation = String(e);
  }
  const ready =
    status.state === "READY" &&
    !!status.capabilities?.operations.includes("orbital") &&
    !!status.capabilities.engines.native.available;
  const stale =
    !!result &&
    (!preview ||
      JSON.stringify(preview.model) !== JSON.stringify(result.model));
  const displayN = Math.max(1, Math.min(3, Number(draft.n) || 1));
  const displayL = Math.max(0, Math.min(2, Number(draft.l) || 0));
  function quantumChange(key: "n" | "l" | "m" | "basis", value: string) {
    setDraft((old) => {
      const next = { ...old, [key]: value };
      const l = Math.min(Number(next.l), Number(next.n) - 1);
      next.l = String(l);
      let m = Math.max(-l, Math.min(l, Number(next.m)));
      if (next.basis !== "complex") m = Math.abs(m);
      if (next.basis === "real_sin" && m === 0) {
        if (l > 0) m = 1;
        else next.basis = "real_cos";
      }
      next.m = String(m);
      return next;
    });
  }
  async function run() {
    if (!preview || !ready || running) return;
    const request = ++sequence.current,
      id = `job-${crypto.randomUUID()}`;
    jobId.current = id;
    setRunning(true);
    setProgress(0);
    setMessage("");
    setPayload(null);
    setResult(null);
    try {
      const value = await bridge.orbital({ ...preview, jobId: id });
      if (request !== sequence.current) return;
      setResult(value);
      const scene = await bridge.getScene(value.runId);
      if (request === sequence.current) setPayload(scene);
    } catch (e) {
      if (request === sequence.current)
        setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      jobId.current = null;
      setRunning(false);
    }
  }
  async function exportScene() {
    if (!result) return;
    try {
      const path = await bridge.exportScene(result.runId);
      setMessage(
        path ? `Exported verified scene bundle: ${path}` : "Export cancelled",
      );
    } catch (e) {
      setMessage(String(e));
    }
  }
  const a = result?.analysis,
    p = result?.model.parameters;
  const max = a ? Math.max(...a.radialProbability) : 1;
  return (
    <div className="cavity-lab" data-testid="orbital-lab">
      <section className="hamiltonian-card">
        <div>
          <p className="eyebrow">HYDROGENIC ORBITALS / QVIS-004</p>
          <div className="formula">ψₙₗₘ = Rₙₗ(r)Yₗᵐ(θ,φ) · Eₙ = −Z² / 2n²</div>
        </div>
        <div className="model-convention">
          <span>ONE ELECTRON / COULOMB</span>
          <p>Bohr radius a₀ · energy in Hartree</p>
        </div>
      </section>
      <section className="panel dynamics-settings">
        <div>
          <p className="eyebrow">
            NATIVE NUMPY / SCIPY · ANALYTIC, NOT A QUTIP SOLVER
          </p>
          <h2>Orbitals as verified fields.</h2>
          <p>
            Nonrelativistic stationary states with an infinitely heavy nucleus.
            No spin, fine structure, electron interactions or molecules. The
            finite Cartesian grid is never renormalized.
          </p>
        </div>
        <div className="scene-run-controls">
          {presets.map(([n, l, label]) => (
            <button
              key={label}
              disabled={running}
              onClick={() =>
                setDraft((old) => ({
                  ...old,
                  n: String(n),
                  l: String(l),
                  m: l ? "1" : "0",
                  basis: l ? "real_cos" : "complex",
                  radius: String(
                    Math.min(120, (8 * n * n) / Number(old.Z || 1)),
                  ),
                }))
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="dynamics-fields">
          <label>
            Principal n
            <select
              aria-label="Orbital n"
              disabled={running}
              value={draft.n}
              onChange={(e) => quantumChange("n", e.target.value)}
            >
              {[1, 2, 3].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Angular l
            <select
              aria-label="Orbital l"
              disabled={running}
              value={draft.l}
              onChange={(e) => quantumChange("l", e.target.value)}
            >
              {Array.from({ length: displayN }, (_, v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Magnetic m
            <select
              aria-label="Orbital m"
              disabled={running}
              value={draft.m}
              onChange={(e) => quantumChange("m", e.target.value)}
            >
              {Array.from({ length: 2 * displayL + 1 }, (_, v) => v - displayL)
                .filter(
                  (v) =>
                    draft.basis === "complex" ||
                    (draft.basis === "real_sin" ? v > 0 : v >= 0),
                )
                .map((v) => (
                  <option key={v}>{v}</option>
                ))}
            </select>
          </label>
          <label>
            Harmonic basis
            <select
              aria-label="Orbital basis"
              disabled={running}
              value={draft.basis}
              onChange={(e) => quantumChange("basis", e.target.value)}
            >
              <option value="complex">Complex Y(l,m)</option>
              <option value="real_cos">Real · cosine</option>
              <option value="real_sin" disabled={Number(draft.l) === 0}>
                Real · sine
              </option>
            </select>
          </label>
          <label>
            Nuclear charge Z
            <input
              aria-label="Orbital Z"
              disabled={running}
              type="number"
              min="1"
              max="6"
              step="1"
              value={draft.Z}
              onChange={(e) => change("Z", e.target.value)}
            />
          </label>
          <label>
            Cube half-width (a₀)
            <input
              aria-label="Orbital radius"
              disabled={running}
              type="number"
              min="0.5"
              max="120"
              step="0.5"
              value={draft.radius}
              onChange={(e) => change("radius", e.target.value)}
            />
          </label>
          <label>
            Points per axis
            <select
              aria-label="Orbital grid"
              disabled={running}
              value={draft.grid}
              onChange={(e) => change("grid", e.target.value)}
            >
              {[21, 31, 41, 49].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="dynamics-actions">
          <button
            className="run-button"
            data-testid="run-orbital"
            disabled={!preview || !ready || running}
            onClick={() => void run()}
          >
            {running
              ? `Computing ${Math.round(progress * 100)}%…`
              : "▶ Compute orbital"}
          </button>
          {running && (
            <button
              onClick={() => {
                if (jobId.current)
                  void bridge
                    .cancel(jobId.current)
                    .catch((e) => setMessage(String(e)));
              }}
            >
              Cancel orbital
            </button>
          )}
          <span>
            {ready ? "NATIVE ORBITAL ENGINE READY" : "WORKER NOT READY"}
          </span>
        </div>
        {validation && <p className="validation">{validation}</p>}
        <p>
          Complex harmonics include the Condon–Shortley phase. Real basis:
          √2(−1)ᵐ Re/Im Yₗᵐ for m &gt; 0; m = 0 is unchanged.
        </p>
      </section>
      {message && (
        <p className="runs-message" role="status">
          {message}
        </p>
      )}
      {result && a && p && (
        <section className="panel cavity-result" data-testid="orbital-result">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                COMPUTED n={p.n} l={p.l} m={p.m} Z={p.Z} / {p.basis}
              </p>
              <h2>Density, phase & normalization</h2>
            </div>
            <span className={`result-badge ${stale ? "stale" : ""}`}>
              {stale ? "OUT OF DATE" : "SAVED RUN"}
            </span>
          </div>
          <div className="cavity-metrics">
            <div>
              <span>ENERGY / HARTREE</span>
              <strong data-testid="orbital-energy">
                {a.energyHartree.toFixed(6)}
              </strong>
            </div>
            <div>
              <span>RADIAL NORM / [0,∞)</span>
              <strong>{a.radialNormalization.toFixed(8)}</strong>
            </div>
            <div>
              <span>CUBE GRID INTEGRAL</span>
              <strong data-testid="orbital-probability">
                {a.gridProbability.toFixed(6)}
              </strong>
            </div>
            <div>
              <span>MEAN RADIUS / a₀</span>
              <strong>{a.meanRadius.toFixed(5)}</strong>
            </div>
          </div>
          <p>
            Grid {p.grid}³ · spacing{" "}
            {((2 * p.radius) / (p.grid - 1)).toPrecision(4)} a₀ · radial nodes{" "}
            {p.n - p.l - 1}. Cube integral uses endpoint-weighted trapezoidal
            quadrature; missing tails and discretization error are both present.
            Refine the grid and vary the box independently. Values above 1
            indicate quadrature error, not extra probability.
          </p>
          {Math.abs(a.gridProbability - 1) > 0.02 && (
            <p className="validation">
              Grid integral differs from 1 by more than 2%. Check box size and
              resolution before interpreting this sampled field quantitatively.
            </p>
          )}
          {payload && <FieldViewer key={result.runId} payload={payload} />}
          <div className="sweep-visual">
            <p className="eyebrow">
              RADIAL PROBABILITY r²|R(r)|² / NOT 3D DENSITY
            </p>
            <svg
              viewBox="0 0 800 260"
              role="img"
              aria-label="Orbital radial probability"
            >
              <path d="M50 20 V220 H760" stroke="#526875" fill="none" />
              <polyline
                points={a.radialProbability
                  .map(
                    (v, i) =>
                      `${50 + (710 * a.radialRadii[i]) / a.radialRadii[400]},${220 - (180 * v) / max}`,
                  )
                  .join(" ")}
                fill="none"
                stroke="#79d9c1"
                strokeWidth="2"
              />
              <text x="50" y="245" fill="#a7bbc4" fontSize="12">
                r = 0
              </text>
              <text x="610" y="245" fill="#a7bbc4" fontSize="12">
                r = {a.radialRadii[400].toPrecision(4)} a₀
              </text>
            </svg>
          </div>
          <button
            data-testid="export-orbital-scene"
            disabled={!payload}
            onClick={() => void exportScene()}
          >
            Export orbital scene bundle
          </button>
          <p className="plot-caption">
            {result.engine.name} SciPy {result.engine.version} · {result.runId}{" "}
            · artifact SHA-256 {result.data.sha256}
          </p>
        </section>
      )}
    </div>
  );
}
