import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ATLAS_ENTRIES, atlasEntry } from "../packages/atlas";
import { AtlasFormula } from "../apps/desktop/renderer/AtlasFormula";

test("all pinned Atlas formulas render as MathML", () => {
  assert.equal(ATLAS_ENTRIES.length,68);
  for (const entry of ATLAS_ENTRIES) {
    const markup = renderToStaticMarkup(React.createElement(AtlasFormula,{latex:entry.formula.latex}));
    assert.match(markup,/<math /,entry.id);
    assert.doesNotMatch(markup,/Formula unavailable/,entry.id);
  }
  const bose = renderToStaticMarkup(React.createElement(AtlasFormula,{latex:atlasEntry("bose_hubbard")!.formula.latex}));
  assert.match(bose,/<math /);
  assert.match(bose,/<mo>∑<\/mo>/);
  assert.doesNotMatch(bose,/class="atlas-formula"[^>]*>H=-t\\sum/);
});
