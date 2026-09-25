import React from "react";
import type { WorkerStatus } from "../../../packages/contracts";

const columns = [
  "time",
  "p0",
  "p1",
  "sigma_x",
  "sigma_y",
  "sigma_z",
  "c0_re",
  "c0_im",
  "c1_re",
  "c1_im",
];

export function BackendPanel({ status }: { status: WorkerStatus }) {
  const engines = status.capabilities?.engines;
  return (
    <section className="backend-page" data-testid="backend-page">
      <div className="backend-intro panel">
        <p className="eyebrow">DESKTOP BACKEND / QLAB-009</p>
        <h2>Methods and formats, in the open.</h2>
        <p>
          The renderer never imports scientific Python code. A supervised local
          worker receives validated jobs and returns results through Electron’s
          narrow preload bridge.
        </p>
        <div className="backend-flow" aria-label="Backend data flow">
          <span>React UI</span>
          <b>→</b>
          <span>Preload API</span>
          <b>→</b>
          <span>Electron main</span>
          <b>→</b>
          <span>JSON-RPC worker</span>
          <b>→</b>
          <span>QuTiP / Native</span>
        </div>
      </div>
      <div className="backend-card-grid">
        <article className="panel backend-card">
          <div className="backend-card-title">
            <p className="eyebrow">ENGINE 01</p>
            <span
              className={engines?.qutip.available ? "live-dot" : "offline-dot"}
            />
          </div>
          <h2>QuTiP</h2>
          <p className="backend-version">
            {engines?.qutip.version
              ? `Version ${engines.qutip.version}`
              : "Unavailable"}
          </p>
          <p>
            <code>Qobj.eigenenergies()</code> diagonalizes the static two-level
            Hamiltonian. <code>SESolver.step()</code> advances time-dependent
            Schrödinger evolution at requested sample times.
          </p>
          <small>Reference engine · per-step output normalized</small>
        </article>
        <article className="panel backend-card">
          <div className="backend-card-title">
            <p className="eyebrow">ENGINE 02</p>
            <span
              className={engines?.native.available ? "live-dot" : "offline-dot"}
            />
          </div>
          <h2>Native NumPy / SciPy</h2>
          <p className="backend-version">
            {engines?.native.version
              ? `SciPy ${engines.native.version}`
              : "Unavailable"}
          </p>
          <p>
            <code>numpy.linalg.eigvalsh()</code> solves the same Hermitian
            matrix. SciPy <code>DOP853</code> integrates i∂ₜψ = H(t)ψ with dense
            output on the shared time grid.
          </p>
          <small>
            Independent engine · norm left uncorrected for diagnostics
          </small>
        </article>
      </div>
      <div className="backend-card-grid">
        <article className="panel backend-card">
          <p className="eyebrow">CONTROL PLANE</p>
          <h2>Versioned JSON</h2>
          <p>
            <code>quantum-job/v1</code>, <code>quantum-result/v1</code>, and{" "}
            <code>worker-capabilities/v1</code> are checked on both sides of the
            Python boundary. Worker commands use newline-delimited JSON-RPC 2.0
            over stdio; there is no network server.
          </p>
          <small>hello · capabilities · health · run · cancel · shutdown</small>
        </article>
        <article className="panel backend-card">
          <p className="eyebrow">DATA PLANE</p>
          <h2>Binary evolution samples</h2>
          <p>
            <code>quantum-data/v1</code> stores each sample as ten little-endian
            Float64 values (80 bytes per row). The JSON result names the
            artifact, shape, and SHA-256 digest; Electron verifies the digest
            before releasing bytes to React.
          </p>
          <small>Up to 50,000 samples · no JSON float arrays</small>
        </article>
      </div>
      <article className="panel backend-card backend-wide">
        <p className="eyebrow">QUANTUM-DATA/V1 / ROW LAYOUT</p>
        <h2>One row, every synchronized view.</h2>
        <div className="backend-columns">
          {columns.map((column, index) => (
            <div key={column}>
              <span>{String(index).padStart(2, "0")}</span>
              <code>{column}</code>
            </div>
          ))}
        </div>
        <p>
          The time cursor selects one exact row. Populations and Pauli
          expectations come directly from it; complex amplitudes reconstruct the
          state and ρ = |ψ⟩⟨ψ|. Compare mode reports maximum energy/observable
          differences, norm drift, phase-independent state fidelity, and both
          engine runtimes.
        </p>
      </article>
    </section>
  );
}
