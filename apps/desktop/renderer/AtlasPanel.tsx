import React, { useEffect,useMemo, useState } from "react";
import { ATLAS_ENTRIES, ATLAS_REVISION, atlasEntry, atlasUrl } from "../../../packages/atlas";
import { atlasBinding } from "../../../packages/atlas/bindings";
import {atlasDeepLinkCapabilities} from "../../../packages/atlas/deep-link";
import { AtlasCapabilities } from "../../../packages/ui/AtlasCapabilities";

export function AtlasPanel({ openLab,onRun,onSweep,runReady=false,availableOperations=[],running=false,message,focus }:
  {openLab?:(id:string)=>void;onRun?:(id:string)=>void;onSweep?:(id:string)=>void;
    runReady?:boolean;availableOperations?:readonly string[];running?:boolean;message?:{id:string;text:string}|null;focus?:{id:string;nonce:number}|null}) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const [selectedId, setSelectedId] = useState("two_level_pauli");
  useEffect(()=>{if(focus&&atlasEntry(focus.id)){setSelectedId(focus.id);setFamily("all");setQuery("");}},[focus?.nonce]);
  const filtered = useMemo(() => ATLAS_ENTRIES.filter(entry => (family === "all" || entry.family === family) &&
    `${entry.id} ${entry.name} ${entry.presentation.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query, family]);
  const selected = atlasEntry(selectedId);
  const binding = atlasBinding(selectedId);
  const actions=atlasDeepLinkCapabilities(selectedId);
  const operation=binding?.kind==="spectrum"?"diagonalize":binding?.kind==="dynamics"?"evolve":
    binding?.kind==="cavity"?"cavity":binding?.kind==="topology"?"topology":null;
  const canRun=runReady&&!!operation&&availableOperations.includes(operation);
  return <div className="atlas-panel" data-testid="atlas-panel">
    <section className="panel"><p className="eyebrow">THEORY ATLAS / PINNED SOURCE · R1</p><h2>{ATLAS_ENTRIES.length} Hamiltonians, one inspected revision.</h2>
      <p>Source revision <code>{ATLAS_REVISION.slice(0, 12)}</code>. Reference definitions, theory examples and tested Lab bindings are separate capabilities. A source example never enables a Lab Run action.</p>
      <div className="atlas-controls"><input aria-label="Search Atlas" placeholder="Search Hamiltonians" value={query} onChange={event => setQuery(event.target.value)}/>
        <select aria-label="Atlas family" value={family} onChange={event => setFamily(event.target.value)}><option value="all">All families</option>{[...new Set(ATLAS_ENTRIES.map(entry => entry.family))].sort().map(name => <option key={name} value={name}>{name}</option>)}</select></div>
      <div className="atlas-browser"><div className="atlas-list" role="list" aria-label="Atlas entries">{filtered.map(entry => <button key={entry.id} className={selectedId === entry.id ? "atlas-active" : ""} onClick={() => setSelectedId(entry.id)}><strong>{entry.name}</strong><small>{entry.id} · {entry.family}</small></button>)}</div>
        {selected && <article className="atlas-detail"><p className="eyebrow">{selected.family.toUpperCase()} / REFERENCE ONLY</p><h3>{selected.name}</h3><p>{selected.presentation.summary}</p>
          <code className="atlas-formula">{selected.formula.latex}</code><p><strong>Basis:</strong> {selected.basis.description}</p>
          <h4>Parameters</h4><div className="atlas-parameters">{selected.parameters.map(parameter => <div key={parameter.symbol}><code>{parameter.symbol}</code><span>{parameter.name} · {parameter.unit_convention}</span><small>default {String(parameter.default)}</small></div>)}</div>
          <h4>Assumptions & limits</h4><p>{selected.assumptions.join(" · ") || "Not specified"}</p>{selected.important_limits.map((limit, index) => <p key={index}><strong>{limit.condition}</strong> → {limit.result}</p>)}
          <h4>Observables</h4><p>{selected.observables.join(" · ")}</p>
          {selected.relations.length > 0 && <><h4>Related entries</h4><div className="atlas-relations">{selected.relations.map((relation, index) => <button key={index} onClick={() => { setSelectedId(relation.target); setFamily("all"); setQuery(""); }}>{relation.target} ↗</button>)}</div></>}
          <p><button className="text-button" data-testid="atlas-theory-reference" onClick={() => void window.quantum.openAtlasSource(selected.id)}>Open theory reference ↗</button> <small>({atlasUrl(selected)})</small></p>
          <AtlasCapabilities id={selected.id}/>
          {binding ? <div className="atlas-binding"><p className="eyebrow">THEORY LAB BINDING / TESTED SUBSPACE</p><p>{binding.convention}</p>
            <div className="dynamics-actions"><button className="run-button" data-testid="open-atlas-binding" onClick={() => openLab?.(selectedId)}>Open in {binding.modelId.replaceAll("_", " ")} lab ↗</button>
              {actions.run&&<button type="button" data-testid="run-atlas-canonical" disabled={!canRun||running} onClick={()=>onRun?.(selectedId)}>{running?"Running…":"Run canonical example"}</button>}
              {actions.sweep&&<button type="button" data-testid="sweep-atlas-parameter" onClick={()=>onSweep?.(selectedId)}>Sweep Δ parameter ↗</button>}</div>
            {!actions.run&&<p className="scope-note">Canonical one-click run unavailable: this binding cannot retain pinned Atlas identity in its current saved-job contract. Open in Lab remains available.</p>}
            {actions.sweep&&<p className="scope-note">Sweep opens editable Lab study inputs. Point runs are ordinary Lab runs; they do not acquire canonical Atlas provenance.</p>}
            {message?.id===selectedId&&<p role="status" data-testid="atlas-action-message">{message.text}</p>}
          </div> : <p className="scope-note">No tested Theory Lab binding for this entry yet. This entry has no Load, Run or Sweep action.</p>}
        </article>}</div>
    </section>
  </div>;
}
