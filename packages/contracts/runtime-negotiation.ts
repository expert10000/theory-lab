import type { WorkerCapabilities, WorkerStatus } from "./index";

export type RuntimeEngine = keyof WorkerCapabilities["engines"];
export type RuntimeOperation = WorkerCapabilities["operations"][number];
export type RuntimeDecision = { operation: RuntimeOperation; available: boolean;
  selected: RuntimeEngine | null; fallback: RuntimeEngine | null; reason: string };
export type RuntimeNegotiation = { schema: "quantum-runtime-negotiation/v1";
  workerVersion: string | null; protocol: number | null; transport: WorkerStatus["transport"];
  sceneFormats: readonly ["quantum-scene/v1", "quantum-scene/v2"];
  decisions: RuntimeDecision[] };

const engines: Record<RuntimeOperation, readonly RuntimeEngine[]> = {
  diagonalize: ["qutip", "native"], evolve: ["qutip", "native", "dynamiqs"],
  cavity: ["qutip", "native"], lindblad: ["qutip", "native"],
  sweep: ["qutip", "native", "dynamiqs"], many_body: ["native", "quspin"],
  circuit: ["native", "scqubits"], topology: ["native"], orbital: ["native"],
  oscillator: ["native", "qutip"], oscillator_evolve: ["native", "qutip"],
  oscillator_drive: ["native", "qutip"], oscillator_pulse: ["native", "qutip"],
  oscillator_damped: ["native", "qutip"], oscillator_parametric: ["native", "qutip"],
  oscillator_anharmonic: ["native", "qutip"],
};

/** Resolve an explicitly requested engine against the worker actually connected. */
export function negotiateRuntime(status: WorkerStatus, operation: RuntimeOperation,
  preferred: RuntimeEngine): RuntimeDecision {
  if (!Object.prototype.hasOwnProperty.call(engines, operation))
    return { operation, available: false, selected: null, fallback: null, reason: "Unknown worker operation" };
  const capabilities = status.state === "READY" ? status.capabilities : null;
  if (!capabilities) return { operation, available: false, selected: null, fallback: null,
    reason: `Worker ${status.state.toLowerCase()}: ${status.detail}` };
  if (capabilities.protocol !== 1 || capabilities.schema !== "worker-capabilities/v1" ||
      !/^0\.1\.\d+(?:[-+][\w.-]+)?$/.test(capabilities.worker.version))
    return { operation, available: false, selected: null, fallback: null,
      reason: "Worker protocol or version is incompatible with this viewer" };
  if (!capabilities.operations.includes(operation)) return { operation, available: false,
    selected: null, fallback: null, reason: `${operation} is not advertised by this worker` };
  const supported = engines[operation];
  const available = (name: RuntimeEngine) => supported.includes(name) &&
    capabilities.engines[name]?.available === true;
  const fallback = supported.find(name => name !== preferred && available(name)) ?? null;
  if (!supported.includes(preferred)) return { operation, available: false, selected: null,
    fallback, reason: `${preferred} does not implement ${operation}; ${fallback ?? "no"} fallback available` };
  if (!available(preferred)) return { operation, available: false, selected: null,
    fallback, reason: `${preferred} is unavailable on this worker${fallback ? `; ${fallback} is available` : ""}` };
  return { operation, available: true, selected: preferred, fallback: null,
    reason: `${preferred} ${capabilities.engines[preferred]?.version ?? "version unknown"} is ready` };
}

export function runtimeNegotiation(status: WorkerStatus): RuntimeNegotiation {
  const caps = status.capabilities;
  return { schema: "quantum-runtime-negotiation/v1", workerVersion: caps?.worker.version ?? null,
    protocol: caps?.protocol ?? null, transport: status.transport,
    sceneFormats: ["quantum-scene/v1", "quantum-scene/v2"],
    decisions: (Object.keys(engines) as RuntimeOperation[]).map(operation => {
      const preferred = engines[operation].find(name => caps?.engines[name]?.available) ?? engines[operation][0]!;
      return negotiateRuntime(status, operation, preferred);
    }) };
}
