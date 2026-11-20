import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { listCompanionChapters, verifiedCompanionPath } from "../apps/desktop/main/companion";
import { BoseHubbardCompanion } from "../apps/desktop/renderer/BoseHubbardCompanion";
import { Rb87CompanionPage } from "../apps/desktop/renderer/Rb87CompanionPage";
import { chapterSevenExample } from "../apps/desktop/renderer/Rb87ChapterSevenPath";
import { illustrativeTofWidth, twoBosonDimerLevels } from "../apps/desktop/renderer/CompanionVisuals";

const source = join(process.cwd(),"docs","source-material","rb87-companion","Chapters");

test("Companion catalog lists eight immutable PDFs and rejects unknown IDs", async () => {
  const rows = await listCompanionChapters(source);
  assert.deepEqual(rows.map(row=>row.id),["rb87-i","rb87-ii","rb87-iii","rb87-iv","rb87-v","rb87-vi","rb87-vii","rb87-viii"]);
  assert.ok(rows.every(row=>row.available && /^[a-f0-9]{64}$/.test(row.sha256)));
  assert.match(await verifiedCompanionPath(source,"rb87-iii"),/Chapter_3_Expanded\.pdf$/);
  assert.match(await verifiedCompanionPath(source,"rb87-viii"),/Chapter_8_Measurement_Feedback_QEC\.pdf$/);
  await assert.rejects(verifiedCompanionPath(source,"../../secret"),/Unknown Companion chapter/);
});

test("missing and changed chapter bytes are withheld", async () => {
  const root = await mkdtemp(join(tmpdir(),"qlab-companion-"));
  try {
    const name = "Chapter_3_Expanded.pdf", target = join(root,name);
    await copyFile(join(source,name),target);
    assert.equal((await listCompanionChapters(root)).find(row=>row.id==="rb87-iii")?.available,true);
    assert.equal((await listCompanionChapters(root)).find(row=>row.id==="rb87-iv")?.available,false);
    for (const [id,name] of [["rb87-v","Chapter_5_Entanglement_Correlations.pdf"],["rb87-vi","Chapter_6_Quantum_Gas_Microscopy.pdf"]] as const) {
      const target=join(root,name); await copyFile(join(source,name),target);
      assert.equal((await listCompanionChapters(root)).find(row=>row.id===id)?.available,true);
      const bytes=await readFile(target); bytes[100]^=1; await writeFile(target,bytes);
      await assert.rejects(verifiedCompanionPath(root,id),/source hash changed/);
      assert.equal((await listCompanionChapters(root)).find(row=>row.id===id)?.available,false);
    }
    const eighth="Chapter_8_Measurement_Feedback_QEC.pdf", eighthTarget=join(root,eighth);
    await copyFile(join(source,eighth),eighthTarget);
    assert.equal((await listCompanionChapters(root)).find(row=>row.id==="rb87-viii")?.available,true);
    const eighthBytes=await readFile(eighthTarget); eighthBytes[100]^=1; await writeFile(eighthTarget,eighthBytes);
    await assert.rejects(verifiedCompanionPath(root,"rb87-viii"),/source hash changed/);
    assert.equal((await listCompanionChapters(root)).find(row=>row.id==="rb87-viii")?.available,false);
    const bytes = await readFile(target); bytes[100] ^= 1; await writeFile(target,bytes);
    await assert.rejects(verifiedCompanionPath(root,"rb87-iii"),/source hash changed/);
    assert.equal((await listCompanionChapters(root)).find(row=>row.id==="rb87-iii")?.available,false);
    const fourth="Chapter_4_Expanded.pdf", fourthTarget=join(root,fourth);
    await copyFile(join(source,fourth),fourthTarget);
    assert.equal((await listCompanionChapters(root)).find(row=>row.id==="rb87-iv")?.available,true);
    const fourthBytes=await readFile(fourthTarget); fourthBytes[100] ^= 1; await writeFile(fourthTarget,fourthBytes);
    await assert.rejects(verifiedCompanionPath(root,"rb87-iv"),/source hash changed/);
    assert.equal((await listCompanionChapters(root)).find(row=>row.id==="rb87-iv")?.available,false);
    const first="Chapter_1_Expanded.pdf", firstTarget=join(root,first);
    await copyFile(join(source,first),firstTarget);
    assert.equal((await listCompanionChapters(root)).find(row=>row.id==="rb87-i")?.available,true);
    const firstBytes=await readFile(firstTarget); firstBytes[100] ^= 1; await writeFile(firstTarget,firstBytes);
    await assert.rejects(verifiedCompanionPath(root,"rb87-i"),/source hash changed/);
    assert.equal((await listCompanionChapters(root)).find(row=>row.id==="rb87-i")?.available,false);
    const second="Chapter_2_Expanded.pdf", secondTarget=join(root,second);
    await copyFile(join(source,second),secondTarget);
    assert.equal((await listCompanionChapters(root)).find(row=>row.id==="rb87-ii")?.available,true);
    const secondBytes=await readFile(secondTarget); secondBytes[100] ^= 1; await writeFile(secondTarget,secondBytes);
    await assert.rejects(verifiedCompanionPath(root,"rb87-ii"),/source hash changed/);
    assert.equal((await listCompanionChapters(root)).find(row=>row.id==="rb87-ii")?.available,false);
  } finally { await rm(root,{recursive:true,force:true}); }
});

test("dimer guide separates implemented two-site values from wider Companion topics", () => {
  const markup = renderToStaticMarkup(React.createElement(BoseHubbardCompanion));
  assert.match(markup,/FINITE DIMER \/ THEORY GUIDE/);
  assert.match(markup,/fixed particle number 2 ≤ N ≤ 8/);
  assert.match(markup,/chemical-potential term shifts every state equally/);
  assert.match(markup,/not a thermodynamic superfluid–Mott transition/);
  assert.match(markup,/Chapter III/);
  assert.match(markup,/Chapter IV/);
});

test("visual energy curve matches the exact two-boson dimer limits", () => {
  assert.deepEqual(twoBosonDimerLevels(0),[-2,0,2]);
  const [ground,middle,upper]=twoBosonDimerLevels(4);
  assert.ok(Math.abs(ground-(2-Math.sqrt(8)))<1e-12);
  assert.equal(middle,4);
  assert.ok(Math.abs(upper-(2+Math.sqrt(8)))<1e-12);
});

test("illustrative time-of-flight width follows its stated ballistic model", () => {
  assert.equal(illustrativeTofWidth(0),0.55);
  assert.ok(Math.abs(illustrativeTofWidth(4)**2-(0.55**2+(0.3*4)**2))<1e-12);
});

test("Chapter VII channel examples preserve their distinct quantities", () => {
  const dephasing=chapterSevenExample("dephasing",1,.5);
  assert.ok(Math.abs(dephasing.primary-Math.exp(-1))<1e-12);
  const loss=chapterSevenExample("loss",1,.5);
  assert.ok(Math.abs(loss.primary-Math.exp(-1))<1e-12);
  assert.ok(Math.abs(loss.primary+loss.secondary-1)<1e-12);
  const emission=chapterSevenExample("fluorescence",1,.5);
  assert.ok(Math.abs(emission.tertiary-.5*(1-Math.exp(-1)))<1e-12);
  assert.equal(chapterSevenExample("fluorescence",1,0).tertiary,0);
});

test("Library page explains the executable dimer and links its checked sources", () => {
  const markup=renderToStaticMarkup(React.createElement(Rb87CompanionPage,{
    onOpenDimer:()=>{},onOpenRuns:()=>{},onOpenTheory:()=>{},onOpenOrbitals:()=>{},
  }));
  assert.match(markup,/LIBRARY \/ RB87 QUANTUM COMPANION/);
  assert.match(markup,/Open runnable dimer in Atlas/);
  assert.match(markup,/Read dimer Theory/);
  assert.match(markup,/From an electron orbital to a condensate/);
  assert.match(markup,/From coherence to a camera image/);
  assert.match(markup,/From optical lattice to a finite dimer/);
  assert.match(markup,/From site images to correlations/);
  assert.match(markup,/Different channels, different evidence/);
  assert.match(markup,/Two atoms, two sites: energy levels/);
  assert.match(markup,/View saved dimer runs/);
  assert.match(markup,/<math /);
  assert.match(markup,/one open bond/);
  assert.match(markup,/not a thermodynamic superfluid–Mott transition/);
  assert.match(markup,/Chapter III/);
  assert.match(markup,/Chapter IV/);
});
