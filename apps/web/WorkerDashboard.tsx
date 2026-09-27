import React, { useEffect, useState } from "react";
import type { WorkerResources, WorkerStatus } from "../../packages/contracts";

interface Activity {
  schema: "gateway-activity/v1";
  totalCalls: number;
  recent: { at: string; method: string; route: string; status: number; durationMs: number }[];
}
const rpcMethods = [
  ["hello", "Protocol handshake and worker version"],
  ["capabilities", "Available engines and operations"],
  ["health", "Supervised liveness check"],
  ["resources", "Platform, CPU, memory and active job"],
  ["quantum.run", "Inline spectrum or bounded circuit result"],
  ["quantum.start", "Start an artifact-producing job"],
  ["quantum.cancel", "Request active-job cancellation"],
  ["shutdown", "Graceful worker termination"],
];
const routes = [
  ["GET", "/api/status", "Worker state and capabilities"],
  ["GET", "/api/resources", "Live worker resource snapshot"],
  ["GET", "/api/activity", "Recent sanitized gateway calls"],
  ["GET", "/api/runs", "Saved run summaries"],
  ["POST", "/api/jobs", "Run a v1 spectrum, evolution or circuit job"],
  ["POST", "/api/jobs/:jobId/cancel", "Cancel an active evolution"],
  ["GET", "/api/artifacts/:jobId", "Verified Float64 artifact"],
];
const engineLabels: Record<string, string> = { qutip: "QuTiP", native: "Native NumPy / SciPy",
  dynamiqs: "Dynamiqs", quspin: "QuSpin", scqubits: "scqubits" };

export function WorkerDashboard({ token, onStatus }: { token: string; onStatus: (status: WorkerStatus) => void }) {
  const [status, setStatus] = useState<WorkerStatus | null>(null);
  const [resources, setResources] = useState<WorkerResources | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState("");
  async function load() {
    const read = async (path: string) => {
      const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      return response.json();
    };
    try {
      const nextStatus = await read("/api/status");
      setStatus(nextStatus); onStatus(nextStatus);
      const [resourceResult, activityResult] = await Promise.allSettled([read("/api/resources"), read("/api/activity")]);
      if (resourceResult.status === "fulfilled" && resourceResult.value.schema === "worker-resources/v1")
        setResources(resourceResult.value);
      else setResources(null);
      if (activityResult.status === "fulfilled" && activityResult.value.schema === "gateway-activity/v1")
        setActivity(activityResult.value);
      setUpdated(new Date().toLocaleTimeString());
      setError(resourceResult.status === "rejected" && nextStatus.state === "READY" ? "Worker resource snapshot unavailable" : "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Diagnostics unavailable"); }
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [token]);
  const engines = status?.capabilities?.engines;
  const memory = resources?.memory.totalBytes == null ? "Unavailable" : `${(resources.memory.totalBytes / 2 ** 30).toFixed(1)} GiB`;
  return <div className="worker-dashboard" data-testid="worker-dashboard">
    <div className="dashboard-head"><div><div className="eyebrow">SUPERVISED PYTHON SERVICE</div><h1>Worker observatory</h1><p>Live state, resource inventory, protocol methods and authenticated gateway calls.</p></div><button className="outline" onClick={() => void load()}>Refresh snapshot</button></div>
    {error && <div className="error" role="alert">{error}</div>}
    <div className="metric-grid">
      <div className="card metric"><span>STATE</span><strong className={status?.state === "READY" ? "good" : ""}>{status?.state ?? "…"}</strong><small>{status?.detail ?? "Checking worker"}</small></div>
      <div className="card metric"><span>TRANSPORT</span><strong>{status?.transport === "ssh" ? "SSH" : "Local"}</strong><small>{status?.connection?.target ?? "stdio child process"}</small></div>
      <div className="card metric"><span>LOGICAL CPU</span><strong>{resources?.cpu.logicalCores ?? "—"}</strong><small>{resources ? `${resources.platform.system} / ${resources.platform.machine}` : "Worker-reported"}</small></div>
      <div className="card metric"><span>PHYSICAL RAM</span><strong>{memory}</strong><small>Host total · not available memory</small></div>
    </div>
    <div className="dashboard-grid"><section className="card"><div className="eyebrow">WORKER / LIVE</div><h2>Resources & connection</h2>
      <dl className="dash-facts"><div><dt>Active job</dt><dd>{resources?.job.activeId ?? "None"}</dd></div><div><dt>Python</dt><dd>{status?.capabilities?.python.version ?? "—"}</dd></div><div><dt>Worker version</dt><dd>{status?.capabilities?.worker.version ?? "—"}</dd></div><div><dt>SSH target</dt><dd>{status?.connection?.target ?? "Not configured; local is default"}</dd></div><div><dt>Remote checkout</dt><dd>{status?.connection?.root ?? "Not applicable"}</dd></div><div><dt>GPU device</dt><dd>{engines?.dynamiqs?.available ? engines.dynamiqs.device : "Unavailable"}</dd></div></dl>
      <p className="small-note"><code>worker-resources/v1</code> · No private key, access token or job payload is returned by this view. Snapshot: {updated || "pending"}.</p>
    </section><section className="card"><div className="eyebrow">CAPABILITIES / V1</div><h2>Installed engines</h2>
      <div className="engine-list">{engines ? Object.entries(engines).map(([name, entry]) => <div key={name}><span className={entry?.available ? "engine-led on" : "engine-led"}/><strong>{engineLabels[name] ?? name}</strong><span>{entry?.available ? (entry.version ?? "available") : "unavailable"}</span></div>) : <p>Waiting for worker capabilities.</p>}</div>
      <p className="small-note">Operations advertised by the worker: {status?.capabilities?.operations.join(", ") || "none"}.</p>
    </section></div>
    <div className="dashboard-grid"><section className="card"><div className="eyebrow">JSON-RPC / STDIO OR SSH</div><h2>Worker methods</h2><div className="api-table">{rpcMethods.map(([name, purpose]) => <div key={name}><code>{name}</code><span>{purpose}</span></div>)}</div><p className="small-note">Control messages are newline-delimited JSON-RPC 2.0. The worker does not listen on an HTTP port.</p></section>
      <section className="card"><div className="eyebrow">HTTP(S) / BEARER AUTH</div><h2>Gateway API</h2><div className="api-table">{routes.map(([method, path, purpose]) => <div key={path}><code>{method} {path}</code><span>{purpose}</span></div>)}</div><p className="small-note">Send <code>Authorization: Bearer &lt;token&gt;</code>. Jobs use <code>quantum-job/v1</code>; results use <code>quantum-result/v1</code>. Binary data is <code>f64le</code> with a SHA-256 digest.</p></section></div>
    <section className="card"><div className="eyebrow">GATEWAY / RECENT CALLS</div><h2>Activity <small>{activity?.totalCalls ?? 0} authenticated calls</small></h2><div className="api-table">{activity?.recent.length ? activity.recent.map((call, index) => <div key={`${call.at}-${index}`}><code>{call.method} {call.route}</code><span>{call.status} · {call.durationMs} ms · {new Date(call.at).toLocaleTimeString()}</span></div>) : <p>No job or artifact calls yet.</p>}</div><p className="small-note">Only method, route pattern, status, timing and timestamp are retained in memory (last 20). Tokens and request bodies are never logged here.</p></section>
  </div>;
}
