import React, { useState } from "react";
import "./web.css";
import { createRoot } from "react-dom/client";
import { defaultsFor, evolutionJob, spectrumJob } from "../../packages/models";
import type { EvolutionResult, RunSummary, SpectrumResult, TopologyJob, TopologyResult, WorkerStatus } from "../../packages/contracts";
import { WorkerDashboard } from "./WorkerDashboard";
import { AtlasBrowser } from "./AtlasBrowser";
import type { AtlasBinding } from "../../packages/atlas/bindings";
import { TOPOLOGY_DEFAULTS, isTopologyResponse } from "../../packages/models/topology";
import { TopologyLab } from "./TopologyLab";
import {WebSceneLab} from "./SceneLab";

type Mode = "spectrum" | "dynamics" | "worker" | "atlas" | "topology"|"scenes";
type Engine = "qutip" | "native";
type Reading = { result: SpectrumResult | EvolutionResult; points?: { time: number; p1: number }[] };

function isWebResult(value: unknown): value is SpectrumResult | EvolutionResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, any>;
  if (result.schema !== "quantum-result/v1" || result.status !== "completed" ||
      typeof result.jobId !== "string" || typeof result.runId !== "string" ||
      !result.engine || typeof result.engine.name !== "string" || !result.provenance ||
      !Number.isFinite(result.provenance.durationMs)) return false;
  if (result.operation === "diagonalize") return Array.isArray(result.spectrum?.eigenvalues) &&
    result.spectrum.eigenvalues.length === 2 && result.spectrum.eigenvalues.every(Number.isFinite);
  return result.operation === "evolve" && result.data?.format === "f64le" &&
    Number.isInteger(result.data.rows) && result.data.rows >= 2 && result.data.rows <= 50000 &&
    Array.isArray(result.data.columns) && result.data.columns.length === 10 &&
    result.data.bytes === result.data.rows * 10 * 8 && /^[a-f0-9]{64}$/.test(result.data.sha256);
}

function App() {
  const [tokenDraft, setTokenDraft] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<WorkerStatus | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [mode, setMode] = useState<Mode>("spectrum");
  const [engine, setEngine] = useState<Engine>("qutip");
  const [delta, setDelta] = useState(defaultsFor("two_level").delta);
  const [omega, setOmega] = useState(defaultsFor("two_level").omega);
  const [amplitude, setAmplitude] = useState(defaultsFor("driven_two_level").amplitude);
  const [frequency, setFrequency] = useState(defaultsFor("driven_two_level").frequency);
  const [reading, setReading] = useState<Reading | null>(null);
  const [topologyDraft, setTopologyDraft] = useState(TOPOLOGY_DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function api(path: string, secret: string, init: RequestInit = {}) {
    const response = await fetch(path, { ...init, headers: { Authorization: `Bearer ${secret}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}) } });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return response;
  }
  async function refresh(secret: string) {
    const [nextStatus, nextRuns] = await Promise.all([
      api("/api/status", secret).then(response => response.json() as Promise<WorkerStatus>),
      api("/api/runs", secret).then(response => response.json() as Promise<RunSummary[]>),
    ]);
    setStatus(nextStatus);
    setRuns(nextRuns);
  }
  async function connect(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try { await refresh(tokenDraft); setToken(tokenDraft); setTokenDraft(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Connection failed"); }
  }
  async function run(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const jobId = crypto.randomUUID();
      const job = mode === "spectrum" ? spectrumJob(jobId, { delta, omega }, engine) :
        evolutionJob("driven_two_level", jobId, { delta, amplitude, frequency, phase: "0" }, 0, 0, 20, 201, engine);
      const payload: unknown = await api("/api/jobs", token, { method: "POST", body: JSON.stringify(job) }).then(response => response.json());
      if (!isWebResult(payload) || payload.jobId !== jobId || payload.operation !== job.operation)
        throw new Error("Gateway returned an invalid result contract");
      const result = payload;
      if (result.operation === "diagonalize") setReading({ result });
      else if (result.operation === "evolve") {
        const response = await api(`/api/artifacts/${jobId}`, token);
        const bytes = await response.arrayBuffer();
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), byte => byte.toString(16).padStart(2, "0")).join("");
        if (bytes.byteLength !== result.data.bytes || digest !== result.data.sha256)
          throw new Error("Binary artifact failed integrity check");
        const view = new DataView(bytes);
        const stride = result.data.columns.length;
        const points = Array.from({ length: result.data.rows }, (_, index) => ({
          time: view.getFloat64(index * stride * 8, true), p1: view.getFloat64((index * stride + 2) * 8, true),
        }));
        setReading({ result, points });
      } else throw new Error("Unexpected result operation");
      await refresh(token);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Calculation failed"); }
    finally { setBusy(false); }
  }
  async function runTopology(job: TopologyJob): Promise<TopologyResult> {
    const payload: unknown = await api("/api/jobs", token, { method: "POST", body: JSON.stringify(job) }).then(response => response.json());
    if (!isTopologyResponse(payload, job))
      throw new Error("Gateway returned an invalid or inconsistent topology result");
    await refresh(token);
    return payload;
  }
  function atlasSupported(binding: AtlasBinding) {
    return binding.kind === "spectrum" || binding.kind === "topology" ||
      (binding.kind === "dynamics" && binding.modelId === "driven_two_level");
  }
  function loadAtlas(binding: AtlasBinding) {
    if (binding.kind === "spectrum") {
      setDelta(String(binding.parameters.delta)); setOmega(String(binding.parameters.omega)); setReading(null); setMode("spectrum");
    } else if (binding.kind === "dynamics" && binding.modelId === "driven_two_level") {
      setDelta(String(binding.parameters.delta)); setAmplitude(String(binding.parameters.amplitude));
      setFrequency(String(binding.parameters.frequency)); setReading(null); setMode("dynamics");
    } else if (binding.kind === "topology") {
      setTopologyDraft(current => binding.modelId === "ssh"
        ? { ...current, modelId: "ssh", t1: String(binding.parameters.t1), t2: String(binding.parameters.t2),
            cells: String(binding.parameters.cells), kPoints: String(binding.parameters.kPoints) }
        : { ...current, modelId: "qwz", mass: String(binding.parameters.mass), grid: String(binding.parameters.grid) });
      setMode("topology");
    }
  }

  const spectrum = reading?.result.operation === "diagonalize" ? reading.result : null;
  const evolution = reading?.result.operation === "evolve" ? reading.result : null;
  const points = reading?.points;
  const chart = points ? points.map((point, index) => `${24 + index * 592 / (points.length - 1)},${218 - point.p1 * 178}`).join(" ") : "";
  const formatted = (value: number) => Number.isFinite(value) ? value.toFixed(6) : "—";
  return <div className="app">
    <header><div className="brand"><span className="brand-symbol">Ψ</span><div><strong>QUANTUM HAMILTONIAN LAB</strong><small>Web laboratory · QVIS-013</small></div></div>
      <div className="header-status"><span className={status?.state === "READY" ? "lamp on" : "lamp"}/>{status?.state === "READY" ? `${status.transport ?? "local"} worker ready` : "Gateway connection required"}</div></header>
    <main>
      <aside><div className="eyebrow">LABORATORIES</div>
        <button className={mode === "spectrum" ? "nav selected" : "nav"} onClick={() => setMode("spectrum")}><span>01</span> Two-level spectrum</button>
        <button className={mode === "dynamics" ? "nav selected" : "nav"} onClick={() => setMode("dynamics")}><span>02</span> Rabi dynamics</button>
        <button className={mode === "topology" ? "nav selected" : "nav"} onClick={() => setMode("topology")}><span>03</span> Topological bands</button>
        <button className={mode === "worker" ? "nav selected" : "nav"} onClick={() => setMode("worker")}><span>04</span> Worker &amp; API</button>
        <button className={mode === "atlas" ? "nav selected" : "nav"} onClick={() => setMode("atlas")}><span>05</span> Hamiltonian Atlas</button>
        <button className={mode === "scenes" ? "nav selected" : "nav"} onClick={() => setMode("scenes")}><span>06</span> Portable scenes</button>
        <div className="aside-note">Runs travel through the versioned job contract to the supervised Python worker. Binary dynamics data is checked in this browser before plotting.</div>
        <div className="side-footer">QuTiP / NumPy · ℏ = 1</div>
      </aside>
      <section className="workspace">
        {mode !== "scenes" && mode !== "worker" && mode !== "atlas" && mode !== "topology" && <div className="page-intro"><div><div className="eyebrow">LIVE COMPUTATION</div><h1>{mode === "spectrum" ? "Two-level spectrum" : "Rabi dynamics"}</h1><p>{mode === "spectrum" ? "Diagonalize a coupled two-state Hamiltonian and inspect its eigenenergies." : "Evolve a driven qubit and inspect its excited-state population."}</p></div><div className="model-badge">{mode === "spectrum" ? "H = ½(Δσz + Ωσx)" : "H(t) = ½Δσz + ½A cos(ωt)σx"}</div></div>}
        {mode === "scenes" ? <WebSceneLab token={token} runs={runs}/> : mode === "atlas" ? <AtlasBrowser onLoad={loadAtlas} supported={atlasSupported}/> : !token ? <form className="connect card" onSubmit={connect}><div className="eyebrow">CONNECT TO GATEWAY</div><h2>Enter access token</h2><p>The token is held in memory only. Refreshing the page clears it. Use HTTPS for access beyond this computer.</p>
          <div className="connect-row"><input aria-label="Gateway access token" type="password" autoComplete="off" value={tokenDraft} onChange={event => setTokenDraft(event.target.value)} placeholder="Gateway access token" required/><button className="primary">Connect</button></div></form> :
          mode === "worker" ? <WorkerDashboard token={token} onStatus={setStatus}/> :
          mode === "topology" ? <TopologyLab draft={topologyDraft} onDraft={setTopologyDraft} status={status} runJob={runTopology}/> :
          <div className="grid"><form className="card controls" onSubmit={run}><div className="eyebrow">01 / CONFIGURE</div><h2>Experiment controls</h2>
            <div className="field"><label htmlFor="engine">Numerical engine</label><select id="engine" value={engine} onChange={event => setEngine(event.target.value as Engine)}><option value="qutip" disabled={!status?.capabilities?.engines.qutip.available}>QuTiP</option><option value="native" disabled={!status?.capabilities?.engines.native.available}>Native NumPy / SciPy</option></select></div>
            <div className="field"><label htmlFor="delta">Detuning Δ</label><input id="delta" type="number" step="any" value={delta} onChange={event => setDelta(event.target.value)} required/></div>
            {mode === "spectrum" ? <div className="field"><label htmlFor="omega">Coupling Ω</label><input id="omega" type="number" step="any" value={omega} onChange={event => setOmega(event.target.value)} required/></div> : <>
              <div className="field"><label htmlFor="amplitude">Drive amplitude A</label><input id="amplitude" type="number" step="any" value={amplitude} onChange={event => setAmplitude(event.target.value)} required/></div>
              <div className="field"><label htmlFor="frequency">Drive frequency ω</label><input id="frequency" type="number" step="any" min="0" value={frequency} onChange={event => setFrequency(event.target.value)} required/></div>
              <div className="fixed-grid">Time <strong>0 → 20</strong><span>Samples <strong>201</strong></span></div></>}
            <button className="primary run" disabled={busy || status?.state !== "READY"}>{busy ? "Computing…" : "Run calculation →"}</button>
            <div className="control-foot">{status?.capabilities?.python.version ? `Python ${status.capabilities.python.version}` : "Worker unavailable"} · Results saved by gateway</div>
          </form><div className="right-column"><div className="card result"><div className="eyebrow">02 / RESULT</div><h2>{spectrum ? "Eigenenergy spectrum" : evolution ? "Population dynamics" : "Awaiting calculation"}</h2>
            {spectrum ? <><div className="energy-list"><div><span>E−</span><strong>{formatted(spectrum.spectrum.eigenvalues[0])}</strong></div><div><span>E+</span><strong>{formatted(spectrum.spectrum.eigenvalues[1])}</strong></div></div><div className="result-note">Analytic E± = ±½√(Δ² + Ω²) · normalized energy</div></> : evolution && points ? <><svg className="chart" viewBox="0 0 640 250" role="img" aria-label="Excited-state probability versus time"><line x1="24" x2="616" y1="218" y2="218"/><line x1="24" x2="24" y1="40" y2="218"/><polyline points={chart}/><text x="25" y="238">0</text><text x="585" y="238">t = 20</text><text x="28" y="35">P₁</text></svg><div className="result-note">Final P₁ = {formatted(points.at(-1)?.p1 ?? NaN)} · 201 verified samples · ℏ = 1</div></> : <div className="empty-state"><div className="orbital">◎</div><p>Set parameters and run an experiment to see its computed result.</p></div>}
            {reading && <div className="provenance">{reading.result.engine.name} {reading.result.engine.version} · {reading.result.provenance.durationMs.toFixed(1)} ms<br/>Run {reading.result.runId}</div>}
          </div><div className="card history"><div className="eyebrow">RUN HISTORY</div><h2>Recent calculations</h2>{runs.length ? <ul>{runs.slice(0, 5).map(run => <li key={run.runId}><span>{run.model.replaceAll("_", " ")}</span><small>{run.engine} · {new Date(run.computedAt).toLocaleString()}</small></li>)}</ul> : <p>No saved runs yet.</p>}</div></div></div>}
        {error && <div className="error" role="alert">{error}</div>}
      </section>
    </main>
  </div>;
}

createRoot(document.getElementById("root")!).render(<App/>);
