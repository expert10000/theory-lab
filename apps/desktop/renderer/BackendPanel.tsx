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
          <span>QuTiP / Native / optional Dynamiqs GPU / QuSpin / scqubits</span>
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
            Schrödinger evolution at requested sample times. A one-period
            propagator supplies Floquet modes and quasienergies; tensor-product
            operators define the atom–cavity Hamiltonians. <code>MESolver</code>
            and <code>steadystate</code> solve the Lindblad laboratory.
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
            output on the shared time grid. Native cavity dynamics uses a
            Hermitian eigendecomposition and exact spectral phases. The
            Lindblad reference uses a dense Liouvillian and DOP853.
          </p>
          <small>
            Independent engine · norm left uncorrected for diagnostics
          </small>
        </article>
        <article className="panel backend-card">
          <div className="backend-card-title"><p className="eyebrow">ENGINE 03 · OPTIONAL</p><span className={engines?.dynamiqs?.available ? "live-dot" : "offline-dot"}/></div>
          <h2>Dynamiqs / JAX GPU</h2>
          <p className="backend-version">{engines?.dynamiqs?.available ? `${engines.dynamiqs.version} · ${engines.dynamiqs.device}` : "Unavailable on this worker"}</p>
          <p>Linux/WSL2 CUDA two-level Schrödinger evolution uses <code>dq.sesolve()</code> in bounded chunks. Parameter sweeps group up to 32 Hamiltonians in one GPU solve, checkpointing each batch. Capability detection verifies package import and a real JAX GPU device. Cavity and Lindblad adapters are later milestones.</p>
          <small>Optional compute path · cancellation between GPU chunks/batches</small>
        </article>
        <article className="panel backend-card">
          <div className="backend-card-title"><p className="eyebrow">ENGINE 04 · OPTIONAL</p><span className={engines?.quspin?.available ? "live-dot" : "offline-dot"}/></div>
          <h2>QuSpin</h2>
          <p className="backend-version">{engines?.quspin?.available ? `Version ${engines.quspin.version}` : "Unavailable on this worker"}</p>
          <p>A full spin-½ basis constructs the finite Ising-chain Hamiltonian from Pauli <code>zz</code>, <code>x</code>, and <code>z</code> terms. Its low spectrum, site magnetizations, and half-chain entropy are checked against an independent dense NumPy construction.</p>
          <small>Optional finite-chain adapter · no symmetry-sector reduction yet</small>
        </article>
        <article className="panel backend-card">
          <div className="backend-card-title"><p className="eyebrow">ENGINE 05 · OPTIONAL</p><span className={engines?.scqubits?.available ? "live-dot" : "offline-dot"}/></div>
          <h2>scqubits</h2>
          <p className="backend-version">{engines?.scqubits?.available ? `Version ${engines.scqubits.version}` : "Unavailable on this worker"}</p>
          <p>A bounded Transmon charge-basis eigensystem reports E₀₁, anharmonicity, charge matrix element and cutoff drift. Native NumPy builds the same Hamiltonian independently; cutoff convergence remains the user’s responsibility.</p>
          <small>Optional circuit adapter · energies E/h in GHz</small>
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
          <h2>Verified binary results</h2>
          <p>
            <code>quantum-data/v1</code> stores each sample as ten little-endian
            Float64 values (80 bytes per row). The JSON result names the
            artifact, shape, and SHA-256 digest; Electron verifies the digest
            before releasing bytes to React.
          </p>
          <p><code>quantum-cavity-data/v1</code> stores six Float64 values per row (48 bytes): time, excited population, mean photons, Fock-boundary population, norm, parity.</p>
          <p><code>quantum-lindblad-data/v1</code> stores seven Float64 values per row (56 bytes): time, excited population, photons, purity, coherence, Fock-boundary occupation, trace.</p>
          <p><code>quantum-sweep-data/v1</code> stores row-major final P₁ values as little-endian Float64 cells. The JSON result specifies X/Y shape, cache key and reuse counts. Completed rows are atomically checkpointed so an interrupted grid can resume.</p>
          <small>Up to 50,000 two-level or 5,000 cavity samples · SHA-256 verified</small>
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
      <article className="panel backend-card backend-wide">
        <p className="eyebrow">SOURCE EXAMPLES / THEORY DEVELOPMENT BRANCH</p>
        <h2>Mapped references, not a runtime import.</h2>
        <p>Six Presets cards are mapped to an inspected, pinned Volume VIII QuTiP revision: Commit 687 Rabi/Landau–Zener, Commit 691 Jaynes–Cummings, Commit 688 relaxation/dephasing, and Commit 690's bosonic number-decay limit. Analytic checks apply only to exact configurations. The example code is not imported at runtime. The linked tree has no direct Floquet or full quantum-Rabi example yet.</p>
      </article>
      <article className="panel backend-card backend-wide">
        <p className="eyebrow">DURABLE RUNS / WORKSPACE</p>
        <h2>Provenance that survives a restart.</h2>
        <p>Electron main saves each completed job and result with a `quantum-run-manifest/v1` record under application user data, plus a verified copy of any Float64 artifact. A `quantum-workspace/v1` snapshot stores all laboratory controls and the selected tab. The Runs tab rechecks saved hashes before exporting numerical CSV, an SVG figure, or a JSON provenance bundle. The renderer still has no direct file-system access.</p>
      </article>
    </section>
  );
}
