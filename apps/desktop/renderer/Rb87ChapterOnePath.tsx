import React, { useEffect, useState } from "react";
import type { CompanionChapter } from "../../../packages/contracts/companion";
import { AtomToModeFigure } from "./CompanionVisuals";

/** Source-qualified Chapter I path; withhold its notes if the supplied PDF changes. */
export function Rb87ChapterOnePath({ onOpenOrbitals }: { onOpenOrbitals: () => void }) {
  const [chapter, setChapter] = useState<CompanionChapter | null>(null);
  const [checking, setChecking] = useState(true);
  const [opening, setOpening] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = () => {
      setChecking(true);
      void window.quantum.listCompanionChapters()
        .then(rows => { if (active) { setChapter(rows.find(row => row.id === "rb87-i") ?? null); setChecking(false); setMessage(""); } })
        .catch(error => { if (active) { setChapter(null); setChecking(false); setMessage(error instanceof Error ? error.message : String(error)); } });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); };
  }, []);
  async function openChapter() {
    setOpening(true); setMessage("");
    try {
      const rows = await window.quantum.listCompanionChapters();
      const current = rows.find(row => row.id === "rb87-i") ?? null;
      setChapter(current);
      if (!current?.available) throw new Error("Chapter I source changed or is unavailable");
      await window.quantum.openCompanionChapter("rb87-i");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setOpening(false); }
  }
  return <section className="panel companion-reading-path" data-testid="chapter-one-path" aria-labelledby="chapter-one-title">
    <div className="companion-path-heading">
      <div><p className="eyebrow">REVIEWED READING PATH / CHAPTER I</p>
        <h3 id="chapter-one-title">From an electron orbital to a condensate</h3>
        <p>Follow three distinct descriptions: an atom's internal electrons, the motion of whole atoms, and occupation of a shared motional mode.</p></div>
      <span className="companion-path-mark" aria-hidden="true">I</span>
    </div>
    {checking ? <p role="status">Checking Chapter I source…</p> : !chapter?.available ?
      <p role="status" data-testid="chapter-one-withheld">Chapter I notes are withheld because the supplied PDF is missing or its hash changed. The orbital lab remains a separate one-electron model.</p> : <div data-testid="chapter-one-reading">
      <div className="companion-path-steps">
        <article><span className="companion-path-number">01</span><h4>Inside one Rb87 atom</h4>
          <p>Neutral rubidium's ground configuration is [Kr]5s¹. Its electronic orbitals belong to a many-electron atom. A motional orbital describes the center of mass of the whole atom; it is a different degree of freedom.</p>
          <small>Chapter I §§1, 2.1, 3 · PDF pp. 2–4</small></article>
        <article><span className="companion-path-number">02</span><h4>Whole atoms as bosons</h4>
          <p>Identical Rb87 atoms can occupy the same motional mode. The occupation number counts atoms in that mode, not electrons placed into a shared 5s shell.</p>
          <small>Chapter I §4 and §4.1 · PDF p. 4</small></article>
        <article><span className="companion-path-number">03</span><h4>What condenses</h4>
          <p>A macroscopically occupied natural orbital is identified through the one-body density matrix. An interacting condensate need not put every atom in one exact product state.</p>
          <small>Chapter I §5 · PDF p. 5</small></article>
      </div>
      <AtomToModeFigure />
      <div className="companion-path-boundary">
        <div><p className="eyebrow">RELATED THEORY / ONE-ELECTRON MODEL</p>
          <h4>Explore orbital shape, then keep the models separate.</h4>
          <p>The Lab's hydrogenic orbital view samples one electron in a Coulomb potential for n=1…3. It illustrates radial and angular structure; it does not calculate Rb87's many-electron 5s state, whole-atom motion, Bose statistics, or a condensate.</p>
          <button type="button" data-testid="chapter-one-open-orbitals" onClick={onOpenOrbitals}>Open hydrogenic orbital lab · related theory ↗</button></div>
        <div><p className="eyebrow">CHAPTER SOURCE / CHECKED PDF</p>
          <p>The sections above refer to the supplied Chapter I PDF. The reader rechecks its exact bytes before opening.</p>
          <button type="button" data-testid="open-companion-rb87-i" disabled={opening} onClick={() => void openChapter()}>Open Chapter I PDF in Lab ↗</button>
          <small>{chapter.title} · {chapter.pages} pages · source SHA-256 <code>{chapter.sha256}</code></small></div>
      </div>
    </div>}
    {message && <p role="alert">{message}</p>}
  </section>;
}
