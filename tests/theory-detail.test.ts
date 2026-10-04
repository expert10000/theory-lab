import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {DetailedTheoryIllustration} from "../apps/desktop/renderer/DetailedTheoryIllustration";
import {MODEL_GROUPS} from "../apps/desktop/renderer/workspace-navigation";

test("selected-system Theory has a distinct, labelled detailed schematic for every model",()=>{
  for(const model of MODEL_GROUPS.flatMap(group=>group.models)){
    const html=renderToStaticMarkup(React.createElement(DetailedTheoryIllustration,{model}));
    assert.match(html,/Detailed schematic of/);
    assert.match(html,/INTERPRETATION LIMIT/);
    assert.match(html,/not a computed state/);
    assert.match(html,/INTERACTION \/ BASIS/);
  }
});
