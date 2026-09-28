import React, { useCallback, useEffect, useRef, useState } from "react";
import type {
  EngineName,
  QuantumBridge,
  SpectrumResult,
  WorkerStatus,
  WorkspaceSnapshot,
  WorkspaceTab,
} from "../../../packages/contracts";
import { Spectrum, format } from "./Spectrum";
import { DynamicsLab } from "./DynamicsLab";
import { CavityLab } from "./CavityLab";
import { OpenSystemLab } from "./OpenSystemLab";
import { SweepLab } from "./SweepLab";
import { ManyBodyLab } from "./ManyBodyLab";
import { CircuitLab } from "./CircuitLab";
import { PresetPanel } from "./PresetPanel";
import { PRESETS, type LaboratoryPreset } from "../../../packages/models/presets";
import { RunHistory } from "./RunHistory";
import { SceneLab } from "./SceneLab";
import { CAVITY_REGISTRY, type CavityModelId } from "../../../packages/models/cavity";
import { BackendPanel } from "./BackendPanel";
import { AtlasPanel } from "./AtlasPanel";
import { TopologyLab } from "./TopologyLab";
import { TOPOLOGY_DEFAULTS } from "../../../packages/models/topology";
import { OrbitalLab } from "./OrbitalLab";
import { PostRoadmapPanel } from "./PostRoadmapPanel";
import { DELIVERED_QVIS } from "../../../packages/models/roadmap";
import { ORBITAL_DEFAULTS } from "../../../packages/models/orbital";
import { ATLAS_REVISION, ATLAS_SOURCE, atlasEntry } from "../../../packages/atlas";
import { atlasBinding } from "../../../packages/atlas/bindings";
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
  const [cavityModel, setCavityModel] = useState<CavityModelId>("jaynes_cummings");
  const [selectedPreset, setSelectedPreset] = useState<LaboratoryPreset | null>(null);
  const workspaceParts = useRef<Partial<Pick<WorkspaceSnapshot, "dynamics" | "cavity" | "open" | "sweep" | "manyBody" | "circuit" | "topology" | "orbital">>>({});
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [restored, setRestored] = useState<{ epoch: number; snapshot: WorkspaceSnapshot } | null>(null);
  const [atlasManyBody, setAtlasManyBody] = useState<{ epoch: number; draft: NonNullable<WorkspaceSnapshot["manyBody"]> } | null>(null);
  const [atlasTopology, setAtlasTopology] = useState<{ epoch: number; draft: NonNullable<WorkspaceSnapshot["topology"]> } | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const collectDynamics = useCallback((value: WorkspaceSnapshot["dynamics"]) => { workspaceParts.current.dynamics = value; checkParts(); }, []);
  const collectCavity = useCallback((value: WorkspaceSnapshot["cavity"]) => { workspaceParts.current.cavity = value; checkParts(); }, []);
  const collectOpen = useCallback((value: WorkspaceSnapshot["open"]) => { workspaceParts.current.open = value; checkParts(); }, []);
  const collectSweep = useCallback((value: WorkspaceSnapshot["sweep"]) => { workspaceParts.current.sweep = value; checkParts(); }, []);
  const collectManyBody = useCallback((value: NonNullable<WorkspaceSnapshot["manyBody"]>) => { workspaceParts.current.manyBody = value; checkParts(); }, []);
  const collectCircuit = useCallback((value: NonNullable<WorkspaceSnapshot["circuit"]>) => { workspaceParts.current.circuit = value; checkParts(); }, []);
  const collectTopology = useCallback((value: NonNullable<WorkspaceSnapshot["topology"]>) => { workspaceParts.current.topology = value; }, []);
  const collectOrbital = useCallback((value: NonNullable<WorkspaceSnapshot["orbital"]>) => { workspaceParts.current.orbital = value; }, []);
  function checkParts() { if (workspaceParts.current.dynamics && workspaceParts.current.cavity && workspaceParts.current.open && workspaceParts.current.sweep && workspaceParts.current.manyBody && workspaceParts.current.circuit) setWorkspaceReady(true); }
  const [result, setResult] = useState<SpectrumResult | null>(null);
  const [engineMode, setEngineMode] = useState<EngineMode>("qutip");
  const [resultMode, setResultMode] = useState<EngineMode | null>(null);
  const [comparison, setComparison] = useState<SpectrumComparison | null>(null);
  const [busy, setBusy] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<WorkspaceTab>("spectrum");
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
  function openPreset(preset: LaboratoryPreset) {
    setSelectedPreset(preset);
    if (preset.kind === "evolution") { setEvolutionModel(preset.modelId); setTab("dynamics"); }
    else if (preset.kind === "cavity") { setCavityModel(preset.modelId); setTab("cavity"); }
    else setTab("open");
  }
  function openAtlasBinding(id: string) {
    const binding = atlasBinding(id);
    const entry = atlasEntry(id);
    if (!binding || !entry) return;
    const source = { sourceRepository: `${ATLAS_SOURCE}/tree/${ATLAS_REVISION}`,
      sourceModule: `data/hamiltonian_atlas/${entry.sourceFile}`, volume: "VIII", exampleId: `Atlas ${id}` };
    if (binding.kind === "spectrum") {
      setSelectedPreset(null);
      setParameters(Object.fromEntries(Object.entries(binding.parameters).map(([key, value]) => [key, String(value)])));
      setTab("spectrum");
    } else if (binding.kind === "dynamics") {
      const defaults = MODEL_REGISTRY[binding.modelId].solverDefaults!;
      openPreset({ id: `atlas-${id}`, kind: "evolution", title: entry.name, description: entry.presentation.summary,
        reference: "Pinned Hamiltonian Atlas entry", convention: binding.convention, source,
        modelId: binding.modelId, parameters: binding.parameters, initialIndex: 0, solver: defaults });
    } else if (binding.kind === "cavity") {
      openPreset({ id: `atlas-${id}`, kind: "cavity", title: entry.name, description: entry.presentation.summary,
        reference: "Pinned Hamiltonian Atlas entry", convention: binding.convention, source,
        modelId: binding.modelId, parameters: binding.parameters, initialState: { qubit: "excited", photons: 0 },
        solver: { tStart: 0, tStop: 25, samples: 401 } });
    } else if (binding.kind === "many_body") {
      const p = binding.parameters;
      setAtlasManyBody(current => ({ epoch: (current?.epoch ?? 0) + 1,
        draft: { sites: String(p.sites), interaction: String(p.interaction), transverse: String(p.transverse),
          longitudinal: String(p.longitudinal), boundary: p.boundary, engine: "native" } }));
      setTab("many_body");
    } else {
      const draft = binding.modelId === "ssh"
        ? { ...TOPOLOGY_DEFAULTS, modelId: "ssh" as const, t1: String(binding.parameters.t1),
            t2: String(binding.parameters.t2), cells: String(binding.parameters.cells), kPoints: String(binding.parameters.kPoints) }
        : { ...TOPOLOGY_DEFAULTS, modelId: "qwz" as const, mass: String(binding.parameters.mass), grid: String(binding.parameters.grid) };
      setAtlasTopology(current => ({ epoch: (current?.epoch ?? 0) + 1, draft }));
      setTab("topology");
    }
  }
  async function saveWorkspace() {
    const parts = workspaceParts.current;
    if (!parts.dynamics || !parts.cavity || !parts.open || !parts.sweep || !parts.manyBody || !parts.circuit) return;
    const snapshot: WorkspaceSnapshot = { schema: "quantum-workspace/v1", savedAt: new Date().toISOString(),
      tab, selectedPresetId: selectedPreset?.id ?? null,
      spectrum: { parameters, engine: engineMode }, dynamics: parts.dynamics,
      cavity: parts.cavity, open: parts.open, sweep: parts.sweep, manyBody: parts.manyBody, circuit: parts.circuit,
      topology: parts.topology ?? TOPOLOGY_DEFAULTS, orbital: parts.orbital ?? ORBITAL_DEFAULTS };
    try { await window.quantum.saveWorkspace(snapshot); setWorkspaceMessage("Workspace saved"); }
    catch (error) { setWorkspaceMessage(error instanceof Error ? error.message : String(error)); }
  }
  async function restoreWorkspace() {
    try {
      const snapshot = await window.quantum.loadWorkspace();
      if (!snapshot) { setWorkspaceMessage("No saved workspace yet"); return; }
      setParameters(snapshot.spectrum.parameters); setEngineMode(snapshot.spectrum.engine);
      setEvolutionModel(snapshot.dynamics.modelId); setCavityModel(snapshot.cavity.modelId);
      setSelectedPreset(PRESETS.find(item => item.id === snapshot.selectedPresetId) ?? null);
      setTab(snapshot.tab); setRestored(current => ({ epoch: (current?.epoch ?? 0) + 1, snapshot }));
      setWorkspaceMessage(`Workspace restored · ${new Date(snapshot.savedAt).toLocaleString()}`);
    } catch (error) { setWorkspaceMessage(error instanceof Error ? error.message : String(error)); }
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
          <span className="version">V0.1+ · QVIS-007</span>
          <button className="workspace-button" data-testid="save-workspace" disabled={!workspaceReady} onClick={() => void saveWorkspace()}>Save workspace</button>
          <button className="workspace-button" data-testid="restore-workspace" onClick={() => void restoreWorkspace()}>Restore</button>
          {tab !== "orbital" && tab !== "scenes" && tab !== "dynamics" && tab !== "cavity" && tab !== "open" && tab !== "sweep" && tab !== "many_body" && tab !== "circuit" && tab !== "topology" && tab !== "atlas" && tab !== "presets" && tab !== "runs" && tab !== "backend" && tab !== "roadmap" && (
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
      <div className={`layout ${tab === "orbital" || tab === "scenes" || tab === "dynamics" || tab === "cavity" || tab === "open" || tab === "sweep" || tab === "many_body" || tab === "circuit" || tab === "topology" || tab === "atlas" || tab === "presets" || tab === "runs" ? "dynamics-layout" : ""}`}>
        <aside className="sidebar">
          <p className="eyebrow">
            LABORATORIES <span>13 / 13</span>
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
                setSelectedPreset(null);
                if (id !== "two_level") setEvolutionModel(id);
                setTab(id === "two_level" ? "spectrum" : "dynamics");
              }}
            >
              <span>{id === "two_level" ? "◈" : "∿"}</span>{" "}
              {MODEL_REGISTRY[id].label} <span className="live-dot" />
            </button>
          ))}
          {(["jaynes_cummings", "quantum_rabi"] as const).map(id => <button key={id} className="lab-selected" onClick={() => { setSelectedPreset(null); setCavityModel(id); setTab("cavity"); }}><span>◉</span> {CAVITY_REGISTRY[id].label} <span className="live-dot" /></button>)}
          <button className="lab-selected" onClick={() => { setSelectedPreset(null); setTab("open"); }}><span>◌</span> Lindblad dynamics <span className="live-dot" /></button>
          <button className="lab-selected" onClick={() => setTab("sweep")}><span>▦</span> Parameter sweeps <span className="live-dot" /></button>
          <button className="lab-selected" onClick={() => setTab("many_body")}><span>⋈</span> Ising chain <span className="live-dot" /></button>
          <button className="lab-selected" onClick={() => setTab("topology")}><span>◇</span> Topological bands <span className="live-dot" /></button>
          <button className="lab-selected" data-testid="open-orbitals" onClick={() => setTab("orbital")}><span>◌</span> Atomic orbitals <span className="live-dot" /></button>
          <button className="lab-selected" onClick={() => setTab("circuit")}><span>◈</span> Transmon circuit <span className="live-dot" /></button>
          <button className="lab-selected" onClick={() => setTab("presets")}><span>▣</span> Volume VIII presets <span className="live-dot" /></button>
          <button className="lab-selected" onClick={() => setTab("runs")}><span>◷</span> Saved runs <span className="live-dot" /></button>
          <button className="lab-selected" data-testid="open-scenes" onClick={() => setTab("scenes")}><span>◈</span> Portable scenes <span className="live-dot" /></button>
          <button className="lab-selected" data-testid="open-atlas" onClick={() => setTab("atlas")}><span>◇</span> Hamiltonian Atlas <span className="live-dot" /></button>
          <p className="sidebar-note">
            From two levels to finite chains.
            <br />
            One verified job at a time.
          </p>
          <p className="eyebrow planned-label">NEXT MILESTONE</p>
          <nav aria-label="Planned laboratories">
            <div className="future-lab"><span>008</span> Generic lattice scenes</div>
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
            {tab === "scenes" ? "VISUALIZATION" : tab === "backend" ? "SYSTEM" : tab === "atlas" ? "REFERENCE" : "MODELS"} <span>/</span>{" "}
            {tab === "orbital" ? "HYDROGENIC ORBITALS" : tab === "scenes" ? "PORTABLE QUANTUM SCENES" : tab === "backend"
              ? "BACKEND METHODS & FORMATS"
              : tab === "atlas" ? "HAMILTONIAN ATLAS"
              : tab === "dynamics"
                ? MODEL_REGISTRY[evolutionModel].label.toUpperCase()
                : tab === "cavity"
                  ? CAVITY_REGISTRY[cavityModel].label.toUpperCase()
                  : tab === "open"
                    ? "LINDBLAD DYNAMICS"
                    : tab === "sweep"
                      ? "PARAMETER SWEEPS"
                    : tab === "many_body"
                      ? "ISING SPIN CHAIN"
                    : tab === "topology" ? "TOPOLOGICAL BANDS"
                    : tab === "circuit"
                      ? "TRANSMON CIRCUIT"
                    : tab === "presets"
                      ? "VOLUME VIII PRESETS"
                    : tab === "runs"
                      ? "SAVED RUNS"
                : "TWO-LEVEL SYSTEM"}
          </div>
          <div className="workspace-title">
            <div>
              <p className="eyebrow accent">
                {tab === "orbital" ? "ATOMIC ORBITALS / QVIS-004" : tab === "scenes" ? "PORTABLE VISUALIZATION / QVIS-001–004" : tab === "backend"
                  ? "ARCHITECTURE / 008–009"
                  : tab === "atlas" ? "PINNED THEORY REFERENCE / 025"
                  : tab === "dynamics"
                    ? `EVOLUTION LABORATORY / ${evolutionModel === "driven_two_level" ? "002" : evolutionModel === "landau_zener" ? "003" : evolutionModel === "stuckelberg" ? "004" : "005"}`
                    : tab === "cavity"
                      ? `CAVITY QED LABORATORY / ${cavityModel === "jaynes_cummings" ? "006" : "007"}`
                      : tab === "open"
                        ? "OPEN-SYSTEM LABORATORY / 008"
                        : tab === "sweep"
                          ? "SWEEP LABORATORY / 009"
                        : tab === "many_body"
                          ? "MANY-BODY LABORATORY / 021"
                        : tab === "topology" ? "LATTICE TOPOLOGY / 027–028"
                        : tab === "circuit"
                          ? "SUPERCONDUCTING CIRCUIT / 023"
                        : tab === "presets"
                          ? "REFERENCE PRESETS / 010"
                        : tab === "runs"
                          ? "RUN HISTORY / 011"
                    : "SMOKE LABORATORY / 001"}
              </p>
              <h1>
                {tab === "orbital" ? "A wavefunction takes shape." : tab === "scenes" ? "A result becomes a scene." : tab === "backend"
                  ? "Under the hood."
                  : tab === "atlas" ? "The map of Hamiltonians."
                  : tab === "dynamics"
                    ? "A system in motion."
                    : tab === "cavity"
                      ? "Light meets matter."
                      : tab === "open"
                        ? "A system meets its environment."
                        : tab === "sweep"
                          ? "The landscape of a model."
                        : tab === "many_body"
                          ? "One qubit becomes a chain."
                        : tab === "topology" ? "Bands acquire topology."
                        : tab === "circuit"
                          ? "A circuit becomes a quantum system."
                        : tab === "presets"
                          ? "From reference to experiment."
                        : tab === "runs"
                          ? "A durable record of discovery."
                    : "A two-level universe."}
              </h1>
              <p>
                {tab === "orbital" ? "Explore normalized hydrogenic s, p and d states with explicit units and basis conventions." : tab === "scenes" ? "Inspect verified numerical data and export application-independent scene bundles." : tab === "backend"
                  ? "Independent numerical engines behind versioned, verified results."
                  : tab === "atlas" ? "Browse source-pinned definitions and explicit laboratory bindings."
                  : tab === "dynamics"
                    ? MODEL_REGISTRY[evolutionModel].description
                    : tab === "cavity"
                      ? CAVITY_REGISTRY[cavityModel].description
                      : tab === "open"
                        ? "Explore relaxation, dephasing, cavity loss and stationary states."
                      : tab === "sweep"
                        ? "Sweep one or two parameters with checkpoints, cancellation and resume."
                      : tab === "many_body"
                        ? "Explore a finite Ising chain with independent QuSpin and NumPy engines."
                      : tab === "topology" ? "Computed band topology for finite and periodic lattice models."
                      : tab === "circuit"
                        ? "Resolve transmon levels in a finite charge basis with scqubits or NumPy."
                      : tab === "presets"
                        ? "Reproducible configurations from validated Volume VIII examples."
                      : tab === "runs"
                        ? "Inspect provenance and export data, figures, or manifests."
                    : "Explore the spectrum of a coupled quantum two-state system."}
              </p>
            </div>
            <span className="pill">{tab === "orbital" ? "a₀ / HARTREE" : tab === "scenes" ? "QUANTUM-SCENE / V1" : tab === "atlas" ? "48 SOURCE ENTRIES" : tab === "topology" ? "1D / 2D BLOCH BANDS" : tab === "presets" ? "6 PINNED PRESETS" : tab === "runs" ? "PERSISTENT HISTORY" : tab === "circuit" ? "2 NCUT + 1 CHARGE STATES" : tab === "many_body" ? "2ᴺ HILBERT SPACE" : tab === "cavity" || tab === "open" ? "2 × N HILBERT SPACE" : "2 × 2 HILBERT SPACE"}</span>
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
            <button role="tab" aria-selected={tab === "cavity"} onClick={() => setTab("cavity")}>Cavity QED</button>
            <button role="tab" aria-selected={tab === "open"} onClick={() => setTab("open")}>Open system</button>
            <button role="tab" aria-selected={tab === "sweep"} onClick={() => setTab("sweep")}>Sweeps</button>
            <button role="tab" aria-selected={tab === "many_body"} onClick={() => setTab("many_body")}>Many-body</button>
            <button role="tab" aria-selected={tab === "topology"} onClick={() => setTab("topology")}>Topology</button>
            <button role="tab" aria-selected={tab === "orbital"} onClick={() => setTab("orbital")}>Orbitals</button>
            <button role="tab" aria-selected={tab === "circuit"} onClick={() => setTab("circuit")}>Circuit</button>
            <button role="tab" aria-selected={tab === "presets"} onClick={() => setTab("presets")}>Presets</button>
            <button role="tab" aria-selected={tab === "runs"} onClick={() => setTab("runs")}>Runs</button>
            <button role="tab" aria-selected={tab === "scenes"} onClick={() => setTab("scenes")}>Scenes</button>
            <button role="tab" aria-selected={tab === "atlas"} onClick={() => setTab("atlas")}>Atlas</button>
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
              preset={selectedPreset?.kind === "evolution" ? selectedPreset : null}
              restored={restored?.snapshot.dynamics}
              restoreEpoch={restored?.epoch}
              onSnapshot={collectDynamics}
            />
          </div>
          <div hidden={tab !== "cavity"}><CavityLab bridge={window.quantum} status={status} modelId={cavityModel} preset={selectedPreset?.kind === "cavity" ? selectedPreset : null} restored={restored?.snapshot.cavity} restoreEpoch={restored?.epoch} onSnapshot={collectCavity} /></div>
          <div hidden={tab !== "open"}><OpenSystemLab bridge={window.quantum} status={status} preset={selectedPreset?.kind === "open" ? selectedPreset : null} restored={restored?.snapshot.open} restoreEpoch={restored?.epoch} onSnapshot={collectOpen} /></div>
          <div hidden={tab !== "sweep"}><SweepLab bridge={window.quantum} status={status} restored={restored?.snapshot.sweep} restoreEpoch={restored?.epoch} onSnapshot={collectSweep} /></div>
          <div hidden={tab !== "many_body"}><ManyBodyLab bridge={window.quantum} status={status} restored={restored?.snapshot.manyBody} restoreEpoch={restored?.epoch} atlasDraft={atlasManyBody?.draft} atlasEpoch={atlasManyBody?.epoch} onSnapshot={collectManyBody} /></div>
          <div hidden={tab !== "topology"}><TopologyLab bridge={window.quantum} status={status} restored={restored?.snapshot.topology} restoreEpoch={restored?.epoch} atlasDraft={atlasTopology?.draft} atlasEpoch={atlasTopology?.epoch} onSnapshot={collectTopology} /></div>
          <div hidden={tab !== "orbital"}><OrbitalLab bridge={window.quantum} status={status} restored={restored?.snapshot.orbital} restoreEpoch={restored?.epoch} onSnapshot={collectOrbital}/></div>
          <div hidden={tab !== "circuit"}><CircuitLab bridge={window.quantum} status={status} restored={restored?.snapshot.circuit} restoreEpoch={restored?.epoch} onSnapshot={collectCircuit} /></div>
          {tab === "scenes" ? <SceneLab bridge={window.quantum} /> : tab === "atlas" ? <AtlasPanel openLab={openAtlasBinding} /> : tab === "presets" ? <PresetPanel open={openPreset} /> : tab === "runs" ? <RunHistory bridge={window.quantum} /> : tab === "backend" ? (
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
                ["012", "Jaynes–Cummings & quantum Rabi cavity QED", "Implemented"],
                ["013", "Lindblad dynamics, purity & steady state", "Implemented"],
                ["014", "Parameter sweeps & heatmap workspace", "Implemented"],
                ["015", "Volume VIII reproducible presets", "Implemented"],
                ["016", "Saved workspaces, runs & exports", "Implemented"],
                ["017", "Desktop v0.1 acceptance", "Implemented"],
                ["018", "Optional Dynamiqs GPU evolution", "Implemented"],
                ["019", "GPU-batched sweep scheduler", "Implemented"],
                ["020", "Optional QuSpin Ising-chain adapter", "Implemented"],
                ["021", "Many-body Ising-chain workspace", "Implemented"],
                ["022", "Optional scqubits transmon adapter", "Implemented"],
                ["023", "Superconducting-circuit workspace", "Implemented"],
                ["024", "Opt-in SSH worker transport", "Implemented"],
                ["025", "Pinned Hamiltonian Atlas catalog", "Implemented"],
                ["026", "Tested Atlas-to-lab bindings", "Implemented"],
                ["027", "SSH-chain bands, winding & finite edges", "Implemented"],
                ["028", "QWZ Berry curvature & Chern laboratory", "Implemented"],
                ["029", "Web Atlas & topology client", "Implemented"],
                ...DELIVERED_QVIS.map(({id, title, state}) => [id, title, state]),
              ].map(([id, title, state]) => (
                <div className="roadmap-row" key={id}>
                  <code>{id}</code>
                  <span>{title}</span>
                  <small>{state}</small>
                </div>
              ))}
              <p className="scope-note">
                Volume VIII chapters 58–59 are still architecture placeholders;
                mapped example presets are pinned to the inspected theory revision. Hydrogenic orbitals are the first analytic atomic extension; multi-electron atoms, molecules and crystals remain future work.
              </p>
              <PostRoadmapPanel />
            </section>
          ) : tab === "orbital" || tab === "dynamics" || tab === "cavity" || tab === "open" || tab === "sweep" || tab === "many_body" || tab === "circuit" || tab === "topology" ? null : (
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
                  · saved to run history
                </small>
              </>
            ) : (
              <p>No completed run yet.</p>
            )}
          </div>
        </aside>
      </div>
      {workspaceMessage && <div className="workspace-notice" role="status" data-testid="workspace-message">{workspaceMessage}</div>}
      <footer className="statusbar">
        <div>
          <span
            className={status.state === "READY" ? "live-dot" : "offline-dot"}
          />
          <span data-testid="worker-status">Python worker: {status.state}{status.transport === "ssh" ? " · SSH" : ""}</span>
          <span className="status-separator">|</span>
          <span>
            {status.capabilities
              ? `QuTiP ${status.capabilities.engines.qutip.version ?? "off"} · SciPy ${status.capabilities.engines.native.version ?? "off"}`
              : "Starting environment"}
          </span>
        </div>
        <div>
          <span>{status.transport === "ssh" ? "SSH COMPUTE" : "LOCAL COMPUTE"}</span>
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
