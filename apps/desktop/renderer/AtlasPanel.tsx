import React, { useMemo, useState } from "react";
import { ATLAS_ENTRIES, ATLAS_REVISION, atlasEntry, atlasUrl } from "../../../packages/atlas";
import { atlasBinding } from "../../../packages/atlas/bindings";

export function AtlasPanel({ openLab }: { openLab?: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const [selectedId, setSelectedId] = useState("two_level_pauli");
  const filtered = useMemo(() => ATLAS_ENTRIES.filter(entry => (family === "all" || entry.family === family) &&
    `${entry.id} ${entry.name} ${entry.presentation.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query, family]);
  const selected = atlasEntry(selectedId);
  const binding = atlasBinding(selectedId);
  return <div className="atlas-panel" data-testid="atlas-panel">
    <section className="panel"><p className="eyebrow">THEORY ATLAS / PINNED SOURCE</p><h2>48 Hamiltonians, one inspected revision.</h2>
      <p>Source revision <code>{ATLAS_REVISION.slice(0, 12)}</code>. These are reference definitions. The source registry marks no entry runnable; a Theory Lab binding is listed separately when implemented and tested.</p>
      <div className="atlas-controls"><input aria-label="Search Atlas" placeholder="Search Hamiltonians" value={query} onChange={event => setQuery(event.target.value)}/>
        <select aria-label="Atlas family" value={family} onChange={event => setFamily(event.target.value)}><option value="all">All families</option>{[...new Set(ATLAS_ENTRIES.map(entry => entry.family))].sort().map(name => <option key={name} value={name}>{name}</option>)}</select></div>
      <div className="atlas-browser"><div className="atlas-list" role="list" aria-label="Atlas entries">{filtered.map(entry => <button key={entry.id} className={selectedId === entry.id ? "atlas-active" : ""} onClick={() => setSelectedId(entry.id)}><strong>{entry.name}</strong><small>{entry.id} · {entry.family}</small></button>)}</div>
        {selected && <article className="atlas-detail"><p className="eyebrow">{selected.family.toUpperCase()} / REFERENCE ONLY</p><h3>{selected.name}</h3><p>{selected.presentation.summary}</p>
          <code className="atlas-formula">{selected.formula.latex}</code><p><strong>Basis:</strong> {selected.basis.description}</p>
          <h4>Parameters</h4><div className="atlas-parameters">{selected.parameters.map(parameter => <div key={parameter.symbol}><code>{parameter.symbol}</code><span>{parameter.name} · {parameter.unit_convention}</span><small>default {String(parameter.default)}</small></div>)}</div>
          <h4>Assumptions & limits</h4><p>{selected.assumptions.join(" · ") || "Not specified"}</p>{selected.important_limits.map((limit, index) => <p key={index}><strong>{limit.condition}</strong> → {limit.result}</p>)}
          <h4>Observables</h4><p>{selected.observables.join(" · ")}</p>
          {selected.relations.length > 0 && <><h4>Related entries</h4><div className="atlas-relations">{selected.relations.map((relation, index) => <button key={index} onClick={() => { setSelectedId(relation.target); setFamily("all"); setQuery(""); }}>{relation.target} ↗</button>)}</div></>}
          <p><a href={atlasUrl(selected)} target="_blank" rel="noopener noreferrer">View pinned source ↗</a></p>
          {binding ? <div className="atlas-binding"><p className="eyebrow">THEORY LAB BINDING / TESTED SUBSPACE</p><p>{binding.convention}</p><button className="run-button" data-testid="open-atlas-binding" onClick={() => openLab?.(selectedId)}>Load in {binding.modelId.replaceAll("_", " ")} lab ↗</button></div> : <p className="scope-note">No tested Theory Lab binding for this entry yet.</p>}
        </article>}</div>
    </section>
  </div>;
}
