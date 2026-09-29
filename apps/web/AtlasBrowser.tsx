import React, { useMemo, useState } from "react";
import { ATLAS_ENTRIES, ATLAS_REVISION, atlasEntry, atlasUrl } from "../../packages/atlas";
import { atlasBinding, type AtlasBinding } from "../../packages/atlas/bindings";
import { AtlasCapabilities } from "../../packages/ui/AtlasCapabilities";

export function AtlasBrowser({ onLoad, supported }: {
  onLoad: (binding: AtlasBinding) => void;
  supported: (binding: AtlasBinding) => boolean;
}) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const [selectedId, setSelectedId] = useState("two_level_pauli");
  const entries = useMemo(() => ATLAS_ENTRIES.filter(entry =>
    (family === "all" || entry.family === family) &&
    `${entry.id} ${entry.name} ${entry.presentation.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query, family]);
  const selected = atlasEntry(selectedId);
  const binding = selected ? atlasBinding(selected.id) : null;
  return <div className="web-atlas" data-testid="web-atlas">
    <div className="page-intro"><div><div className="eyebrow">THEORY / PINNED REFERENCE</div><h1>Hamiltonian Atlas</h1>
      <p>{ATLAS_ENTRIES.length} source definitions at revision <code>{ATLAS_REVISION.slice(0, 12)}</code>. R1 separates reference entries, theory examples and tested Lab bindings.</p></div>
      <div className="model-badge">{ATLAS_ENTRIES.length} Hamiltonians · 9 tested lab bindings</div></div>
    <div className="card"><div className="atlas-filters"><input aria-label="Search Atlas" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search names, IDs or tags"/>
      <select aria-label="Atlas family" value={family} onChange={event => setFamily(event.target.value)}><option value="all">All families</option>{[...new Set(ATLAS_ENTRIES.map(entry => entry.family))].sort().map(value => <option key={value} value={value}>{value}</option>)}</select></div>
      <div className="atlas-grid"><div className="atlas-items" role="list" aria-label="Atlas entries">{entries.map(entry => <button key={entry.id} className={selectedId === entry.id ? "atlas-item active" : "atlas-item"} onClick={() => setSelectedId(entry.id)}><strong>{entry.name}</strong><small>{entry.id} · {entry.family}</small></button>)}</div>
      {selected && <article className="atlas-inspect" data-testid="web-atlas-detail"><div className="eyebrow">{selected.family.toUpperCase()} / SOURCE REFERENCE</div><h2>{selected.name}</h2><p>{selected.presentation.summary}</p>
        <code className="atlas-math">{selected.formula.latex}</code><p><strong>Basis:</strong> {selected.basis.description}</p>
        <h3>Parameters</h3><div className="atlas-param-list">{selected.parameters.map(parameter => <div key={parameter.symbol}><code>{parameter.symbol}</code><span>{parameter.name} · {parameter.unit_convention}</span><small>default {String(parameter.default)}</small></div>)}</div>
        <h3>Assumptions & limits</h3><p>{selected.assumptions.join(" · ") || "Not specified"}</p>{selected.important_limits.map((limit, index) => <p key={index}><strong>{limit.condition}</strong> → {limit.result}</p>)}
        <h3>Observables</h3><p>{selected.observables.join(" · ")}</p>
        {selected.relations.length > 0 && <><h3>Relations</h3><div className="atlas-links">{selected.relations.map((relation, index) => <button key={index} onClick={() => { setSelectedId(relation.target); setFamily("all"); setQuery(""); }}>{relation.target} ↗</button>)}</div></>}
        <a className="atlas-source" href={atlasUrl(selected)} target="_blank" rel="noopener noreferrer">View pinned source ↗</a>
        <AtlasCapabilities id={selected.id}/>
        {binding ? <div className="atlas-bridge"><div className="eyebrow">THEORY LAB BINDING</div><p>{binding.convention}</p>
          {supported(binding) ? <button className="primary" data-testid="web-atlas-load" onClick={() => onLoad(binding)}>Load in {binding.modelId.replaceAll("_", " ")} lab →</button> : <small>This binding is available in the desktop lab; it is not yet a web control.</small>}</div>
          : <p className="atlas-unbound">No tested lab binding for this entry yet.</p>}
      </article>}</div></div>
  </div>;
}
