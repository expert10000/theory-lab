import React, { useEffect, useState } from "react";
import type { QuantumBridge, TopologyResult } from "../../../packages/contracts";
import type { QwzPhaseDiagram, QwzPhasePoint } from "../../../packages/contracts/qwz-phase-diagram";

const color = (point?: QwzPhasePoint) => !point ? "#26333e" : point.gapClosed ? "#bd8042" :
  !point.meshResolved ? "#596574" : point.chern === 0 ? "#679aa8" :
  point.chern === 1 ? "#75c9a5" : point.chern === -1 ? "#ba80bc" : "#d2b87a";

export function QwzPhaseDiagramPanel({ bridge, onOpenRun, onViewScene }: {
  bridge: QuantumBridge; onOpenRun: (result: TopologyResult) => Promise<void>;
  onViewScene: (runId: string, view: "standard" | "bands") => void;
}) {
  const [map, setMap] = useState<QwzPhaseDiagram | null>(null);
  const [selected, setSelected] = useState<QwzPhasePoint | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; void bridge.listQwzPhaseDiagrams().then(async list => {
    if (active && list[0]) setMap(await bridge.getQwzPhaseDiagram(list[0].studyId));
  }).catch(error => { if (active) setMessage(String((error as Error).message)); });
    return () => { active = false; };
  }, [bridge]);
  async function build() {
    setBusy(true); setMessage("Verifying saved QWZ runs…");
    try { const next = await bridge.buildQwzPhaseDiagram(); setMap(next); setSelected(null);
      setMessage(`Saved ${next.points.length} exact source cells.`); }
    catch (error) { setMessage(String((error as Error).message)); }
    finally { setBusy(false); }
  }
  async function open(point: QwzPhasePoint, view?: "standard" | "bands") {
    if (!map) return;
    setBusy(true);
    try {
      const exact = await bridge.openQwzPhasePoint(map.studyId, point.mass, point.grid);
      if (exact.point.runId !== point.runId || exact.point.resultSha256 !== point.resultSha256)
        throw new Error("Phase cell source changed");
      setSelected(exact.point);
      if (view) onViewScene(exact.point.runId, view);
      else await onOpenRun(exact.result);
      setMessage(`Verified ${exact.point.runId} · ${exact.point.resultSha256.slice(0, 12)}…`);
    } catch (error) { setMessage(`Phase point refused: ${String((error as Error).message)}`); }
    finally { setBusy(false); }
  }
  return <section className="panel cavity-result" data-testid="qwz-phase-diagram">
    <div className="panel-heading"><div><p className="eyebrow">VERIFIED QWZ PARAMETER STUDY</p><h2>Mass, mesh and Chern</h2></div>
      <button type="button" data-testid="build-qwz-phase-diagram" disabled={busy} onClick={() => void build()}>Build from saved QWZ runs</button></div>
    <p>Each cell points to one immutable run. Horizontal mass is the physical parameter; vertical grid size shows numerical resolution. Missing combinations remain empty. A closed gap or unresolved mesh has no assigned Chern number.</p>
    {map && <><div style={{ display: "grid", gridTemplateColumns: `90px repeat(${map.axes.mass.length}, minmax(48px,1fr))`, gap: 4, maxWidth: 900 }}>
      <span>grid ↓ / mass →</span>{map.axes.mass.map(mass => <strong key={mass} style={{ textAlign: "center" }}>{mass}</strong>)}
      {map.axes.grid.flatMap(grid => [<strong key={`grid-${grid}`}>{grid} × {grid}</strong>,
        ...map.axes.mass.map(mass => { const point = map.points.find(item => item.mass === mass && item.grid === grid);
          return <button key={`${grid}:${mass}`} type="button" data-testid={`qwz-phase-cell-${grid}-${mass}`}
            disabled={!point || busy} aria-label={point ? `Mass ${mass}, grid ${grid}, Chern ${point.chern ?? "unresolved"}` : `No run at mass ${mass}, grid ${grid}`}
            aria-pressed={selected?.runId === point?.runId} title={point ? `${point.runId} · gap ${point.bulkGap.toFixed(5)}` : "No saved run"}
            style={{ minHeight: 42, border: selected?.runId === point?.runId ? "2px solid white" : "1px solid #405363",
              background: color(point), color: "#10151d", fontWeight: 700 }} onClick={() => point && void open(point)}>{point ? point.chern ?? "?" : "—"}</button>; })])}
    </div><p>Map {map.studyId} · {map.points.length} source runs · newest run for duplicate mass/grid cells.</p></>}
    {selected && <div data-testid="qwz-phase-selection"><strong>Mass {selected.mass} · grid {selected.grid} · gap {selected.bulkGap.toFixed(6)} · Chern {selected.chern ?? "unresolved"}</strong>
      <p>Run {selected.runId} · result SHA-256 {selected.resultSha256}</p>
      <button type="button" disabled={busy} onClick={() => void open(selected, "standard")}>View curvature scene</button>{" "}
      <button type="button" disabled={busy} onClick={() => void open(selected, "bands")}>View bands scene</button></div>}
    {message && <p role="status" data-testid="qwz-phase-message">{message}</p>}
  </section>;
}
