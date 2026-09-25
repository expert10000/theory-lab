import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  EvolutionResult,
  EvolutionProgress,
  QuantumBridge,
  WorkerStatus,
} from "../../../packages/contracts";
import {
  MODEL_REGISTRY,
  defaultsFor,
  parametersFor,
  evolutionJob,
  type EvolutionModelId,
} from "../../../packages/models";
import {
  sampleAt,
  type ComplexValue,
} from "../../../packages/quantum-3d/evolution";
import { BlochSphere } from "../../../packages/quantum-3d/BlochSphere";

const series = [
  { name: "P₀", column: 1, color: "#79d9c1" },
  { name: "P₁", column: 2, color: "#f2b36f" },
  { name: "⟨σx⟩", column: 3, color: "#a7b9e8" },
  { name: "⟨σy⟩", column: 4, color: "#dd9cc5" },
  { name: "⟨σz⟩", column: 5, color: "#e2e7ef" },
];
function DynamicsChart({
  data,
  rows,
  selectedIndex,
  onSelect,
}: {
  data: Float64Array;
  rows: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const path = (column: number) => {
    const step = Math.max(1, Math.ceil(rows / 800));
    const indices = Array.from(
      { length: Math.ceil(rows / step) },
      (_, i) => i * step,
    );
    if (indices[indices.length - 1] !== rows - 1) indices.push(rows - 1);
    return indices
      .map(
        (i, n) =>
          `${n ? "L" : "M"}${50 + (i / (rows - 1)) * 700},${185 - data[i * 10 + column] * 125}`,
      )
      .join(" ");
  };
  return (
    <svg
      className="dynamics-chart"
      viewBox="0 0 800 390"
      role="img"
      aria-label="QuTiP population and Pauli expectation time series"
      onClick={(event) => {
        const matrix = event.currentTarget.getScreenCTM();
        if (!matrix) return;
        const point = event.currentTarget.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const x = point.matrixTransform(matrix.inverse()).x;
        onSelect(
          Math.max(
            0,
            Math.min(rows - 1, Math.round(((x - 50) / 700) * (rows - 1))),
          ),
        );
      }}
    >
      <rect x="50" y="60" width="700" height="250" fill="#111a24" />
      {[60, 122.5, 185, 247.5, 310].map((y, index) => (
        <g key={y}>
          <line
            x1="50"
            x2="750"
            y1={y}
            y2={y}
            stroke="#2e3b47"
            strokeDasharray={index === 2 ? "4 5" : undefined}
          />
          <text x="15" y={y + 4} fill="#8798a8" fontSize="10">
            {(1 - index * 0.5).toFixed(1)}
          </text>
        </g>
      ))}
      {series.map((item) => (
        <path
          key={item.column}
          d={path(item.column)}
          stroke={item.color}
          strokeWidth="1.7"
          fill="none"
        />
      ))}
      <line
        x1={50 + (selectedIndex / (rows - 1)) * 700}
        x2={50 + (selectedIndex / (rows - 1)) * 700}
        y1="60"
        y2="310"
        stroke="#ffe2ad"
        strokeWidth="1.5"
        data-testid="chart-time-cursor"
      />
      {series.map((item) => (
        <circle
          key={`selected-${item.column}`}
          cx={50 + (selectedIndex / (rows - 1)) * 700}
          cy={185 - data[selectedIndex * 10 + item.column] * 125}
          r="4"
          fill={item.color}
          stroke="#10151d"
          strokeWidth="1.5"
        />
      ))}
      <text x="50" y="337" fill="#8798a8" fontSize="11">
        t = {data[0].toFixed(2)}
      </text>
      <text x="665" y="337" fill="#8798a8" fontSize="11">
        t = {data[(rows - 1) * 10].toFixed(2)}
      </text>
      {series.map((item, index) => (
        <g key={item.column}>
          <circle cx={78 + index * 140} cy="369" r="4" fill={item.color} />
          <text x={89 + index * 140} y="373" fill="#b6c3ce" fontSize="11">
            {item.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
function signed(value: number) {
  return `${value < 0 ? "−" : "+"} ${Math.abs(value).toFixed(4)}`;
}
function complex(value: ComplexValue) {
  return `${value.re.toFixed(4)} ${signed(value.im)}i`;
}
export function DynamicsLab({
  bridge,
  status,
  modelId,
}: {
  bridge: QuantumBridge;
  status: WorkerStatus;
  modelId: EvolutionModelId;
}) {
  const definition = MODEL_REGISTRY[modelId];
  const [parameters, setParameters] = useState(() => defaultsFor(modelId));
  const [startTime, setStartTime] = useState(
    String(definition.solverDefaults!.tStart),
  );
  const [duration, setDuration] = useState(
    String(definition.solverDefaults!.tStop),
  );
  const [samples, setSamples] = useState("401");
  const [basis, setBasis] = useState<0 | 1>(0);
  const [progress, setProgress] = useState<EvolutionProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [outcome, setOutcome] = useState("READY TO EVOLVE");
  const [error, setError] = useState("");
  const [result, setResult] = useState<EvolutionResult | null>(null);
  const [data, setData] = useState<Float64Array | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeJob = useRef<string | null>(null);
  useEffect(() => {
    if (activeJob.current) void bridge.cancel(activeJob.current);
    setParameters(defaultsFor(modelId));
    setStartTime(String(MODEL_REGISTRY[modelId].solverDefaults!.tStart));
    setDuration(String(MODEL_REGISTRY[modelId].solverDefaults!.tStop));
    setSamples(String(MODEL_REGISTRY[modelId].solverDefaults!.samples));
    setBasis(MODEL_REGISTRY[modelId].defaultState.index);
    setResult(null);
    setData(null);
    setSelectedIndex(0);
    setOutcome("READY TO EVOLVE");
  }, [modelId]);
  useEffect(
    () =>
      bridge.onProgress((update) => {
        if (update.jobId === activeJob.current) setProgress(update);
      }),
    [bridge],
  );
  const modelValues = parametersFor(modelId, parameters);
  const begin = Number(startTime);
  const end = Number(duration);
  const count = Number(samples);
  const valid =
    modelValues !== null &&
    startTime.trim() !== "" &&
    duration.trim() !== "" &&
    samples.trim() !== "" &&
    Number.isFinite(begin) &&
    Number.isFinite(end) &&
    begin >= -1000 &&
    end <= 1000 &&
    end > begin &&
    Number.isInteger(count) &&
    count >= 2 &&
    count <= 50000;
  const ready =
    status.state === "READY" &&
    !!status.capabilities?.operations.includes("evolve");
  const stale =
    result &&
    (result.model.type !== modelId ||
      Object.entries(result.model.parameters).some(
        ([key, value]) => modelValues?.[key] !== value,
      ) ||
      begin !== result.solver.tStart ||
      end !== result.solver.tStop ||
      count !== result.solver.samples ||
      basis !== result.initialState.index);
  const selected = useMemo(
    () => (result && data ? sampleAt(data, selectedIndex) : null),
    [result, data, selectedIndex],
  );
  async function run() {
    if (!valid || !ready || running) return;
    const jobId = `job-${crypto.randomUUID()}`;
    activeJob.current = jobId;
    setRunning(true);
    setCancelling(false);
    setProgress(null);
    setError("");
    setOutcome("RUNNING");
    setResult(null);
    setData(null);
    setSelectedIndex(0);
    try {
      const completed = await bridge.evolve(
        evolutionJob(modelId, jobId, parameters, basis, begin, end, count),
      );
      const bytes = await bridge.readData(jobId);
      if (bytes.byteLength !== completed.data.bytes)
        throw new Error("Binary artifact size mismatch");
      const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
      );
      const numbers = new Float64Array(bytes.byteLength / 8);
      for (let i = 0; i < numbers.length; i++)
        numbers[i] = view.getFloat64(i * 8, true);
      if (numbers.length !== completed.data.rows * 10)
        throw new Error("Evolution artifact shape mismatch");
      setResult(completed);
      setData(numbers);
      setOutcome("COMPLETE");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Evolution cancelled")) setOutcome("CANCELLED");
      else {
        setOutcome("FAILED");
        setError(message);
      }
    } finally {
      activeJob.current = null;
      setRunning(false);
      setCancelling(false);
    }
  }
  async function cancel() {
    if (!activeJob.current || cancelling) return;
    try {
      if (await bridge.cancel(activeJob.current)) {
        setCancelling(true);
        setOutcome("CANCELLING");
      }
    } catch (err) {
      setError(String(err));
    }
  }
  return (
    <div className="dynamics-lab">
      <section className="hamiltonian-card">
        <div>
          <p className="eyebrow">{definition.label.toUpperCase()} MODEL</p>
          <div className="formula">{definition.hamiltonian}</div>
        </div>
        <div className="model-convention">
          <span>TIME-DEPENDENT</span>
          <p>Schrödinger evolution · ħ = 1</p>
        </div>
      </section>
      <section className="panel dynamics-settings">
        <div>
          <p className="eyebrow">EVOLUTION JOB</p>
          <h2>{definition.label}</h2>
          <p>
            {definition.description}. QuTiP integrates the wavefunction and
            records five observables and the complex state at every sample.
          </p>
        </div>
        <div className="dynamics-fields">
          {definition.parameters.map((parameter) => (
            <label key={parameter.key}>
              {parameter.label} {parameter.symbol}
              <input
                aria-label={`${parameter.label} ${parameter.symbol}`}
                type="number"
                value={parameters[parameter.key] ?? ""}
                min={parameter.minimum}
                max={parameter.maximum}
                step={parameter.step}
                title={parameter.description}
                onChange={(event) =>
                  setParameters((current) => ({
                    ...current,
                    [parameter.key]: event.target.value,
                  }))
                }
                disabled={running}
              />
            </label>
          ))}
          <label>
            Start time
            <input
              aria-label="Start time"
              type="number"
              min="-1000"
              max="1000"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={running}
            />
          </label>
          <label>
            End time T
            <input
              aria-label="End time T"
              type="number"
              min="-1000"
              max="1000"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={running}
            />
          </label>
          <label>
            Samples
            <input
              aria-label="Samples"
              type="number"
              min="2"
              max="50000"
              value={samples}
              onChange={(e) => setSamples(e.target.value)}
              disabled={running}
            />
          </label>
          <label>
            Initial state
            <select
              aria-label="Initial state"
              value={basis}
              onChange={(e) => setBasis(Number(e.target.value) as 0 | 1)}
              disabled={running}
            >
              <option value={0}>|0⟩</option>
              <option value={1}>|1⟩</option>
            </select>
          </label>
        </div>
        <div className="dynamics-actions">
          <button
            className="run-button"
            onClick={() => void run()}
            disabled={!valid || !ready || running}
            data-testid="run-evolution"
          >
            ▶ Run evolution
          </button>
          {running && (
            <button
              className="cancel-button"
              onClick={() => void cancel()}
              disabled={cancelling}
            >
              Cancel job
            </button>
          )}
          <span data-testid="evolution-state">{outcome}</span>
        </div>
        {!valid && (
          <p className="validation">
            Check the parameters: 2–50,000 samples, −1000 ≤ start &lt; end ≤
            1000, finite drive values.
          </p>
        )}
        {running && (
          <div className="progress-wrap">
            <progress max="1" value={progress?.fraction ?? 0} />
            <span data-testid="evolution-progress">
              {progress
                ? `${progress.completed} / ${progress.total}`
                : "Starting…"}
            </span>
          </div>
        )}
      </section>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      {result && data && (
        <section className="panel dynamics-result">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">BINARY RESULT / QUANTUM-DATA V1</p>
              <h2>Dynamics workspace</h2>
            </div>
            <span
              className={`result-badge ${stale ? "stale" : ""}`}
              data-testid="dynamics-result-state"
            >
              {stale ? "OUT OF DATE" : `${result.data.rows} SAMPLES`}
            </span>
          </div>
          <div className="dynamics-visual-grid">
            <div className="dynamics-plot">
              <div className="dynamics-visual-heading">
                <span>POPULATIONS & PAULI EXPECTATIONS</span>
                <small>SELECT A TIME ON THE PLOT</small>
              </div>
              <DynamicsChart
                data={data}
                rows={result.data.rows}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
              />
            </div>
            {selected && <BlochSphere data={data} sample={selected} />}
          </div>
          {selected && (
            <div className="dynamics-timeline">
              <div className="timeline-heading">
                <div>
                  <span className="eyebrow">SYNCHRONIZED TIME CURSOR</span>
                  <strong data-testid="selected-time">
                    t = {selected.time.toFixed(4)}
                  </strong>
                </div>
                <span>
                  sample {selected.index + 1} / {result.data.rows}
                </span>
              </div>
              <input
                aria-label="Time cursor"
                type="range"
                min="0"
                max={result.data.rows - 1}
                step="1"
                value={selectedIndex}
                onChange={(event) =>
                  setSelectedIndex(Number(event.target.value))
                }
              />
              <div className="timeline-extents">
                <span>{data[0].toFixed(2)}</span>
                <span>{data[(result.data.rows - 1) * 10].toFixed(2)}</span>
              </div>
            </div>
          )}
          {selected && (
            <div className="dynamics-readout">
              <div className="readout-card observable-readout">
                <p className="eyebrow">OBSERVABLES AT SELECTED TIME</p>
                <div className="readout-grid">
                  <div>
                    <span>P₀</span>
                    <strong data-testid="population-0">
                      {selected.populations[0].toFixed(4)}
                    </strong>
                  </div>
                  <div>
                    <span>P₁</span>
                    <strong data-testid="population-1">
                      {selected.populations[1].toFixed(4)}
                    </strong>
                  </div>
                  <div>
                    <span>⟨σx⟩</span>
                    <strong data-testid="bloch-x">
                      {selected.bloch[0].toFixed(4)}
                    </strong>
                  </div>
                  <div>
                    <span>⟨σy⟩</span>
                    <strong data-testid="bloch-y">
                      {selected.bloch[1].toFixed(4)}
                    </strong>
                  </div>
                  <div>
                    <span>⟨σz⟩</span>
                    <strong data-testid="bloch-z">
                      {selected.bloch[2].toFixed(4)}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="readout-card state-readout">
                <p className="eyebrow">STATE VECTOR / COMPUTATIONAL BASIS</p>
                <div className="state-line">
                  <span>c₀ |0⟩</span>
                  <code data-testid="amplitude-0">
                    {complex(selected.amplitudes[0])}
                  </code>
                </div>
                <div className="state-line">
                  <span>c₁ |1⟩</span>
                  <code data-testid="amplitude-1">
                    {complex(selected.amplitudes[1])}
                  </code>
                </div>
              </div>
              <div className="readout-card density-readout">
                <p className="eyebrow">DENSITY MATRIX / ρ = |ψ⟩⟨ψ|</p>
                <div className="density-grid">
                  <code data-testid="rho-00">
                    {complex(selected.density[0][0])}
                  </code>
                  <code data-testid="rho-01">
                    {complex(selected.density[0][1])}
                  </code>
                  <code data-testid="rho-10">
                    {complex(selected.density[1][0])}
                  </code>
                  <code data-testid="rho-11">
                    {complex(selected.density[1][1])}
                  </code>
                </div>
                <div className="density-checks">
                  <span>Tr ρ = {selected.trace.toFixed(6)}</span>
                  <span>Tr ρ² = {selected.purity.toFixed(6)}</span>
                </div>
              </div>
            </div>
          )}
          <div className="plot-caption">
            <span>
              QuTiP {result.engine.version} ·{" "}
              {result.provenance.durationMs.toFixed(1)} ms
            </span>
            <span>
              {result.model.type} ·{" "}
              {Object.entries(result.model.parameters)
                .map(([key, value]) => `${key}=${value}`)
                .join(" · ")}{" "}
              · SHA-256 verified
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
