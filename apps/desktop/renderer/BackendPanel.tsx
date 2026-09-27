import React, { useEffect, useState } from "react";
import type { WorkerResources, WorkerStatus } from "../../../packages/contracts";

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
  const [resources, setResources] = useState<WorkerResources | null>(null);
  const [resourceError, setResourceError] = useState("");
  useEffect(() => {
    if (status.state !== "READY") { setResources(null); return; }
    let active = true;
    const refresh = () => void window.quantum.getResources().then(value => {
      if (active) { setResources(value); setResourceError(""); }
    }).catch(() => { if (active) setResourceError("Resource snapshot unavailable"); });
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [status.state, status.connection?.target]);
  const gib = resources?.memory.totalBytes == null ? "Unavailable" : `${(resources.memory.totalBytes / 2 ** 30).toFixed(1)} GiB`;
  return (
    <section className="backend-page" data-testid="backend-page">
      <div className="backend-intro panel">
        <p className="eyebrow">DESKTOP BACKEND / QLAB-009</p>
        <h2>Methods and formats, in the open.</h2>
        <p>
          The renderer never imports scientific Python code. A supervised {status.transport === "ssh" ? "SSH remote" : "local"}{" "}
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
            over stdio. Local mode has no network server; opt-in SSH mode carries
            that stream over an authenticated, host-key-verified connection.
          </p>
          <small>hello · capabilities · health · run · cancel · shutdown</small>
        </article>
        <article className="panel backend-card" data-testid="worker-resources">
          <p className="eyebrow">LIVE WORKER RESOURCES</p>
          <h2>{status.state === "READY" ? "Ready" : status.state.toLowerCase()}</h2>
          <dl className="backend-facts">
            <div><dt>Platform</dt><dd>{resources ? `${resources.platform.system} / ${resources.platform.machine}` : "—"}</dd></div>
            <div><dt>Logical CPU cores</dt><dd>{resources?.cpu.logicalCores ?? "—"}</dd></div>
            <div><dt>Physical memory</dt><dd>{gib}</dd></div>
            <div><dt>Active job</dt><dd>{resources?.job.activeId ?? "None"}</dd></div>
            <div><dt>GPU adapter</dt><dd>{engines?.dynamiqs?.available ? engines.dynamiqs.device : "Unavailable"}</dd></div>
          </dl>
          <small>{resourceError || "Reported by the Python worker, not the renderer machine · refreshes every 5 s"}</small>
        </article>
        <article className="panel backend-card">
          <p className="eyebrow">WORKER TRANSPORT / QLAB-024</p>
          <h2>{status.transport === "ssh" ? "Remote SSH" : "Local stdio"}</h2>
          <p>{status.detail}</p>
          <dl className="backend-facts" data-testid="ssh-connection">
            <div><dt>Default</dt><dd>Local Python over stdio</dd></div>
            <div><dt>Selected SSH target</dt><dd>{status.connection?.target ?? "None configured"}</dd></div>
            <div><dt>Remote checkout</dt><dd>{status.connection?.root ?? "QLAB_REMOTE_ROOT required for SSH"}</dd></div>
            <div><dt>Python</dt><dd>{status.connection?.python ?? "Local .venv"}</dd></div>
            <div><dt>Remote artifacts</dt><dd>{status.connection?.artifacts ?? "Not applicable"}</dd></div>
            <div><dt>Authentication</dt><dd>SSH key · BatchMode · strict host-key check</dd></div>
          </dl>
          <small>Set QLAB_REMOTE_SSH_TARGET and QLAB_REMOTE_ROOT before starting the app. SSH artifacts use SCP/SFTP and SHA-256 verification. No private keys or tokens are exposed here.</small>
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
        <p className="eyebrow">HAMILTONIAN ATLAS / NUMERICAL TOPOLOGY</p>
        <h2>Pinned definitions, explicit computations.</h2>
        <p>The Atlas tab snapshots 48 source entries from Theory revision 61791aff and labels the source registry as reference-only. Nine explicit bindings map supported subspaces and units into the laboratory. The Topology tab solves an open SSH chain and a periodic QWZ model with NumPy; its SSH winding and Chern number are undefined at their bulk gap closures. A mass-sign phase check catches under-resolved FHS meshes, while the QWZ midpoint Berry-curvature integral provides a separate convergence diagnostic. Topology results use bounded inline JSON under quantum-result/v1 and are saved with job and source provenance.</p>
      </article>
      <article className="panel backend-card backend-wide">
        <p className="eyebrow">DURABLE RUNS / WORKSPACE</p>
        <h2>Provenance that survives a restart.</h2>
        <p>Electron main saves each completed job and result with a `quantum-run-manifest/v1` record under application user data, plus a verified copy of any Float64 artifact. A `quantum-workspace/v1` snapshot stores all laboratory controls and the selected tab. The Runs tab rechecks saved hashes before exporting numerical CSV, an SVG figure, or a JSON provenance bundle. The renderer still has no direct file-system access.</p>
      </article>
    </section>
  );
}
