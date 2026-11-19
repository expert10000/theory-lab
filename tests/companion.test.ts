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

const source = join(process.cwd(),"docs","source-material","rb87-companion","Chapters");

test("Companion catalog lists seven immutable PDFs and rejects unknown IDs", async () => {
  const rows = await listCompanionChapters(source);
  assert.deepEqual(rows.map(row=>row.id),["rb87-i","rb87-ii","rb87-iii","rb87-iv","rb87-v","rb87-vi","rb87-vii"]);
  assert.ok(rows.every(row=>row.available && /^[a-f0-9]{64}$/.test(row.sha256)));
  assert.match(await verifiedCompanionPath(source,"rb87-iii"),/Chapter_3_Expanded\.pdf$/);
  await assert.rejects(verifiedCompanionPath(source,"../../secret"),/Unknown Companion chapter/);
});

test("missing and changed chapter bytes are withheld", async () => {
  const root = await mkdtemp(join(tmpdir(),"qlab-companion-"));
  try {
    const name = "Chapter_3_Expanded.pdf", target = join(root,name);
    await copyFile(join(source,name),target);
    assert.equal((await listCompanionChapters(root)).find(row=>row.id==="rb87-iii")?.available,true);
    assert.equal((await listCompanionChapters(root)).find(row=>row.id==="rb87-iv")?.available,false);
    const bytes = await readFile(target); bytes[100] ^= 1; await writeFile(target,bytes);
    await assert.rejects(verifiedCompanionPath(root,"rb87-iii"),/source hash changed/);
    assert.equal((await listCompanionChapters(root)).find(row=>row.id==="rb87-iii")?.available,false);
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

test("Library page explains the executable dimer and links its checked sources", () => {
  const markup=renderToStaticMarkup(React.createElement(Rb87CompanionPage,{
    onOpenDimer:()=>{},onOpenRuns:()=>{},onOpenTheory:()=>{},
  }));
  assert.match(markup,/LIBRARY \/ RB87 QUANTUM COMPANION/);
  assert.match(markup,/Open runnable dimer in Atlas/);
  assert.match(markup,/Read dimer Theory/);
  assert.match(markup,/View saved dimer runs/);
  assert.match(markup,/<math /);
  assert.match(markup,/one open bond/);
  assert.match(markup,/not a thermodynamic superfluid–Mott transition/);
  assert.match(markup,/Chapter III/);
  assert.match(markup,/Chapter IV/);
});
