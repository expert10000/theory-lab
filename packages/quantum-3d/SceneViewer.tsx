import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { verifyScenePayload, type ScenePayload, type Vec3 } from "../quantum-scene";
import { scalarColor, scalarRange } from "./scalarColor";
import { phaseColor } from "./fields";
import { BandInspection } from "./BandInspection";
import { TopologyInspection } from "./TopologyInspection";

// Shared renderer consumes declarative scenes only. No worker, filesystem or IPC.
export async function browserSceneDigest(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer);
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, "0")).join("");
}
type View = { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera;
  groups: Map<string, THREE.Object3D>; marker: THREE.Mesh; render: () => void; reset: () => void };

export function SceneViewer({ payload }: { payload: ScenePayload }) {
  const [ready, setReady] = useState<{ payload: ScenePayload; arrays: Map<string, Float64Array> } | null>(null);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);
  const primaryId = () => (payload.scene.objects.find(o => o.scalars) ?? payload.scene.objects[0])?.id ?? "";
  const [selected, setSelected] = useState(primaryId);
  const [index, setIndex] = useState(0);
  const initialHidden = () => new Set(payload.scene.objects.filter(o => !o.visible).map(o => o.id));
  const [hidden, setHidden] = useState<Set<string>>(initialHidden);
  const mount = useRef<HTMLDivElement>(null);
  const view = useRef<View | null>(null);
  useEffect(() => {
    let alive = true; setReady(null); setError("");
    setSelected(primaryId()); setIndex(0); setHidden(initialHidden());
    void verifyScenePayload(payload, browserSceneDigest).then(arrays => {
      if (alive) setReady({ payload, arrays });
    }).catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => { alive = false; };
  }, [payload]);

  useEffect(() => {
    const host = mount.current;
    if (!host || !ready || ready.payload !== payload) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch { setFallback(true); return; }
    setFallback(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#0d161e");
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const light = new THREE.DirectionalLight(0xffffff, 2.0);
    light.position.set(4, -3, 5); scene.add(light);
    const camera = new THREE.PerspectiveCamera(42, 1, .001, 10000000);
    camera.up.fromArray(payload.scene.camera.up);
    const controls = new OrbitControls(camera, renderer.domElement);
    const reset = () => { camera.position.fromArray(payload.scene.camera.position); controls.target.fromArray(payload.scene.camera.target); controls.update(); };
    reset();
    const groups = new Map<string, THREE.Object3D>();
    for (const o of payload.scene.objects) {
      const positions = ready.arrays.get(o.positions)!;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      if (o.indices) geometry.setIndex([...ready.arrays.get(o.indices)!]);
      if (o.scalars) {
        const scalar = ready.arrays.get(o.scalars)!;
        const [low, high] = scalarRange(scalar);
        const colors: number[] = [];
        for (const v of scalar) { const c = new THREE.Color().setRGB(...(o.colorMap==="phase"?phaseColor(v):scalarColor(v, low, high)), THREE.SRGBColorSpace); colors.push(c.r, c.g, c.b); }
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      }
      const style = { color: o.scalars ? "#ffffff" : o.style.color, opacity: o.style.opacity, transparent: o.style.opacity < 1, vertexColors: !!o.scalars };
      let object: THREE.Object3D;
      if (o.kind === "mesh") {
        geometry.computeVertexNormals();
        object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ ...style, side: THREE.DoubleSide, roughness: .8, metalness: 0 }));
      }
      else if (o.kind === "point-cloud") object = new THREE.Points(geometry, new THREE.PointsMaterial({ ...style, size: o.style.size }));
      else if (o.kind === "polyline") object = new THREE.Line(geometry, new THREE.LineBasicMaterial(style));
      else if (o.kind === "segments") object = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial(style));
      else {
        // Batched line segments bound GPU objects even for large vector fields.
        const vectors = ready.arrays.get(o.values!)!;
        const segments: number[] = [];
        const colors: number[] = [];
        const vectorSamples: number[] = [];
        for (let i = 0; i < positions.length; i += 3) {
          const p = new THREE.Vector3().fromArray(positions, i), v = new THREE.Vector3().fromArray(vectors, i);
          const end = p.clone().add(v), length = v.length();
          segments.push(...p.toArray(), ...end.toArray());
          vectorSamples.push(i / 3, i / 3);
          if (length > 1e-12) {
            const dir = v.clone().normalize(), side = new THREE.Vector3().crossVectors(dir, Math.abs(dir.z) < .9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)).normalize();
            const base = end.clone().addScaledVector(dir, -length * .15);
            segments.push(...end.toArray(), ...base.clone().addScaledVector(side, length * .06).toArray(), ...end.toArray(), ...base.clone().addScaledVector(side, -length * .06).toArray());
            vectorSamples.push(i / 3, i / 3, i / 3, i / 3);
          }
          if (o.scalars) {
            const color = new THREE.Color().fromArray(geometry.getAttribute("color").array, i);
            const count = length > 1e-12 ? 6 : 2;
            for (let j = 0; j < count; j++) colors.push(color.r, color.g, color.b);
          }
        }
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(segments, 3));
        if (o.scalars) geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        object = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial(style));
        object.userData.vectorSamples = vectorSamples;
      }
      object.visible = o.visible; object.userData.sceneId = o.id; scene.add(object); groups.set(o.id, object);
    }
    const span = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3()).length();
    const marker = new THREE.Mesh(new THREE.SphereGeometry(Math.max(.025, span * .008), 12, 8), new THREE.MeshBasicMaterial({ color: "#ffdfa8", depthTest: false, transparent: true, opacity: .5 }));
    marker.renderOrder = 10; marker.visible = false; scene.add(marker);
    const labels = payload.scene.annotations.map(a => {
      const element = document.createElement("span"); element.className = "scene-label"; element.textContent = a.text;
      host.appendChild(element); return { element, position: new THREE.Vector3().fromArray(a.position) };
    });
    host.appendChild(renderer.domElement);
    function render() {
      renderer.render(scene, camera);
      for (const label of labels) {
        const projected = label.position.clone().project(camera);
        label.element.hidden = projected.z < -1 || projected.z > 1;
        label.element.style.left = `${(projected.x + 1) * host!.clientWidth / 2}px`;
        label.element.style.top = `${(1 - projected.y) * host!.clientHeight / 2}px`;
      }
    }
    const resize = () => {
      const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); render();
    };
    controls.addEventListener("change", render);
    const observer = new ResizeObserver(resize); observer.observe(host);
    const raycaster = new THREE.Raycaster(); raycaster.params.Points.threshold = Math.max(.1, span * .01);
    raycaster.params.Line.threshold = Math.max(.05, span * .005);
    const pick = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera);
      const hit = raycaster.intersectObjects([...groups.values()].filter(o => o.visible), false)[0];
      if (!hit) return;
      const id = hit.object.userData.sceneId as string;
      const definition = payload.scene.objects.find(o => o.id === id)!;
      setSelected(id); setIndex(definition.kind === "vectors" ? hit.object.userData.vectorSamples[hit.index ?? 0] : hit.face?.a ?? hit.index ?? 0);
    };
    renderer.domElement.addEventListener("pointerdown", pick);
    view.current = { renderer, scene, camera, groups, marker, render, reset }; resize();
    return () => {
      view.current = null; observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pick);
      scene.traverse(o => {
        if ("geometry" in o && o.geometry instanceof THREE.BufferGeometry) o.geometry.dispose();
        if ("material" in o) for (const material of Array.isArray(o.material) ? o.material : [o.material]) if (material instanceof THREE.Material) material.dispose();
      });
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
      for (const l of labels) l.element.remove();
    };
  }, [ready, payload]);

  const object = payload.scene.objects.find(o => o.id === selected);
  const values = ready?.payload === payload && object ? ready.arrays.get(object.positions) : undefined;
  const count = values ? values.length / 3 : 0;
  const safeIndex = Math.max(0, Math.min(index, count - 1));
  const point: Vec3 | null = values ? [values[safeIndex * 3], values[safeIndex * 3 + 1], values[safeIndex * 3 + 2]] : null;
  const scalar = object?.scalars && ready?.payload === payload ? ready.arrays.get(object.scalars)?.[safeIndex] : undefined;
  const scalarValues = object?.scalars && ready?.payload === payload ? ready.arrays.get(object.scalars) : undefined;
  const range = scalarValues ? scalarRange(scalarValues) : null;
  const lattice = payload.scene.lattice;
  const siteCell = lattice && object?.positions === lattice.sites && ready?.payload === payload ? [...ready.arrays.get(lattice.cells)!.slice(safeIndex*3,safeIndex*3+3)] : null;
  const siteBasis = siteCell ? ready!.arrays.get(lattice!.basisIndices)![safeIndex] : null;
  const reciprocal=ready?.payload===payload?payload.scene.reciprocal:undefined;
  const path=reciprocal?.paths.find(p=>p.object===selected);
  const kPoint=reciprocal && (selected===reciprocal.pointObject ? reciprocal.points[safeIndex] : path ? reciprocal.points.find(p=>p.id===path.points[safeIndex]) : undefined);
  useEffect(() => {
    const current = view.current;
    if (!current) return;
    for (const o of payload.scene.objects) current.groups.get(o.id)!.visible = !hidden.has(o.id);
    current.marker.visible = !!point && !hidden.has(selected);
    if (point) current.marker.position.fromArray(point);
    current.render();
  }, [ready, payload, selected, index, hidden]);
  return <section className="scene-viewer" data-testid="scene-viewer">
    {error ? <p role="alert">{error}</p> : <>
      <div className="scene-toolbar"><span data-testid="scene-verification">{ready?.payload === payload ? "SHA-256 VERIFIED" : "Verifying artifacts…"}</span>
        <button type="button" onClick={() => { view.current?.reset(); view.current?.render(); }}>Reset camera</button>
        <small>Drag to orbit · wheel to zoom · right-drag to pan · click to inspect</small></div>
      <div ref={mount} className="scene-canvas" data-testid="scene-canvas" aria-label={`${payload.scene.title} three-dimensional scene`}>
        {fallback && <p className="scene-fallback">WebGL unavailable. Verified numerical inspection remains available below.</p>}
      </div>
      <div className="scene-inspection">
        {ready?.payload===payload && payload.scene.topology && <TopologyInspection topology={payload.scene.topology} arrays={ready.arrays} selected={selected} index={safeIndex} onSelect={id=>{setSelected(id);setIndex(0);}} unit={id=>payload.scene.datasets.find(d=>d.id===id)!.unit}/>}
        {ready?.payload===payload && payload.scene.bands && <BandInspection bands={payload.scene.bands} kUnit={payload.scene.datasets.find(d=>d.id===payload.scene.bands!.coordinates)!.unit} arrays={ready.arrays} selected={selected} index={safeIndex} onSelect={(id,i)=>{setSelected(id);setIndex(i);}}/>}
        {reciprocal && <div className="reciprocal-inspection" data-testid="reciprocal-inspection">
          <h3>Primitive reciprocal-space inspection</h3>
          <div className="scene-run-controls">
            <label>Named k-point<select aria-label="Reciprocal point" value={selected===reciprocal.pointObject?reciprocal.points[safeIndex]?.id??"":""} onChange={e=>{setSelected(reciprocal.pointObject);setIndex(reciprocal.points.findIndex(p=>p.id===e.target.value));}}>
              <option value="" disabled>Choose a supplied point</option>{reciprocal.points.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
            </select></label>
            <label>Supplied symmetry path<select aria-label="Reciprocal path" value={path?.object??""} onChange={e=>{setSelected(e.target.value);setIndex(0);}}>
              <option value="" disabled>Choose a supplied path</option>{reciprocal.paths.map(p=><option key={p.object} value={p.object}>{p.label}</option>)}
            </select></label>
          </div>
          <p data-testid="reciprocal-point-value">{kPoint?`${kPoint.label} · k = (${kPoint.position.map(v=>v.toPrecision(7)).join(", ")}) ${reciprocal.reciprocalUnit}`:"Select a named point or inspect a path vertex; no nearest-point inference."}</p>
          <details><summary>Explicit dual bases and convention</summary>
            {reciprocal.directBasis.map((a,i)=><p key={i}>a{i+1}=({a.map(v=>v.toPrecision(6)).join(", ")}) {reciprocal.directUnit}; b{i+1}=({reciprocal.basis[i].map(v=>v.toPrecision(6)).join(", ")}) {reciprocal.reciprocalUnit}</p>)}
            <p>Checked aᵢ·bⱼ = 2πδᵢⱼ. Boundaries and point labels are supplied for this primitive lattice, not an arbitrary-crystal Wigner–Seitz construction. Repeat counts do not fold this primitive zone; no automatic real/reciprocal selection mapping.</p>
          </details>
        </div>}
        <label>Inspect object <select aria-label="Inspect scene object" value={selected} onChange={e => { setSelected(e.target.value); setIndex(0); }}>{payload.scene.objects.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
        <label>Sample / vertex {safeIndex + 1} / {count}<input aria-label="Scene sample" type="range" min={0} max={Math.max(0, count - 1)} value={safeIndex} disabled={!count} onChange={e => setIndex(Number(e.target.value))} /></label>
        <div data-testid="scene-coordinate">{point && point.map((v, i) => <span key={i}>{payload.scene.coordinates.axes[i]} = {v.toPrecision(7)} {payload.scene.coordinates.units[i]}<br /></span>)}
          {scalar !== undefined && <span>Scalar = {scalar.toPrecision(7)} {payload.scene.datasets.find(d => d.id === object?.scalars)?.unit}</span>}</div>
        {siteCell && <p data-testid="lattice-site-inspection">Site c({siteCell.join(",")})/b{siteBasis} · basis {lattice!.basis[siteBasis!].label} · open supercell {lattice!.repeats.join("×")}</p>}
      </div>
      {range && <div className="scene-scale" aria-label="Selected object color scale"><span>{object?.colorMap==="phase"?"−π":range[0].toPrecision(5)}</span><span className={`scene-scale-gradient ${object?.colorMap==="phase"?"phase-gradient":""}`} /><span>{object?.colorMap==="phase"?"+π (cyclic)":range[1].toPrecision(5)} {payload.scene.datasets.find(d => d.id === object?.scalars)?.unit}</span>{range[0] === range[1] && <small>Constant field</small>}</div>}
      <fieldset className="scene-visibility"><legend>Object visibility</legend>{payload.scene.objects.map(o => <label key={o.id}><input type="checkbox" checked={!hidden.has(o.id)} onChange={e => setHidden(current => { const next = new Set(current); if (e.target.checked) next.delete(o.id); else next.add(o.id); return next; })} />{o.label}</label>)}</fieldset>
      <p className="scene-axis-note">Right-handed axes: {payload.scene.coordinates.axes.join(" / ")} · Coordinates are inspected from Float64 data; GPU rendering uses Float32.</p>
      <ul className="scene-annotations">{payload.scene.annotations.map(a => <li key={a.id}>{a.text}</li>)}</ul>
    </>}
  </section>;
}
