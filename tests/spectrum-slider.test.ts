import {test} from "node:test";
import assert from "node:assert/strict";
import {spectrumSliderValue} from "../apps/desktop/renderer/spectrum-slider";

test("coarse slider mirrors only finite drafts in its own range without clamping",()=>{
  for(const [draft,expected] of [["0",0],["-10",-10],["10",10],["1.234567",1.234567]] as const)
    assert.equal(spectrumSliderValue(draft),expected);
  for(const draft of [""," ","Infinity","NaN","10.001","-10.001","1000000"])
    assert.equal(spectrumSliderValue(draft),null);
});
