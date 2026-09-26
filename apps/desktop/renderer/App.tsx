import React, { useEffect, useRef, useState } from "react";
import type {
  EngineName,
  QuantumBridge,
  SpectrumResult,
  WorkerStatus,
} from "../../../packages/contracts";
import { Spectrum, format } from "./Spectrum";
import { DynamicsLab } from "./DynamicsLab";
import { BackendPanel } from "./BackendPanel";
import {
  compareSpectrum,
  type SpectrumComparison,
} from "../../../packages/quantum-3d/comparison";
import {
  MODEL_REGISTRY,
  defaultsFor,
  parametersFor,
  spectrumJob,
  type EvolutionModelId,
} from "../../../packages/models";
declare global {
  interface Window {
    quantum: QuantumBridge;
  }
}
const futureLabs = [
  "Jaynes–Cummings",
  "Quantum Rabi",
  "Lindblad dynamics",
  "Parameter sweeps",
];
type EngineMode = EngineName | "compare";

export function App() {
  const [status, setStatus] = useState<WorkerStatus>({
    state: "STARTING",
    detail: "Starting Python worker",
    capabilities: null,
  });
  const [parameters, setParameters] = useState(() => defaultsFor("two_level"));
  const delta = parameters.delta;
  const omega = parameters.omega;
  const [evolutionModel, setEvolutionModel] =
    useState<EvolutionModelId>("driven_two_level");
  const [result, setResult] = useState<SpectrumResult | null>(null);
  const [engineMode, setEngineMode] = useState<EngineMode>("qutip");
  const [resultMode, setResultMode] = useState<EngineMode | null>(null);
  const [comparison, setComparison] = useState<SpectrumComparison | null>(null);
  const [busy, setBusy] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<
    "spectrum" | "hamiltonian" | "dynamics" | "roadmap" | "backend"
  >("spectrum");
  const initialRun = useRef(false);
  const valid = parametersFor("two_level", parameters) !== null;
  const ready =
    status.state === "READY" &&
    !!status.capabilities?.operations.includes("diagonalize") &&
    (engineMode === "compare"
      ? status.capabilities.engines.qutip.available &&
        status.capabilities.engines.native.available
      : status.capabilities.engines[engineMode].available);
  const stale =
    result &&
    (Number(delta) !== result.model.parameters.delta ||
      Number(omega) !== result.model.parameters.omega ||
      !valid ||
      engineMode !== resultMode);
  const analytic = result
    ? Math.hypot(result.model.parameters.delta, result.model.parameters.omega) /
      2
    : null;
  const residual =
    result && analytic !== null
      ? Math.max(
          Math.abs(result.spectrum.eigenvalues[0] + analytic),
          Math.abs(result.spectrum.eigenvalues[1] - analytic),
        )
      : null;
  useEffect(() => {
    let mounted = true;
    const update = async () => {
      try {
        const next = await window.quantum.getStatus();
        if (mounted) setStatus(next);
      } catch (err) {
        if (mounted) setError(String(err));
      }
    };
    void update();
    const timer = setInterval(() => void update(), 750);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);
  async function run() {
    if (!valid || !ready || busy) return;
    setBusy(true);
    setError("");
    try {
      const first = await window.quantum.run(
        spectrumJob(
          `job-${crypto.randomUUID()}`,
          parameters,
          engineMode === "compare" ? "qutip" : engineMode,
        ),
      );
      if (engineMode === "compare") {
        const native = await window.quantum.run(
          spectrumJob(`job-${crypto.randomUUID()}`, parameters, "native"),
        );
        setComparison(compareSpectrum(first, native));
      } else setComparison(null);
      setResult(first);
      setResultMode(engineMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (ready && !initialRun.current) {
      initialRun.current = true;
      void run();
    }
  }, [ready]);
  async function restart() {
    setRestarting(true);
    setError("");
    try {
      setStatus(await window.quantum.restart());
    } catch (err) {
      setError(String(err));
    } finally {
      setRestarting(false);
    }
  }
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-symbol">ψ</span>
          <div>
            QUANTUM <span className="brand-light">HAMILTONIAN LAB</span>
            <small>
              THEORY LAB <span>/</span> DESKTOP COMPUTATIONAL LABORATORY
            </small>
          </div>
        </div>
        <div className="top-actions">
          <span className="version">V0.1 · QLAB-011</span>
          {tab !== "dynamics" && tab !== "backend" && tab !== "roadmap" && (
            <button
              className="run-button"
              onClick={() => void run()}
              disabled={!ready || !valid || busy || restarting}
            >
              {busy
                ? "Calculating…"
                : engineMode === "compare"
                  ? "▶  Compare spectrum"
                  : "▶  Run spectrum"}
            </button>
          )}
        </div>
      </header>
      <div className={`layout ${tab === "dynamics" ? "dynamics-layout" : ""}`}>
        <aside className="sidebar">
          <p className="eyebrow">
            LABORATORIES <span>05 / 09</span>
          </p>
          {(
            [
              "two_level",
              "driven_two_level",
              "landau_zener",
              "stuckelberg",
              "strong_drive",
            ] as const
          ).map((id) => (
            <button
              key={id}
              className="lab-selected"
              onClick={() => {
                if (id !== "two_level") setEvolutionModel(id);
                setTab(id === "two_level" ? "spectrum" : "dynamics");
              }}
            >
              <span>{id === "two_level" ? "◈" : "∿"}</span>{" "}
              {MODEL_REGISTRY[id].label} <span className="live-dot" />
            </button>
          ))}
          <p className="sidebar-note">
            The smallest quantum system.
            <br />
            The foundation for everything next.
          </p>
          <p className="eyebrow planned-label">PLANNED FOR V1</p>
          <nav aria-label="Planned laboratories">
            {futureLabs.map((lab, i) => (
              <div className="future-lab" key={lab}>
                <span>{String(i + 6).padStart(2, "0")}</span>
                {lab}
              </div>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <p className="eyebrow">ARCHITECTURE MILESTONE</p>
            <strong>One complete scientific path.</strong>
            <p>
              React → contract → Python
              <br />→ QuTiP / Native → result
            </p>
            <button className="text-button" onClick={() => setTab("roadmap")}>
              View desktop roadmap ↗
            </button>
          </div>
        </aside>
        <main className="workspace">
          <div className="breadcrumb">
            {tab === "backend" ? "SYSTEM" : "MODELS"} <span>/</span>{" "}
            {tab === "backend"
              ? "BACKEND METHODS & FORMATS"
              : tab === "dynamics"
                ? MODEL_REGISTRY[evolutionModel].label.toUpperCase()
                : "TWO-LEVEL SYSTEM"}
          </div>
          <div className="workspace-title">
            <div>
              <p className="eyebrow accent">
                {tab === "backend"
                  ? "ARCHITECTURE / 008–009"
                  : tab === "dynamics"
                    ? `EVOLUTION LABORATORY / ${evolutionModel === "driven_two_level" ? "002" : evolutionModel === "landau_zener" ? "003" : evolutionModel === "stuckelberg" ? "004" : "005"}`
                    : "SMOKE LABORATORY / 001"}
              </p>
              <h1>
                {tab === "backend"
                  ? "Under the hood."
                  : tab === "dynamics"
                    ? "A system in motion."
                    : "A two-level universe."}
              </h1>
              <p>
                {tab === "backend"
                  ? "Two independent numerical engines, one verified result format."
                  : tab === "dynamics"
                    ? MODEL_REGISTRY[evolutionModel].description
                    : "Explore the spectrum of a coupled quantum two-state system."}
              </p>
            </div>
            <span className="pill">2 × 2 HILBERT SPACE</span>
          </div>
          <div className="tabs" role="tablist" aria-label="Workspace">
            <button
              role="tab"
              aria-selected={tab === "spectrum"}
              onClick={() => setTab("spectrum")}
            >
              Spectrum
            </button>
            <button
              role="tab"
              aria-selected={tab === "hamiltonian"}
              onClick={() => setTab("hamiltonian")}
            >
              Hamiltonian
            </button>
            <button
              role="tab"
              aria-selected={tab === "dynamics"}
              onClick={() => setTab("dynamics")}
            >
              Dynamics
            </button>
            <button
              role="tab"
              aria-selected={tab === "roadmap"}
              onClick={() => setTab("roadmap")}
            >
              Roadmap
            </button>
            <button
              role="tab"
              aria-selected={tab === "backend"}
              onClick={() => setTab("backend")}
            >
              Backend
            </button>
          </div>
          <div hidden={tab !== "dynamics"}>
            <DynamicsLab
              bridge={window.quantum}
              status={status}
              modelId={evolutionModel}
            />
          </div>
          {tab === "backend" ? (
            <BackendPanel status={status} />
          ) : tab === "roadmap" ? (
            <section className="panel roadmap">
              <p className="eyebrow">DESKTOP V1 / DELIVERY ROADMAP</p>
              <h2>Build on a verified foundation.</h2>
              <p>
                The full architecture and commit sequence are saved in
                docs/ROADMAP.md.
              </p>
              {[
                ["000–004", "Foundation & first spectrum", "Implemented"],
                [
                  "005",
                  "Evolution, progress, cancellation & binary artifact",
                  "Implemented",
                ],
                ["006", "Model registry & Landau–Zener", "Implemented"],
                [
                  "007",
                  "Dynamics workspace, Bloch sphere & time cursor",
                  "Implemented",
                ],
                ["008", "Native NumPy/SciPy reference engine", "Implemented"],
                [
                  "009",
                  "Engine comparison & numerical diagnostics",
                  "Implemented",
                ],
                ["010", "Landau–Zener & Stückelberg passages", "Implemented"],
                ["011", "Floquet modes, quasienergies & strong-drive map", "Implemented"],
                ["012", "Jaynes–Cummings & quantum Rabi cavity QED", "Next"],
                ["013–014", "Lindblad dynamics & sweeps", "Planned"],
                [
                  "015–017",
                  "Book presets, persistence & release validation",
                  "Planned",
                ],
              ].map(([id, title, state]) => (
                <div className="roadmap-row" key={id}>
                  <code>{id}</code>
                  <span>{title}</span>
                  <small>{state}</small>
                </div>
              ))}
              <p className="scope-note">
                Volume VIII chapters 58–59 are still architecture placeholders;
                book-preset validation remains QLAB-015. Atoms, molecules and
                crystals belong to a later phase.
              </p>
            </section>
          ) : tab === "dynamics" ? null : (
            <>
              <section className="hamiltonian-card">
                <div>
                  <p className="eyebrow">
                    {tab === "hamiltonian"
                      ? "CURRENT PARAMETER DRAFT"
                      : "THE MODEL"}
                  </p>
                  <div className="formula">
                    H ={" "}
                    <span className="fraction">
                      <span>Δ</span>
                      <span>2</span>
                    </span>{" "}
                    σ<sub>z</sub> +{" "}
                    <span className="fraction">
                      <span>Ω</span>
                      <span>2</span>
                    </span>{" "}
                    σ<sub>x</sub>
                  </div>
                </div>
                <div className="model-convention">
                  <span>TIME-INDEPENDENT</span>
                  <p>Hermitian · ħ = 1</p>
                  <small>Ω is a static transverse coupling</small>
                </div>
              </section>
              {tab === "hamiltonian" ? (
                <section className="panel matrix-panel">
                  <p className="eyebrow">
                    MATRIX REPRESENTATION / COMPUTATIONAL BASIS
                  </p>
                  <h2>Every term, explicit.</h2>
                  <div className="matrix">
                    <span>{valid ? format(Number(delta) / 2) : "—"}</span>
                    <span>{valid ? format(Number(omega) / 2) : "—"}</span>
                    <span>{valid ? format(Number(omega) / 2) : "—"}</span>
                    <span>{valid ? format(-Number(delta) / 2) : "—"}</span>
                  </div>
                  <p>
                    Diagonal terms set the detuning. Off-diagonal terms couple
                    |0⟩ and |1⟩.
                  </p>
                  <div className="analytic">E± = ± ½ √(Δ² + Ω²)</div>
                  <p>
                    The spectrum is calculated by QuTiP; this exact formula
                    provides an independent numerical check.
                  </p>
                </section>
              ) : (
                <>
                  <section className="panel spectrum-panel">
                    <div className="panel-heading">
                      <div>
                        <p className="eyebrow">EIGENVALUE PROBLEM</p>
                        <h2>Energy spectrum</h2>
                      </div>
                      <span
                        className={`result-badge ${stale ? "stale" : ""}`}
                        data-testid="result-state"
                      >
                        {busy
                          ? "CALCULATING"
                          : stale
                            ? "OUT OF DATE"
                            : result
                              ? "COMPUTED"
                              : "AWAITING WORKER"}
                      </span>
                    </div>
                    {result ? (
                      <Spectrum result={result} />
                    ) : (
                      <div className="empty-spectrum">
                        <span>±</span>
                        <p>
                          {ready
                            ? "Run the model to reveal its energy levels."
                            : "Connecting to the scientific worker…"}
                        </p>
                      </div>
                    )}
                    <div className="plot-caption">
                      <span>H |ψₙ⟩ = Eₙ |ψₙ⟩</span>
                      <span>
                        {result
                          ? `${result.engine.name === "qutip" ? "QuTiP" : "Native"} · Δ = ${result.model.parameters.delta}, Ω = ${result.model.parameters.omega}`
                          : "Two real eigenvalues · ascending order"}
                      </span>
                    </div>
                  </section>
                  <div className="metrics">
                    <section>
                      <p className="eyebrow">LOWER ENERGY / E₋</p>
                      <strong className="mint" data-testid="energy-low">
                        {result ? format(result.spectrum.eigenvalues[0]) : "—"}
                      </strong>
                      <small>normalized energy</small>
                    </section>
                    <section>
                      <p className="eyebrow">UPPER ENERGY / E₊</p>
                      <strong className="peach" data-testid="energy-high">
                        {result ? format(result.spectrum.eigenvalues[1]) : "—"}
                      </strong>
                      <small>normalized energy</small>
                    </section>
                    <section>
                      <p className="eyebrow">ANALYTIC RESIDUAL</p>
                      <strong>
                        {residual !== null ? residual.toExponential(2) : "—"}
                      </strong>
                      <small>max |E − Eexact|</small>
                    </section>
                  </div>
                  {comparison && (
                    <section
                      className="spectrum-comparison"
                      data-testid="spectrum-comparison"
                    >
                      <div>
                        <p className="eyebrow">QUANTUM SOLVER COMPARISON</p>
                        <h2>Two engines, one Hamiltonian.</h2>
                      </div>
                      <div className="comparison-metrics">
                        <div>
                          <span>MAX ENERGY Δ</span>
                          <strong data-testid="max-energy-difference">
                            {comparison.maxEnergyDifference.toExponential(3)}
                          </strong>
                          <small>|E QuTiP − E Native|</small>
                        </div>
                        <div>
                          <span>QUTIP RUNTIME</span>
                          <strong>
                            {comparison.qutipRuntimeMs.toFixed(3)} ms
                          </strong>
                          <small>diagonalization</small>
                        </div>
                        <div>
                          <span>NATIVE RUNTIME</span>
                          <strong>
                            {comparison.nativeRuntimeMs.toFixed(3)} ms
                          </strong>
                          <small>NumPy eigvalsh</small>
                        </div>
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          {status.state === "ERROR" && (
            <div className="error-message" role="alert">
              {status.detail}
            </div>
          )}
          {status.state === "READY" &&
            !ready &&
            (tab === "spectrum" || tab === "hamiltonian") && (
              <div className="error-message" role="alert">
                The selected engine mode is unavailable. Run npm run
                setup:python, then restart the worker.
              </div>
            )}
        </main>
        <aside className="inspector">
          <p className="eyebrow">MODEL INSPECTOR</p>
          <h2>Parameters</h2>
          <p className="inspector-intro">
            Change the Hamiltonian.
            <br />
            Recalculate to see the spectrum.
          </p>
          <label htmlFor="spectrum-engine">
            <span>Engine</span>
            <small>compute mode</small>
          </label>
          <select
            id="spectrum-engine"
            aria-label="Spectrum engine"
            value={engineMode}
            onChange={(event) =>
              setEngineMode(event.target.value as EngineMode)
            }
            disabled={busy}
          >
            <option value="qutip">QuTiP</option>
            <option value="native">Native · NumPy</option>
            <option value="compare">Compare both engines</option>
          </select>
          {MODEL_REGISTRY.two_level.parameters.map((definition) => (
            <React.Fragment key={definition.key}>
              <label htmlFor={definition.key}>
                <span>
                  {definition.symbol} <strong>{definition.label}</strong>
                </span>
                <small title={definition.description}>normalized</small>
              </label>
              <input
                id={definition.key}
                type="number"
                step={definition.step}
                min={definition.minimum}
                max={definition.maximum}
                value={parameters[definition.key]}
                onChange={(e) =>
                  setParameters((current) => ({
                    ...current,
                    [definition.key]: e.target.value,
                  }))
                }
              />
            </React.Fragment>
          ))}
          {!valid && (
            <p className="validation">
              Enter finite values between −10⁶ and 10⁶.
            </p>
          )}
          <button
            className="text-button reset"
            onClick={() => {
              setParameters(defaultsFor("two_level"));
            }}
          >
            ↺ Restore smoke values
          </button>
          <div className="inspector-section">
            <p className="eyebrow">UNITS & CONVENTIONS</p>
            <div className="key-value">
              <span>Energy</span>
              <strong>Normalized</strong>
            </div>
            <div className="key-value">
              <span>Planck constant</span>
              <strong>ħ = 1</strong>
            </div>
          </div>
          <div className="inspector-section">
            <p className="eyebrow">COMPUTATION ENGINE</p>
            <div className="engine-card">
              <span className={ready ? "live-dot" : "offline-dot"} />
              <div>
                <strong>QuTiP</strong>
                <small>
                  {status.capabilities?.engines.qutip.version
                    ? `Version ${status.capabilities.engines.qutip.version}`
                    : "Waiting for engine"}
                </small>
              </div>
              <span className="engine-mark">Q</span>
            </div>
            <div className="engine-card native-engine-card">
              <span
                className={
                  status.capabilities?.engines.native.available
                    ? "live-dot"
                    : "offline-dot"
                }
              />
              <div>
                <strong>Native · NumPy/SciPy</strong>
                <small>
                  {status.capabilities?.engines.native.version
                    ? `SciPy ${status.capabilities.engines.native.version}`
                    : "Waiting for engine"}
                </small>
              </div>
              <span className="engine-mark">N</span>
            </div>
            <p className="engine-note">
              Hermitian eigenspectrum
              <br />
              Independent validation path
            </p>
          </div>
          <div className="inspector-section provenance">
            <p className="eyebrow">LATEST RUN</p>
            {result ? (
              <>
                <div className="key-value">
                  <span>Runtime</span>
                  <strong>{result.provenance.durationMs.toFixed(2)} ms</strong>
                </div>
                <div className="key-value">
                  <span>Python</span>
                  <strong>{result.provenance.pythonVersion}</strong>
                </div>
                <code title={result.runId}>{result.runId.slice(0, 20)}…</code>
                <small>
                  {new Date(result.provenance.computedAt).toLocaleTimeString()}{" "}
                  · session only
                </small>
              </>
            ) : (
              <p>No completed run yet.</p>
            )}
          </div>
        </aside>
      </div>
      <footer className="statusbar">
        <div>
          <span
            className={status.state === "READY" ? "live-dot" : "offline-dot"}
          />
          <span data-testid="worker-status">Python worker: {status.state}</span>
          <span className="status-separator">|</span>
          <span>
            {status.capabilities
              ? `QuTiP ${status.capabilities.engines.qutip.version ?? "off"} · SciPy ${status.capabilities.engines.native.version ?? "off"}`
              : "Starting environment"}
          </span>
        </div>
        <div>
          <span>LOCAL COMPUTE</span>
          <button
            onClick={() => void restart()}
            disabled={busy || restarting || status.state === "STARTING"}
          >
            {restarting ? "Restarting…" : "Restart worker"}
          </button>
        </div>
      </footer>
    </div>
  );
}
