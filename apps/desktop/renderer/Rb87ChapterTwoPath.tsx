import React, { useEffect, useState } from "react";
import type { CompanionChapter } from "../../../packages/contracts/companion";
import { ImageInferenceFigure, TimeOfFlightFigure } from "./CompanionVisuals";

/** Source-qualified Chapter II notes; a changed PDF cannot retain these locators. */
export function Rb87ChapterTwoPath() {
  const [chapter, setChapter] = useState<CompanionChapter | null>(null);
  const [checking, setChecking] = useState(true);
  const [opening, setOpening] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = () => {
      setChecking(true);
      void window.quantum.listCompanionChapters()
        .then(rows => { if (active) { setChapter(rows.find(row => row.id === "rb87-ii") ?? null); setChecking(false); setMessage(""); } })
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
      const current = rows.find(row => row.id === "rb87-ii") ?? null;
      setChapter(current);
      if (!current?.available) throw new Error("Chapter II source changed or is unavailable");
      await window.quantum.openCompanionChapter("rb87-ii");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setOpening(false); }
  }

  return <section className="panel companion-reading-path companion-chapter-two" data-testid="chapter-two-path" aria-labelledby="chapter-two-title">
    <div className="companion-path-heading">
      <div><p className="eyebrow">REVIEWED READING PATH / CHAPTER II</p>
        <h3 id="chapter-two-title">From coherence to a camera image</h3>
        <p>Read the signal first, then the model used to interpret it. Each stop separates what an image records from what it can support.</p></div>
      <span className="companion-path-mark" aria-hidden="true">II</span>
    </div>
    {checking ? <p role="status">Checking Chapter II source…</p> : !chapter?.available ?
      <p role="status" data-testid="chapter-two-withheld">Chapter II notes are withheld because the supplied PDF is missing or its hash changed.</p> : <div data-testid="chapter-two-reading">
      <div className="companion-path-steps">
        <article><span className="companion-path-number">01</span><h4>Coherence and fringes</h4>
          <p>Overlapping matter waves can make density fringes in a single image. Fringe spacing and contrast are image features; relative phase and first-order coherence require the overlap geometry and a model. Averaging shots with different phases can erase visible fringes.</p>
          <small>Chapter II §§2–4 · PDF pp. 3–5; supplement II-A · p. 11</small></article>
        <article><span className="companion-path-number">02</span><h4>Release and time of flight</h4>
          <p>Images taken after release show spatial cloud widths. An initial momentum spread follows from those widths only under a stated expansion model. Initial position–momentum covariance and interactions can change the expansion; an equivalent temperature is an inferred energy scale.</p>
          <small>Chapter II §§6–7 · PDF pp. 6–7; supplement II-B · p. 11</small></article>
        <article><span className="companion-path-number">03</span><h4>What imaging records</h4>
          <p>The camera records probe and atom-image intensities. Their calibrated ratio gives optical depth, then an inferred line-of-sight column density. One image does not directly show a three-dimensional wavefunction, phase field, or momentum distribution.</p>
          <small>Chapter II §8 · PDF pp. 7–8; supplement II-D · p. 11</small></article>
      </div>
      <ImageInferenceFigure />
      <TimeOfFlightFigure />
      <div className="companion-path-boundary">
        <div><p className="eyebrow">DATED CASE STUDY / 5 NOVEMBER 2026</p>
          <h4>Space-station expansion is not an interferometer result.</h4>
          <p>The published Xiong et al. abstract reports an optical-dipole-trap condensate of about 20,000 atoms aboard the China Space Station and 7.0 seconds of free expansion. Its 9.7 pK figure is an <em>equivalent expansion temperature</em>, inferred from the cloud's spreading; the abstract does not establish a thermodynamic temperature or a demonstrated seven-second interferometer.</p>
          <small>Chapter II §§9–10.1 · PDF pp. 8–9; supplement II-E · p. 12 · Science DOI 10.1126/science.aea5324</small></div>
        <div><p className="eyebrow">CHAPTER SOURCE / CHECKED PDF</p>
          <p>Visibility is not condensate fraction. The chapter's worked numbers are examples, not measurements from the space experiment. The reader rechecks the exact PDF bytes before opening.</p>
          <button type="button" data-testid="open-companion-rb87-ii" disabled={opening} onClick={() => void openChapter()}>Open Chapter II PDF in Lab ↗</button>
          <small>{chapter.title} · {chapter.pages} pages · source SHA-256 <code>{chapter.sha256}</code></small></div>
      </div>
    </div>}
    {message && <p role="alert">{message}</p>}
  </section>;
}
