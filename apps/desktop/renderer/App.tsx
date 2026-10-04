import React, { useCallback, useEffect, useRef, useState } from "react";
import type {
  EngineName,
  CavityResult,
  CircuitResult,
  EvolutionResult,
  LindbladResult,
  ManyBodyResult,
  SweepResult,
  TopologyResult,
  OrbitalResult,
  OscillatorFamilyResult,
  QuantumResult,
  QuantumBridge,
  SpectrumResult,
  WorkerStatus,
  WorkspaceSnapshot,
  WorkspaceTab,
} from "../../../packages/contracts";
import { Spectrum, format } from "./Spectrum";
import {ScientificSelectionPanel} from "./ScientificSelectionPanel";
import {SelectionReferenceCard} from "./SelectionReferenceCard";
import {activeSelectionReference,type SelectionSources} from "./selection-reference";
import {resolveObservableWorkspace} from "./observable-workspace";
import {ObservableWorkspace} from "./ObservableWorkspace";
import {TwoLevelStateView} from "./TwoLevelStateView";
import {SpectrumStudyLab,SPECTRUM_STUDY_DEFAULTS} from "./SpectrumStudyLab";
import {IsingStudyLab,ISING_STUDY_DEFAULTS} from "./IsingStudyLab";
import {spectrumSliderValue} from "./spectrum-slider";
import {validatedSelection,type ScientificSelection} from "./scientific-selection";
import { DynamicsLab } from "./DynamicsLab";
import { EvolutionRunInspector } from "./EvolutionRunInspector";
import type { EvolutionRunContext } from "./evolution-selection";
import { CavityLab } from "./CavityLab";
import { CavityRunInspector } from "./CavityRunInspector";
import type { CavityRunContext } from "./cavity-selection";
import { OpenSystemLab } from "./OpenSystemLab";
import { LindbladRunInspector } from "./LindbladRunInspector";
import type { LindbladRunContext } from "./lindblad-selection";
import { SweepLab } from "./SweepLab";
import type { SweepRunContext } from "./sweep-selection";
import { SweepRunInspector } from "./SweepRunInspector";
import { ManyBodyLab } from "./ManyBodyLab";
import {IsingQuenchLab} from "./IsingQuenchLab";
import { ManyBodyRunInspector } from "./ManyBodyRunInspector";
import type { ManyBodyRunContext } from "./many-body-selection";
import { CircuitLab } from "./CircuitLab";
import { CircuitRunInspector } from "./CircuitRunInspector";
import type { CircuitRunContext } from "./circuit-selection";
import { OscillatorLab } from "./OscillatorLab";
import { OSCILLATOR_DEFAULTS } from "../../../packages/models/oscillator";
import { OSCILLATOR_DYNAMICS_DEFAULTS } from "../../../packages/models/oscillator-dynamics";
import { DRIVEN_OSCILLATOR_DEFAULTS } from "../../../packages/models/oscillator-drive";
import { PULSED_OSCILLATOR_DEFAULTS } from "../../../packages/models/oscillator-pulse";
import { DAMPED_OSCILLATOR_DEFAULTS } from "../../../packages/models/oscillator-damped";
import { PARAMETRIC_DEFAULTS } from "../../../packages/models/oscillator-parametric";
import { ANHARMONIC_DEFAULTS } from "../../../packages/models/oscillator-anharmonic";
import { PresetPanel } from "./PresetPanel";
import { PRESETS, type LaboratoryPreset } from "../../../packages/models/presets";
import { RunHistory } from "./RunHistory";
import {RunComparisonPanel} from "./RunComparisonPanel";
import { SceneLab } from "./SceneLab";
import {availableSceneViews,sceneSampleForSelection,type SceneLaunch,type SceneSample,type SceneView} from "./scene-bridge";
import { CAVITY_REGISTRY, type CavityModelId } from "../../../packages/models/cavity";
import { BackendPanel } from "./BackendPanel";
import { AtlasPanel } from "./AtlasPanel";
import { TopologyLab } from "./TopologyLab";
import type {TopologyRunContext} from "./topology-selection";
import {TopologyRunInspector} from "./TopologyRunInspector";
import type {OrbitalRunContext} from "./orbital-selection";
import {OrbitalRunInspector} from "./OrbitalRunInspector";
import type {OscillatorRunContext} from "./oscillator-selection";
import {OscillatorRunInspector} from "./OscillatorRunInspector";
import { TOPOLOGY_DEFAULTS } from "../../../packages/models/topology";
import { OrbitalLab } from "./OrbitalLab";
import { PostRoadmapPanel } from "./PostRoadmapPanel";
import { ModelNavigator } from "./ModelNavigator";
import { TheoryPanel } from "./TheoryPanel";
import { DELIVERED_QVIS } from "../../../packages/models/roadmap";
import {locationFromHash,modeForTab,modelForSnapshot,modelLabel,tabForMode,workspaceHash,WORKSPACE_MODES,type WorkspaceMode,type WorkspaceModel} from "./workspace-navigation";
import { ORBITAL_DEFAULTS } from "../../../packages/models/orbital";
import { ATLAS_ENTRIES, ATLAS_REVISION, ATLAS_SOURCE, atlasEntry } from "../../../packages/atlas";
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
  const initialLocation=useRef(locationFromHash(window.location.hash));
  const [status, setStatus] = useState<WorkerStatus>({
    state: "STARTING",
    detail: "Starting Python worker",
    capabilities: null,
  });
  const [parameters, setParameters] = useState(() => defaultsFor("two_level"));
  const delta = parameters.delta;
  const omega = parameters.omega;
  const [evolutionModel, setEvolutionModel] =
    useState<EvolutionModelId>(()=>{
      const model=initialLocation.current?.model;
      return model&&["driven_two_level","landau_zener","stuckelberg","strong_drive"].includes(model)?model as EvolutionModelId:"driven_two_level";
    });
  const [cavityModel, setCavityModel] = useState<CavityModelId>(()=>{
    const model=initialLocation.current?.model;
    return model==="quantum_rabi"?"quantum_rabi":"jaynes_cummings";
  });
  const [selectedPreset, setSelectedPreset] = useState<LaboratoryPreset | null>(null);
  const workspaceParts = useRef<Partial<Pick<WorkspaceSnapshot, "dynamics" | "cavity" | "open" | "sweep" | "spectrumStudy" | "isingStudy" | "isingQuench" | "manyBody" | "circuit" | "topology" | "orbital" | "oscillator" | "oscillatorDynamics" | "oscillatorMode" | "oscillatorDriven" | "oscillatorPulse" | "oscillatorDamped" | "oscillatorParametric" | "oscillatorAnharmonic">>>({});
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [restored, setRestored] = useState<{ epoch: number; snapshot: WorkspaceSnapshot } | null>(null);
  const [atlasManyBody, setAtlasManyBody] = useState<{ epoch: number; draft: NonNullable<WorkspaceSnapshot["manyBody"]> } | null>(null);
  const [atlasTopology, setAtlasTopology] = useState<{ epoch: number; draft: NonNullable<WorkspaceSnapshot["topology"]> } | null>(null);
  const [atlasOscillator, setAtlasOscillator] = useState<{ epoch:number; draft:NonNullable<WorkspaceSnapshot["oscillator"]> } | null>(null);
  const [atlasDriven, setAtlasDriven] = useState<{epoch:number;draft:NonNullable<WorkspaceSnapshot["oscillatorDriven"]>}|null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const collectDynamics = useCallback((value: WorkspaceSnapshot["dynamics"]) => { workspaceParts.current.dynamics = value; checkParts(); }, []);
  const collectCavity = useCallback((value: WorkspaceSnapshot["cavity"]) => { workspaceParts.current.cavity = value; checkParts(); }, []);
  const collectOpen = useCallback((value: WorkspaceSnapshot["open"]) => { workspaceParts.current.open = value; checkParts(); }, []);
  const collectSweep = useCallback((value: WorkspaceSnapshot["sweep"]) => { workspaceParts.current.sweep = value; checkParts(); }, []);
  const collectSpectrumStudy=useCallback((value:NonNullable<WorkspaceSnapshot["spectrumStudy"]>)=>{workspaceParts.current.spectrumStudy=value;},[]);
  const collectIsingStudy=useCallback((value:NonNullable<WorkspaceSnapshot["isingStudy"]>)=>{workspaceParts.current.isingStudy=value;},[]);
  const collectIsingQuench=useCallback((value:NonNullable<WorkspaceSnapshot["isingQuench"]>)=>{workspaceParts.current.isingQuench=value;},[]);
  const collectManyBody = useCallback((value: NonNullable<WorkspaceSnapshot["manyBody"]>) => { workspaceParts.current.manyBody = value; checkParts(); }, []);
  const collectCircuit = useCallback((value: NonNullable<WorkspaceSnapshot["circuit"]>) => { workspaceParts.current.circuit = value; checkParts(); }, []);
  const collectTopology = useCallback((value: NonNullable<WorkspaceSnapshot["topology"]>) => { workspaceParts.current.topology = value; }, []);
  const collectOrbital = useCallback((value: NonNullable<WorkspaceSnapshot["orbital"]>) => { workspaceParts.current.orbital = value; }, []);
  const collectOscillator = useCallback((value: NonNullable<WorkspaceSnapshot["oscillator"]>) => { workspaceParts.current.oscillator = value; }, []);
  const collectOscillatorDynamics = useCallback((value: NonNullable<WorkspaceSnapshot["oscillatorDynamics"]>) => { workspaceParts.current.oscillatorDynamics = value; }, []);
  const collectOscillatorMode = useCallback((value: NonNullable<WorkspaceSnapshot["oscillatorMode"]>) => { workspaceParts.current.oscillatorMode = value; }, []);
  const collectOscillatorDriven = useCallback((value: NonNullable<WorkspaceSnapshot["oscillatorDriven"]>) => { workspaceParts.current.oscillatorDriven = value; }, []);
  const collectOscillatorPulse = useCallback((value: NonNullable<WorkspaceSnapshot["oscillatorPulse"]>) => { workspaceParts.current.oscillatorPulse = value; }, []);
  const collectOscillatorDamped = useCallback((value: NonNullable<WorkspaceSnapshot["oscillatorDamped"]>) => { workspaceParts.current.oscillatorDamped = value; }, []);
  const collectOscillatorParametric = useCallback((value: NonNullable<WorkspaceSnapshot["oscillatorParametric"]>) => { workspaceParts.current.oscillatorParametric = value; }, []);
  const collectOscillatorAnharmonic = useCallback((value: NonNullable<WorkspaceSnapshot["oscillatorAnharmonic"]>) => { workspaceParts.current.oscillatorAnharmonic = value; }, []);
  function checkParts() { if (workspaceParts.current.dynamics && workspaceParts.current.cavity && workspaceParts.current.open && workspaceParts.current.sweep && workspaceParts.current.manyBody && workspaceParts.current.circuit) setWorkspaceReady(true); }
  const [result, setResult] = useState<SpectrumResult | null>(null);
  const [evolutionContext,setEvolutionContext]=useState<EvolutionRunContext|null>(null);
  const collectEvolutionContext=useCallback((context:EvolutionRunContext|null)=>setEvolutionContext(context),[]);
  const [reopenedEvolution,setReopenedEvolution]=useState<{epoch:number;result:EvolutionResult;data:Uint8Array}|null>(null);
  const [cavityContext,setCavityContext]=useState<CavityRunContext|null>(null);
  const collectCavityContext=useCallback((context:CavityRunContext|null)=>setCavityContext(context),[]);
  const [reopenedCavity,setReopenedCavity]=useState<{epoch:number;result:CavityResult;data:Uint8Array}|null>(null);
  const [lindbladContext,setLindbladContext]=useState<LindbladRunContext|null>(null);
  const collectLindbladContext=useCallback((context:LindbladRunContext|null)=>setLindbladContext(context),[]);
  const [reopenedLindblad,setReopenedLindblad]=useState<{epoch:number;result:LindbladResult;data:Uint8Array}|null>(null);
  const [circuitContext,setCircuitContext]=useState<CircuitRunContext|null>(null);
  const collectCircuitContext=useCallback((context:CircuitRunContext|null)=>setCircuitContext(context),[]);
  const [reopenedCircuit,setReopenedCircuit]=useState<{epoch:number;result:CircuitResult}|null>(null);
  const [manyBodyContext,setManyBodyContext]=useState<ManyBodyRunContext|null>(null);
  const collectManyBodyContext=useCallback((context:ManyBodyRunContext|null)=>setManyBodyContext(context),[]);
  const [reopenedManyBody,setReopenedManyBody]=useState<{epoch:number;result:ManyBodyResult}|null>(null);
  const [sweepContext,setSweepContext]=useState<SweepRunContext|null>(null);
  const collectSweepContext=useCallback((context:SweepRunContext|null)=>setSweepContext(context),[]);
  const [reopenedSweep,setReopenedSweep]=useState<{epoch:number;result:SweepResult;data:Uint8Array}|null>(null);
  const [topologyContext,setTopologyContext]=useState<TopologyRunContext|null>(null);
  const collectTopologyContext=useCallback((context:TopologyRunContext|null)=>setTopologyContext(context),[]);
  const [reopenedTopology,setReopenedTopology]=useState<{epoch:number;result:TopologyResult}|null>(null);
  const [orbitalContext,setOrbitalContext]=useState<OrbitalRunContext|null>(null);
  const collectOrbitalContext=useCallback((context:OrbitalRunContext|null)=>setOrbitalContext(context),[]);
  const [reopenedOrbital,setReopenedOrbital]=useState<{epoch:number;result:OrbitalResult;data:Uint8Array}|null>(null);
  const [oscillatorContext,setOscillatorContext]=useState<OscillatorRunContext|null>(null);
  const collectOscillatorContext=useCallback((context:OscillatorRunContext|null)=>setOscillatorContext(context),[]);
  const [reopenedOscillator,setReopenedOscillator]=useState<{epoch:number;result:OscillatorFamilyResult;data:Uint8Array|null}|null>(null);
  const [selection,setSelection]=useState<ScientificSelection|null>(null);
  const [inspectorTab,setInspectorTab]=useState<"parameters"|"observables"|"provenance">("parameters");
  const runSelections=useRef(new Map<string,ScientificSelection>());
  function chooseSelection(next:ScientificSelection){
    if(result){
      if(next.kind==="energy"){
        if(!runSelections.current.has(result.runId)&&runSelections.current.size>=100)
          runSelections.current.delete(runSelections.current.keys().next().value!);
        runSelections.current.set(result.runId,next);
      }
      else runSelections.current.delete(result.runId);
    }
    setSelection(next);
  }
  const [engineMode, setEngineMode] = useState<EngineMode>("qutip");
  const [resultMode, setResultMode] = useState<EngineMode | null>(null);
  const [comparison, setComparison] = useState<SpectrumComparison | null>(null);
  const [busy, setBusy] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<WorkspaceTab>(()=>initialLocation.current?.tab??"spectrum");
  const [activeModel,setActiveModel]=useState<WorkspaceModel>(()=>initialLocation.current?.model??"two_level");
  const [sceneLaunch,setSceneLaunch]=useState<SceneLaunch|null>(null);
  function viewSavedScene(runId:string,view:SceneView="standard",sample?:SceneSample|null){
    setSceneLaunch(current=>({nonce:(current?.nonce??0)+1,runId,view,sample}));
    setTab("scenes");
  }
  const currentLocation=useRef({tab,model:activeModel});
  currentLocation.current={tab,model:activeModel};
  const firstLocation=useRef(true);
  const restoringHistory=useRef(false);
  const [navigation,setNavigation]=useState({index:0,max:0});
  const navigationRef=useRef({index:0,max:0});
  useEffect(()=>{
    const onHistory=()=>{
      const next=locationFromHash(window.location.hash);
      if(!next)return;
      const stateIndex=(window.history.state as {qlabIndex?:unknown}|null)?.qlabIndex;
      const index=Number.isInteger(stateIndex)&&typeof stateIndex==="number"&&stateIndex>=0?stateIndex:navigationRef.current.index+1;
      if(stateIndex!==index)window.history.replaceState({qlabIndex:index},"",window.location.href);
      navigationRef.current={index,max:stateIndex===index?Math.max(index,navigationRef.current.max):index};
      setNavigation(navigationRef.current);
      if(next.tab===currentLocation.current.tab&&next.model===currentLocation.current.model)return;
      restoringHistory.current=true;
      setSelectedPreset(null);
      setTab(next.tab);setActiveModel(next.model);
      if(["driven_two_level","landau_zener","stuckelberg","strong_drive"].includes(next.model))setEvolutionModel(next.model as EvolutionModelId);
      if(next.model==="jaynes_cummings"||next.model==="quantum_rabi")setCavityModel(next.model);
    };
    window.addEventListener("popstate",onHistory);
    window.addEventListener("hashchange",onHistory);
    return ()=>{window.removeEventListener("popstate",onHistory);window.removeEventListener("hashchange",onHistory);};
  },[]);
  useEffect(()=>{
    const hash=workspaceHash({model:activeModel,tab});
    if(firstLocation.current){firstLocation.current=false;window.history.replaceState({qlabIndex:0},"",hash);return;}
    if(restoringHistory.current){restoringHistory.current=false;return;}
    if(window.location.hash!==hash){
      const index=navigationRef.current.index+1;
      window.history.pushState({qlabIndex:index},"",hash);
      navigationRef.current={index,max:index};
      setNavigation(navigationRef.current);
    }
  },[tab,activeModel]);
  const primaryMode=modeForTab(tab);
  function selectMode(mode:WorkspaceMode){
    const destination=tabForMode(activeModel,mode);
    if(destination==="dynamics")setEvolutionModel(activeModel as EvolutionModelId);
    if(destination)setTab(destination);
  }
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
  const currentSelection=validatedSelection(selection,activeModel,result);
  useEffect(()=>{
    if(selection&&!validatedSelection(selection,activeModel,result))setSelection(null);
  },[selection,activeModel,result]);
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
      setSelection(null);
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
  function selectModel(model:WorkspaceModel,destination:WorkspaceTab){
    setSelectedPreset(null);setSelection(null);setActiveModel(model);setTab(destination);
  }
  function openPreset(preset: LaboratoryPreset) {
    setSelectedPreset(preset);
    if (preset.kind === "evolution") { setEvolutionModel(preset.modelId);setActiveModel(preset.modelId); setTab("dynamics"); }
    else if (preset.kind === "cavity") { setCavityModel(preset.modelId);setActiveModel(preset.modelId); setTab("cavity"); }
    else {setActiveModel("lindblad");setTab("open");}
  }
  function openAtlasBinding(id: string) {
    const binding = atlasBinding(id);
    const entry = atlasEntry(id);
    if (!binding || !entry) return;
    const source = { sourceRepository: `${ATLAS_SOURCE}/tree/${ATLAS_REVISION}`,
      sourceModule: `data/hamiltonian_atlas/${entry.sourceFile}`, volume: "VIII", exampleId: `Atlas ${id}` };
    if (binding.kind === "spectrum") {
      setSelectedPreset(null);
      setActiveModel("two_level");
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
    } else if (binding.kind === "oscillator_drive") {
      setActiveModel("oscillator");
      setAtlasDriven(current=>({epoch:(current?.epoch??0)+1,draft:{...DRIVEN_OSCILLATOR_DEFAULTS,
        ...Object.fromEntries(Object.entries(binding.parameters).map(([key,value])=>[key,String(value)]))}}));
      setTab("oscillator");
    } else if (binding.kind === "oscillator") {
      setActiveModel("oscillator");
      setAtlasOscillator(current=>({epoch:(current?.epoch??0)+1,draft:{...OSCILLATOR_DEFAULTS,
        ...Object.fromEntries(Object.entries(binding.parameters).map(([key,value])=>[key,String(value)]))}}));
      setTab("oscillator");
    } else if (binding.kind === "many_body") {
      setActiveModel("ising_chain");
      const p = binding.parameters;
      setAtlasManyBody(current => ({ epoch: (current?.epoch ?? 0) + 1,
        draft: { sites: String(p.sites), interaction: String(p.interaction), transverse: String(p.transverse),
          longitudinal: String(p.longitudinal), boundary: p.boundary, engine: "native" } }));
      setTab("many_body");
    } else {
      setActiveModel("topology");
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
      tab, analysisModel:tab==="hamiltonian"?activeModel:undefined,
      theoryModel:tab==="theory"?activeModel:undefined, selectedPresetId: selectedPreset?.id ?? null,
      spectrum: { parameters, engine: engineMode }, dynamics: parts.dynamics,
      cavity: parts.cavity, open: parts.open, sweep: parts.sweep, manyBody: parts.manyBody, circuit: parts.circuit,
      sweepView:tab==="sweep"&&activeModel==="two_level"?"two_level":tab==="sweep"&&activeModel==="ising_chain"?"ising_chain":"dynamics",
      spectrumStudy:parts.spectrumStudy??SPECTRUM_STUDY_DEFAULTS,
      isingStudy:parts.isingStudy??ISING_STUDY_DEFAULTS,
      isingQuench:parts.isingQuench,
      topology: parts.topology ?? TOPOLOGY_DEFAULTS, orbital: parts.orbital ?? ORBITAL_DEFAULTS,
      oscillator: parts.oscillator ?? OSCILLATOR_DEFAULTS,
      oscillatorDynamics: parts.oscillatorDynamics ?? OSCILLATOR_DYNAMICS_DEFAULTS,
      oscillatorDriven: parts.oscillatorDriven ?? DRIVEN_OSCILLATOR_DEFAULTS,
      oscillatorPulse: parts.oscillatorPulse ?? PULSED_OSCILLATOR_DEFAULTS,
      oscillatorDamped: parts.oscillatorDamped ?? DAMPED_OSCILLATOR_DEFAULTS,
      oscillatorParametric: parts.oscillatorParametric ?? PARAMETRIC_DEFAULTS,
      oscillatorAnharmonic: parts.oscillatorAnharmonic ?? ANHARMONIC_DEFAULTS,
      oscillatorMode: parts.oscillatorMode ?? "static" };
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
      setActiveModel(modelForSnapshot(snapshot));setTab(snapshot.tab); setRestored(current => ({ epoch: (current?.epoch ?? 0) + 1, snapshot }));
      setWorkspaceMessage(`Workspace restored · ${new Date(snapshot.savedAt).toLocaleString()}`);
    } catch (error) { setWorkspaceMessage(error instanceof Error ? error.message : String(error)); }
  }
  async function openSavedSpectrum(runId:string){
    const saved=await window.quantum.getSpectrumRun(runId);
    setSelection(validatedSelection(runSelections.current.get(saved.runId),"two_level",saved));
    setParameters({delta:String(saved.model.parameters.delta),omega:String(saved.model.parameters.omega)});
    setEngineMode(saved.engine.name);setResultMode(saved.engine.name);
    setComparison(null);setResult(saved);setSelectedPreset(null);
    setActiveModel("two_level");setTab("spectrum");
    setWorkspaceMessage(`Verified spectrum reopened · ${saved.runId}`);
  }
  async function openSavedEvolution(runId:string){
    const saved=await window.quantum.getEvolutionRun(runId);
    const model=saved.result.model.type;
    setReopenedEvolution(current=>({epoch:(current?.epoch??0)+1,...saved}));
    setSelectedPreset(null);setEvolutionModel(model);
    setActiveModel(model);setTab("dynamics");
    setWorkspaceMessage(`Verified ${MODEL_REGISTRY[model].label} evolution reopened · ${saved.result.runId}`);
  }
  async function openSavedCavity(runId:string){
    const saved=await window.quantum.getCavityRun(runId);
    const model=saved.result.model.type;
    setReopenedCavity(current=>({epoch:(current?.epoch??0)+1,...saved}));
    setSelectedPreset(null);setCavityModel(model);
    setActiveModel(model);setTab("cavity");
    setWorkspaceMessage(`Verified ${CAVITY_REGISTRY[model].label} cavity run reopened · ${saved.result.runId}`);
  }
  async function openSavedLindblad(runId:string){
    const saved=await window.quantum.getLindbladRun(runId);
    setLindbladContext(null);
    setReopenedLindblad(current=>({epoch:(current?.epoch??0)+1,...saved}));
    setSelectedPreset(null);setActiveModel("lindblad");setTab("open");
    setWorkspaceMessage(`Verified Lindblad dynamics reopened · ${saved.result.runId}`);
  }
  async function openSavedCircuit(runId:string){
    const saved=await window.quantum.getCircuitRun(runId);
    setCircuitContext(null);
    setReopenedCircuit(current=>({epoch:(current?.epoch??0)+1,result:saved}));
    setSelectedPreset(null);setActiveModel("transmon");setTab("circuit");
    setWorkspaceMessage(`Verified Transmon circuit reopened · ${saved.runId}`);
  }
  async function openSavedManyBody(runId:string){
    const saved=await window.quantum.getManyBodyRun(runId);
    setManyBodyContext(null);
    setReopenedManyBody(current=>({epoch:(current?.epoch??0)+1,result:saved}));
    setSelectedPreset(null);setActiveModel("ising_chain");setTab("many_body");
    setWorkspaceMessage(`Verified Ising-chain run reopened · ${saved.runId}`);
  }
  async function openSavedSweep(runId:string){
    const saved=await window.quantum.getSweepRun(runId);
    const model=saved.result.model.type;
    setSweepContext(null);
    setReopenedSweep(current=>({epoch:(current?.epoch??0)+1,...saved}));
    setSelectedPreset(null);setActiveModel(model);setTab("sweep");
    setWorkspaceMessage(`Verified ${MODEL_REGISTRY[model].label} final-population sweep reopened · ${saved.result.runId}`);
  }
  async function openSavedTopology(runId:string){
    const result=await window.quantum.getTopologyRun(runId);
    setTopologyContext(null);
    setReopenedTopology(current=>({epoch:(current?.epoch??0)+1,result}));
    setSelectedPreset(null);setActiveModel("topology");setTab("topology");
    setWorkspaceMessage(`Verified ${result.model.type.toUpperCase()} topology reopened · ${result.runId}`);
  }
  async function openSavedOrbital(runId:string){
    const saved=await window.quantum.getOrbitalRun(runId);
    setOrbitalContext(null);
    setReopenedOrbital(current=>({epoch:(current?.epoch??0)+1,...saved}));
    setSelectedPreset(null);setActiveModel("hydrogenic");setTab("orbital");
    setWorkspaceMessage(`Verified hydrogenic orbital reopened · ${saved.result.runId}`);
  }
  async function openSavedOscillator(runId:string){
    const saved=await window.quantum.getOscillatorRun(runId);
    setOscillatorContext(null);
    setReopenedOscillator(current=>({epoch:(current?.epoch??0)+1,...saved}));
    setSelectedPreset(null);setActiveModel("oscillator");setTab("oscillator");
    setWorkspaceMessage(`Verified ${saved.result.operation.replaceAll("_"," ")} reopened · ${saved.result.runId}`);
  }
  const utilityLocation:Partial<Record<WorkspaceTab,[string,string]>>={
    presets:["LIBRARY","VOLUME VIII PRESETS"],atlas:["LIBRARY","HAMILTONIAN ATLAS"],
    roadmap:["SYSTEM","ROADMAP"],backend:["SYSTEM","BACKEND"],
  };
  const utility=utilityLocation[tab];
  const experiment=tab==="spectrum"?"SPECTRUM":tab==="hamiltonian"?(activeModel==="two_level"?"HAMILTONIAN + A/B":"A/B RUN COMPARISON"):
    tab==="sweep"?(activeModel==="two_level"?"EIGENENERGY STUDY":"FINAL-POPULATION SWEEP"):tab==="scenes"?"PORTABLE SCENES":
    tab==="runs"?"SAVED RUNS":null;
  const visibleRunId=activeModel==="two_level"&&(tab==="spectrum"||tab==="hamiltonian")?result?.runId:
    tab==="dynamics"&&evolutionContext?.result.model.type===activeModel?evolutionContext.result.runId:
    tab==="cavity"&&cavityContext?.result.model.type===activeModel?cavityContext.result.runId:
    tab==="open"&&activeModel==="lindblad"?lindbladContext?.result.runId:
    tab==="circuit"&&activeModel==="transmon"?circuitContext?.result.runId:
    tab==="many_body"&&activeModel==="ising_chain"?manyBodyContext?.result.runId:
    tab==="sweep"&&activeModel!=="two_level"&&sweepContext?.result.model.type===activeModel?sweepContext.result.runId:
    tab==="topology"&&activeModel==="topology"?topologyContext?.result.runId:
    tab==="orbital"&&activeModel==="hydrogenic"?orbitalContext?.result.runId:
    tab==="oscillator"&&activeModel==="oscillator"?oscillatorContext?.result.runId:null;
  const sceneResult=tab==="dynamics"&&evolutionContext?.result.model.type===activeModel?evolutionContext.result:
    tab==="topology"&&activeModel==="topology"?topologyContext?.result:
    tab==="many_body"&&activeModel==="ising_chain"?manyBodyContext?.result:
    tab==="orbital"&&activeModel==="hydrogenic"?orbitalContext?.result:null;
  const sceneViews=sceneResult?availableSceneViews(sceneResult):null;
  const selectionSources:SelectionSources={tab,activeModel,spectrum:{result,selection:currentSelection},
    evolution:evolutionContext,cavity:cavityContext,lindblad:lindbladContext,circuit:circuitContext,
    manyBody:manyBodyContext,sweep:sweepContext,topology:topologyContext,orbital:orbitalContext,oscillator:oscillatorContext};
  const selectionReference=activeSelectionReference(selectionSources);
  const selectionResult:QuantumResult|null=selectionReference?
    [result,evolutionContext?.result,cavityContext?.result,lindbladContext?.result,circuitContext?.result,
      manyBodyContext?.result,sweepContext?.result,topologyContext?.result,orbitalContext?.result,oscillatorContext?.result]
      .find(value=>value?.runId===selectionReference.runId&&value.model.type===selectionReference.model&&
        value.operation===selectionReference.operation)??null:null;
  const observableView=resolveObservableWorkspace(selectionReference,selectionResult,selectionSources);
  const sceneSample=sceneSampleForSelection(selectionReference,sceneResult??null);
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
          <nav className="history-controls" aria-label="Workspace history">
            <button type="button" aria-label="Back" title="Back" disabled={navigation.index===0}
              onClick={()=>window.history.back()}>←</button>
            <button type="button" aria-label="Forward" title="Forward" disabled={navigation.index>=navigation.max}
              onClick={()=>window.history.forward()}>→</button>
          </nav>
          <span className="version">V0.1+ · QVIS-020</span>
          <button className="workspace-button" data-testid="save-workspace" disabled={!workspaceReady} onClick={() => void saveWorkspace()}>Save workspace</button>
          <button className="workspace-button" data-testid="restore-workspace" onClick={() => void restoreWorkspace()}>Restore</button>
          {activeModel==="two_level" && tab !== "theory" && tab !== "oscillator" && tab !== "orbital" && tab !== "scenes" && tab !== "dynamics" && tab !== "cavity" && tab !== "open" && tab !== "sweep" && tab !== "many_body" && tab !== "circuit" && tab !== "topology" && tab !== "atlas" && tab !== "presets" && tab !== "runs" && tab !== "backend" && tab !== "roadmap" && (
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
      <div className={`layout ${tab === "theory" || tab === "oscillator" || tab === "orbital" || tab === "scenes" || tab === "dynamics" || tab === "ising_quench" || tab === "cavity" || tab === "open" || tab === "sweep" || tab === "many_body" || tab === "circuit" || tab === "topology" || tab === "atlas" || tab === "presets" || tab === "runs" || tab==="hamiltonian"&&activeModel!=="two_level" ? "dynamics-layout" : ""} ${tab==="dynamics"||tab==="ising_quench"||tab==="cavity"||tab==="open"||tab==="circuit"||tab==="many_body"||tab==="topology"||tab==="orbital"||tab==="oscillator"||(tab==="sweep"&&activeModel!=="two_level")?"evolution-layout":""} ${tab==="scenes"?"scene-workspace-layout":""}`}>
        <aside className="sidebar">
          <div className="sidebar-utilities" aria-label="Library and system">
            <div><p className="eyebrow">LIBRARY</p>
              <button className="utility-link" onClick={() => setTab("presets")}>Volume VIII presets</button>
              <button className="utility-link" data-testid="open-atlas" onClick={() => setTab("atlas")}>Hamiltonian Atlas</button>
            </div>
            <div><p className="eyebrow">SYSTEM</p>
              <button className="utility-link" onClick={() => setTab("roadmap")}>Roadmap</button>
              <button className="utility-link" onClick={() => setTab("backend")}>Backend</button>
            </div>
          </div>
          <p className="eyebrow">
            MODELS <span>{modelLabel(activeModel)}</span>
          </p>
          <ModelNavigator activeModel={activeModel} onSelect={model=>{
            if(["driven_two_level","landau_zener","stuckelberg","strong_drive"].includes(model)){
              setEvolutionModel(model as EvolutionModelId);selectModel(model,"dynamics");
            }else if(model==="jaynes_cummings"||model==="quantum_rabi"){
              setCavityModel(model);selectModel(model,"cavity");
            }else{
              const destination=tabForMode(model,model==="lindblad"?"dynamics":"explore");
              if(destination)selectModel(model,destination);
            }
          }}/>
          <p className="sidebar-note">
            From two levels to finite chains.
            <br />
            One verified job at a time.
          </p>
          <p className="eyebrow planned-label">NEXT MILESTONE</p>
          <nav aria-label="Planned laboratories">
            <div className="future-lab"><span>QVIS</span> Bounded v0.1 delivered</div>
          </nav>
          <div className="sidebar-bottom">
            <p className="eyebrow">ARCHITECTURE MILESTONE</p>
            <strong>One complete scientific path.</strong>
            <p>
              React → contract → Python
              <br />→ QuTiP / Native → result
            </p>
          </div>
        </aside>
        <main className="workspace">
          <nav className="breadcrumb" aria-label="Workspace location">
            {utility?<>{utility[0]}<span>/</span>{utility[1]}</>:
              <>MODELS<span>/</span>{modelLabel(activeModel).toUpperCase()}
                {primaryMode&&<><span>/</span>{WORKSPACE_MODES.find(mode=>mode.id===primaryMode)?.label.toUpperCase()}</>}
                {experiment&&<><span>/</span>{experiment}</>}
                {visibleRunId&&<><span>/</span><code data-testid="workspace-run-id" title={visibleRunId}>{visibleRunId}</code></>}
              </>}
          </nav>
          <div className="workspace-title">
            <div>
              <p className="eyebrow accent">
                {tab==="theory"?"MODEL GUIDE / SELECTED SYSTEM":tab==="ising_quench"?"ISING QUENCH / QVIS-020":tab==="hamiltonian"&&activeModel!=="two_level"?"SAVED RUN ANALYSIS / QLAB-UI-6":tab === "oscillator" ? "STATIONARY / DRIVEN / OPEN OSCILLATOR · D1" : tab === "orbital" ? "ATOMIC ORBITALS / QVIS-004" : tab === "scenes" ? "PORTABLE VISUALIZATION / QVIS-001–004" : tab === "backend"
                  ? "ARCHITECTURE / 008–009"
                  : tab === "atlas" ? "PINNED THEORY REFERENCE / 025"
                  : tab === "dynamics"
                    ? `EVOLUTION LABORATORY / ${evolutionModel === "driven_two_level" ? "002" : evolutionModel === "landau_zener" ? "003" : evolutionModel === "stuckelberg" ? "004" : "005"}`
                    : tab === "cavity"
                      ? `CAVITY QED LABORATORY / ${cavityModel === "jaynes_cummings" ? "006" : "007"}`
                      : tab === "open"
                        ? "OPEN-SYSTEM LABORATORY / 008"
                        : tab === "sweep"
                          ? activeModel==="two_level"?"EIGENENERGY STUDY / QLAB-UI-4":activeModel==="ising_chain"?"ISING h/J STUDY / QVIS-015":"SWEEP LABORATORY / 009"
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
                {tab==="theory"?`Understanding ${modelLabel(activeModel)}.`:tab==="ising_quench"?"A finite chain in motion.":tab==="hamiltonian"&&activeModel!=="two_level"?"Compare what was actually saved.":tab === "oscillator" ? "A ladder meets a wavefunction." : tab === "orbital" ? "A wavefunction takes shape." : tab === "scenes" ? "A result becomes a scene." : tab === "backend"
                  ? "Under the hood."
                  : tab === "atlas" ? "The map of Hamiltonians."
                  : tab === "dynamics"
                    ? "A system in motion."
                    : tab === "cavity"
                      ? "Light meets matter."
                      : tab === "open"
                        ? "A system meets its environment."
                        : tab === "sweep"
                          ? activeModel==="two_level"?"An avoided crossing, point by point.":"The landscape of a model."
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
                {tab==="theory"?"Understand the Hamiltonian, basis, parameters, observables and limits of the selected system.":tab==="ising_quench"?"Evolve a verified finite-chain ground state after a bounded transverse-field change.":tab==="hamiltonian"&&activeModel!=="two_level"?"Inspect immutable A/B inputs, provenance and only aligned recorded observables.":tab === "oscillator" ? "Explore stationary, free and driven Fock/coherent states, Gaussian pulses and bounded thermal relaxation with verified density matrices." : tab === "orbital" ? "Explore normalized hydrogenic s, p and d states with explicit units and basis conventions." : tab === "scenes" ? "Inspect verified numerical data and export application-independent scene bundles." : tab === "backend"
                  ? "Independent numerical engines behind versioned, verified results."
                  : tab === "atlas" ? "Browse source-pinned definitions and explicit laboratory bindings."
                  : tab === "dynamics"
                    ? MODEL_REGISTRY[evolutionModel].description
                    : tab === "cavity"
                      ? CAVITY_REGISTRY[cavityModel].description
                      : tab === "open"
                        ? "Explore relaxation, dephasing, cavity loss and stationary states."
                      : tab === "sweep"
                          ? activeModel==="two_level"?"Scan static eigenenergies across Δ at fixed Ω; every point is a saved spectrum run.":activeModel==="ising_chain"?"Scan transverse h/J at fixed Ising inputs; each point is a verified saved run.":"Sweep one or two parameters with checkpoints, cancellation and resume."
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
            <div className="scene-context-actions">
              {sceneResult&&sceneViews?.standard&&<button type="button" data-testid="view-in-scenes" onClick={()=>viewSavedScene(sceneResult.runId,sceneSample?.kind==="ssh_band"&&sceneViews.bands?"bands":"standard",sceneSample)}>View in Scenes</button>}
              {sceneResult&&sceneViews?.bands&&<button type="button" data-testid="view-bands-in-scenes" onClick={()=>viewSavedScene(sceneResult.runId,"bands",sceneSample)}>View bands in Scenes</button>}
              <span className="pill">{tab==="theory"?"MODEL REFERENCE · NO COMPUTE":tab==="ising_quench"?"2–8 SPINS · ℏ=1":tab==="hamiltonian"&&activeModel!=="two_level"?"VERIFIED A/B RUNS":tab === "oscillator" ? "1D / FOCK BASIS · ℏ=1" : tab === "orbital" ? "a₀ / HARTREE" : tab === "scenes" ? "QUANTUM-SCENE / V1" : tab === "atlas" ? `${ATLAS_ENTRIES.length} SOURCE ENTRIES` : tab === "topology" ? "1D / 2D BLOCH BANDS" : tab === "presets" ? "6 PINNED PRESETS" : tab === "runs" ? "PERSISTENT HISTORY" : tab === "circuit" ? "2 NCUT + 1 CHARGE STATES" : tab === "many_body" ? "2ᴺ HILBERT SPACE" : tab === "cavity" || tab === "open" ? "2 × N HILBERT SPACE" : "2 × 2 HILBERT SPACE"}</span>
            </div>
          </div>
          <div className="tabs workspace-modes" role="tablist" aria-label={`Workspace modes for ${modelLabel(activeModel)}`}>
            {WORKSPACE_MODES.map(({id,label})=>{
              const destination=tabForMode(activeModel,id);
              return <button key={id} role="tab" data-testid={id==="scenes"?"open-scenes":undefined}
                aria-selected={primaryMode===id} disabled={!destination}
                title={destination?`${label} · ${modelLabel(activeModel)}`:`${label} is not available for ${modelLabel(activeModel)} in this Lab release`}
                onClick={()=>selectMode(id)}>{label}</button>;
            })}
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
              onEvolutionContext={collectEvolutionContext}
              reopenedEvolution={reopenedEvolution}
            />
          </div>
          <div hidden={tab !== "cavity"}><CavityLab bridge={window.quantum} status={status} modelId={cavityModel} preset={selectedPreset?.kind === "cavity" ? selectedPreset : null} restored={restored?.snapshot.cavity} restoreEpoch={restored?.epoch} onSnapshot={collectCavity} onCavityContext={collectCavityContext} reopenedCavity={reopenedCavity} /></div>
          <div hidden={tab !== "open"}><OpenSystemLab bridge={window.quantum} status={status} preset={selectedPreset?.kind === "open" ? selectedPreset : null} restored={restored?.snapshot.open} restoreEpoch={restored?.epoch} onSnapshot={collectOpen} onLindbladContext={collectLindbladContext} reopenedLindblad={reopenedLindblad} /></div>
          <div hidden={tab !== "sweep"||activeModel==="two_level"||activeModel==="ising_chain"}><SweepLab bridge={window.quantum} status={status}
            selectedModel={activeModel!=="two_level"&&activeModel!=="ising_chain"&&tabForMode(activeModel,"sweeps")?activeModel as EvolutionModelId:undefined}
            onModelChange={setActiveModel} restored={restored?.snapshot.sweep} restoreEpoch={restored?.epoch} onSnapshot={collectSweep} onSweepContext={collectSweepContext} reopenedSweep={reopenedSweep} /></div>
          <div hidden={tab!=="sweep"||activeModel!=="two_level"}><SpectrumStudyLab bridge={window.quantum} status={status}
            restored={restored?.snapshot.spectrumStudy} restoreEpoch={restored?.epoch} onSnapshot={collectSpectrumStudy}
            onOpenPoint={openSavedSpectrum}
            onDraftPoint={(delta,omega)=>{setParameters({delta:String(delta),omega:String(omega)});
              setResult(null);setResultMode(null);setComparison(null);setSelection(null);setTab("spectrum");}}/></div>
          <div hidden={tab!=="sweep"||activeModel!=="ising_chain"}><IsingStudyLab bridge={window.quantum} status={status}
            restored={restored?.snapshot.isingStudy} restoreEpoch={restored?.epoch} onSnapshot={collectIsingStudy}
            onOpenPoint={openSavedManyBody}/></div>
          <div hidden={tab !== "many_body"}><ManyBodyLab bridge={window.quantum} status={status} restored={restored?.snapshot.manyBody} restoreEpoch={restored?.epoch} atlasDraft={atlasManyBody?.draft} atlasEpoch={atlasManyBody?.epoch} onSnapshot={collectManyBody} onManyBodyContext={collectManyBodyContext} reopenedManyBody={reopenedManyBody} /></div>
          <div hidden={tab!=="ising_quench"}><IsingQuenchLab bridge={window.quantum} status={status} preferredRunId={manyBodyContext?.result.runId??null}
            restored={restored?.snapshot.isingQuench} restoreEpoch={restored?.epoch} onSnapshot={collectIsingQuench}/></div>
          <div hidden={tab !== "topology"}><TopologyLab bridge={window.quantum} status={status} restored={restored?.snapshot.topology} restoreEpoch={restored?.epoch} atlasDraft={atlasTopology?.draft} atlasEpoch={atlasTopology?.epoch} onSnapshot={collectTopology} onTopologyContext={collectTopologyContext} reopenedRun={reopenedTopology} /></div>
          <div hidden={tab !== "orbital"}><OrbitalLab bridge={window.quantum} status={status} restored={restored?.snapshot.orbital} restoreEpoch={restored?.epoch} onSnapshot={collectOrbital} onOrbitalContext={collectOrbitalContext} reopenedRun={reopenedOrbital}/></div>
          <div hidden={tab !== "circuit"}><CircuitLab bridge={window.quantum} status={status} restored={restored?.snapshot.circuit} restoreEpoch={restored?.epoch} onSnapshot={collectCircuit} onCircuitContext={collectCircuitContext} reopenedCircuit={reopenedCircuit} /></div>
          <div hidden={tab !== "oscillator"}><OscillatorLab bridge={window.quantum} status={status} restored={restored?.snapshot.oscillator} restoreEpoch={restored?.epoch} atlasDraft={atlasOscillator?.draft} atlasEpoch={atlasOscillator?.epoch} onSnapshot={collectOscillator} restoredMotion={restored?.snapshot.oscillatorDynamics} onMotionSnapshot={collectOscillatorDynamics} restoredMode={restored?.snapshot.oscillatorMode} onModeSnapshot={collectOscillatorMode} restoredDriven={restored?.snapshot.oscillatorDriven} onDrivenSnapshot={collectOscillatorDriven} atlasDrivenDraft={atlasDriven?.draft} atlasDrivenEpoch={atlasDriven?.epoch} restoredPulse={restored?.snapshot.oscillatorPulse} onPulseSnapshot={collectOscillatorPulse} restoredDamped={restored?.snapshot.oscillatorDamped} onDampedSnapshot={collectOscillatorDamped} restoredParametric={restored?.snapshot.oscillatorParametric} onParametricSnapshot={collectOscillatorParametric} restoredAnharmonic={restored?.snapshot.oscillatorAnharmonic} onAnharmonicSnapshot={collectOscillatorAnharmonic} onOscillatorContext={collectOscillatorContext} reopenedRun={reopenedOscillator}/></div>
          {tab === "theory" ? <TheoryPanel model={activeModel} /> : tab === "scenes" ? <SceneLab bridge={window.quantum} launch={sceneLaunch} /> : tab === "atlas" ? <AtlasPanel openLab={openAtlasBinding} /> : tab === "presets" ? <PresetPanel open={openPreset} /> : tab === "runs" ? <RunHistory bridge={window.quantum} onOpenSpectrum={openSavedSpectrum} onOpenEvolution={openSavedEvolution} onOpenCavity={openSavedCavity} onOpenLindblad={openSavedLindblad} onOpenCircuit={openSavedCircuit} onOpenManyBody={openSavedManyBody} onOpenSweep={openSavedSweep} onOpenTopology={openSavedTopology} onOpenOrbital={openSavedOrbital} onOpenOscillator={openSavedOscillator} onAnalyze={()=>setTab("hamiltonian")} onViewScene={viewSavedScene} /> : tab === "backend" ? (
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
          ) : tab==="hamiltonian"&&activeModel!=="two_level"?<RunComparisonPanel bridge={window.quantum} onChangePins={()=>setTab("runs")}/> : tab === "oscillator" || tab === "orbital" || tab === "dynamics" || tab === "ising_quench" || tab === "cavity" || tab === "open" || tab === "sweep" || tab === "many_body" || tab === "circuit" || tab === "topology" ? null : (
            <>
              {tab==="hamiltonian"&&<RunComparisonPanel bridge={window.quantum} onChangePins={()=>setTab("runs")}/>}
              <section className="hamiltonian-card">
                <div>
                  <p className="eyebrow">
                    {tab === "hamiltonian"
                      ? "CURRENT PARAMETER DRAFT"
                      : "THE MODEL"}
                  </p>
                  <div className="formula">
                    H ={" "}
                    <button type="button" className="formula-target fraction" aria-label="Select detuning Delta"
                      aria-pressed={currentSelection?.kind==="parameter"&&currentSelection.key==="delta"}
                      onClick={()=>{chooseSelection({kind:"parameter",model:"two_level",key:"delta"});document.getElementById("delta")?.focus();}}>
                      <span>Δ</span>
                      <span>2</span>
                    </button>{" "}
                    <button type="button" className="formula-target" aria-label="Select sigma z operator"
                      aria-pressed={currentSelection?.kind==="operator"&&currentSelection.key==="sigma_z"}
                      onClick={()=>chooseSelection({kind:"operator",model:"two_level",key:"sigma_z"})}>σ<sub>z</sub></button> +{" "}
                    <button type="button" className="formula-target fraction" aria-label="Select transverse coupling Omega"
                      aria-pressed={currentSelection?.kind==="parameter"&&currentSelection.key==="omega"}
                      onClick={()=>{chooseSelection({kind:"parameter",model:"two_level",key:"omega"});document.getElementById("omega")?.focus();}}>
                      <span>Ω</span>
                      <span>2</span>
                    </button>{" "}
                    <button type="button" className="formula-target" aria-label="Select sigma x operator"
                      aria-pressed={currentSelection?.kind==="operator"&&currentSelection.key==="sigma_x"}
                      onClick={()=>chooseSelection({kind:"operator",model:"two_level",key:"sigma_x"})}>σ<sub>x</sub></button>
                  </div>
                </div>
                <div className="model-convention">
                  <span>TIME-INDEPENDENT</span>
                  <p>Hermitian · ħ = 1</p>
                  <small>Ω is a static transverse coupling</small>
                </div>
              </section>
              {currentSelection&&<ScientificSelectionPanel selection={currentSelection} result={result} draft={parameters}/>}
              {tab === "hamiltonian" ? (
                <section className="panel matrix-panel">
                  <p className="eyebrow">
                    MATRIX REPRESENTATION / COMPUTATIONAL BASIS
                  </p>
                  <h2>Every term, explicit.</h2>
                  <div className="matrix">
                    <span className={currentSelection?.kind==="operator"&&currentSelection.key==="sigma_z"?"matrix-selected":""}>{valid ? format(Number(delta) / 2) : "—"}</span>
                    <span className={currentSelection?.kind==="operator"&&currentSelection.key==="sigma_x"?"matrix-selected":""}>{valid ? format(Number(omega) / 2) : "—"}</span>
                    <span className={currentSelection?.kind==="operator"&&currentSelection.key==="sigma_x"?"matrix-selected":""}>{valid ? format(Number(omega) / 2) : "—"}</span>
                    <span className={currentSelection?.kind==="operator"&&currentSelection.key==="sigma_z"?"matrix-selected":""}>{valid ? format(-Number(delta) / 2) : "—"}</span>
                  </div>
                  <p>
                    Diagonal terms set the detuning. Off-diagonal terms couple
                    |0⟩ and |1⟩. This matrix follows the editable draft; the
                    linked state panel below shows the immutable run matrix.
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
                      <Spectrum result={result}
                        selectedLevel={currentSelection?.kind==="energy"?currentSelection.level:null}
                        onSelectLevel={level=>chooseSelection({kind:"energy",model:"two_level",runId:result.runId,level})}/>
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
                    <section className={currentSelection?.kind==="energy"&&currentSelection.level===0?"selected-energy":""}>
                      <p className="eyebrow">LOWER ENERGY / E₋</p>
                      <strong className="mint" data-testid="energy-low">
                        {result ? format(result.spectrum.eigenvalues[0]) : "—"}
                      </strong>
                      <small>normalized energy</small>
                    </section>
                    <section className={currentSelection?.kind==="energy"&&currentSelection.level===1?"selected-energy":""}>
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
              <TwoLevelStateView result={result} stale={!!stale}
                selectedLevel={currentSelection?.kind==="energy"?currentSelection.level:null}
                onSelectLevel={level=>{if(result)chooseSelection({kind:"energy",model:"two_level",runId:result.runId,level});}}/>
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
          <SelectionReferenceCard reference={selectionReference} result={selectionResult}/>
          <ObservableWorkspace view={observableView}/>
          {tab==="dynamics"?<EvolutionRunInspector context={evolutionContext} modelId={evolutionModel}/>:tab==="ising_quench"?<div><p className="eyebrow">QVIS-020 / DYNAMICS</p><h2>Finite-chain quench</h2><p>Choose a verified saved Ising run in the main workspace. The time cursor then selects only its quench artifact's recorded site magnetizations, norm and target energy.</p><p>No evolving state vector is persisted.</p></div>:tab==="cavity"?<CavityRunInspector context={cavityContext} modelId={cavityModel}/>:tab==="open"?<LindbladRunInspector context={lindbladContext}/>:tab==="circuit"?<CircuitRunInspector context={circuitContext}/>:tab==="many_body"?<ManyBodyRunInspector context={manyBodyContext}/>:tab==="sweep"&&activeModel==="ising_chain"?<div><p className="eyebrow">ISING STUDY</p><h2>Saved point runs</h2><p>Select any plotted point to inspect its recorded values. Open it to see the verified Ising-run inspector and provenance.</p><p>Mean magnetization is derived only from saved site values. Fidelity and full state vectors are unavailable.</p></div>:tab==="sweep"&&activeModel!=="two_level"?<SweepRunInspector context={sweepContext} modelId={activeModel as EvolutionModelId}/>:tab==="topology"?<TopologyRunInspector context={topologyContext}/>:tab==="orbital"?<OrbitalRunInspector context={orbitalContext}/>:tab==="oscillator"?<OscillatorRunInspector context={oscillatorContext}/>:<>
          <p className="eyebrow">MODEL INSPECTOR</p>
          <h2>{inspectorTab==="parameters"?"Parameters":inspectorTab==="observables"?"Observables":"Provenance"}</h2>
          <nav className="inspector-tabs" aria-label="Model inspector views">
            {(["parameters","observables","provenance"] as const).map(view=><button key={view} type="button"
              aria-current={inspectorTab===view?"page":undefined} onClick={()=>setInspectorTab(view)}>{view[0].toUpperCase()+view.slice(1)}</button>)}
          </nav>
          <div hidden={inspectorTab!=="parameters"}>
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
                className={currentSelection?.kind==="parameter"&&currentSelection.key===definition.key?"selected-parameter":""}
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
              {spectrumSliderValue(parameters[definition.key])!==null?
                <input id={`${definition.key}-slider`} className="spectrum-parameter-slider"
                  type="range" min={-10} max={10} step="any"
                  aria-label={`${definition.label} coarse slider, minus ten to ten`}
                  value={spectrumSliderValue(parameters[definition.key])!}
                  onChange={event=>setParameters(current=>({...current,[definition.key]:event.target.value}))}/>
                :<small className="slider-unavailable">Coarse slider available for exact values from −10 to 10; this draft is not clamped.</small>}
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
          </div>
          <div hidden={inspectorTab!=="observables"} className="inspector-observables" data-testid="observable-inspector">
            {result? <>
              <p className="inspector-intro">Verified run <code>{result.runId}</code></p>
              <div className="key-value"><span>Δ · run input</span><strong>{format(result.model.parameters.delta)}</strong></div>
              <div className="key-value"><span>Ω · run input</span><strong>{format(result.model.parameters.omega)}</strong></div>
              <div className="key-value"><span>Gap · E₊ − E₋</span><strong>{format(result.spectrum.eigenvalues[1]-result.spectrum.eigenvalues[0])}</strong></div>
              <div className="inspector-levels" aria-label="Select eigenstate">
                {([0,1] as const).map(level=><button type="button" key={level}
                  aria-pressed={currentSelection?.kind==="energy"&&currentSelection.level===level}
                  onClick={()=>chooseSelection({kind:"energy",model:"two_level",runId:result.runId,level})}>
                  {level===0?"E₋":"E₊"} · {format(result.spectrum.eigenvalues[level])}</button>)}
              </div>
              {!result.stateAnalysis?<p>Energy-only saved result: eigenstate diagnostics were not recorded.</p>
                :result.stateAnalysis.status==="degenerate"?<p>Degenerate or near-degenerate: no unique eigenstate or Bloch vector is claimed. Threshold {result.stateAnalysis.threshold.toExponential(2)}.</p>
                :(()=>{const state=result.stateAnalysis.states[currentSelection?.kind==="energy"?currentSelection.level:0];return <div className="inspector-section">
                  <p className="eyebrow">{currentSelection?.kind==="energy"&&currentSelection.level===1?"UPPER":"LOWER"} EIGENSTATE · |0⟩, |1⟩ BASIS</p>
                  <div className="key-value"><span>Amplitudes</span><strong>{format(state.amplitudes[0])}, {format(state.amplitudes[1])}</strong></div>
                  <div className="key-value"><span>Populations P₀ / P₁</span><strong>{format(state.populations[0])} / {format(state.populations[1])}</strong></div>
                  <div className="key-value"><span>⟨σx⟩ / ⟨σy⟩ / ⟨σz⟩</span><strong>{format(state.bloch.x)} / {format(state.bloch.y)} / {format(state.bloch.z)}</strong></div>
                  <div className="key-value"><span>‖Hψ − Eψ‖</span><strong>{state.residualNorm.toExponential(2)}</strong></div>
                  <small>Real amplitudes; first nonzero coefficient positive. Residual and observables are independently checked before saving.</small>
                </div>;})()}
            </>:<p>No verified spectrum run yet.</p>}
          </div>
          <div hidden={inspectorTab!=="provenance"}>
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
                <div className="key-value"><span>Engine</span><strong>{result.engine.name} {result.engine.version}</strong></div>
                <div className="key-value"><span>Δ / Ω · stored</span><strong>{result.model.parameters.delta} / {result.model.parameters.omega}</strong></div>
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
          </div>
          </>}
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
