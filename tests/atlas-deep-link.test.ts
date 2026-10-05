import test from "node:test";
import assert from "node:assert/strict";
import {ATLAS_ENTRIES,ATLAS_REVISION} from "../packages/atlas";
import {atlasBinding} from "../packages/atlas/bindings";
import {ATLAS_REFERENCE_COUNT,CANONICAL_ATLAS_IDS,atlasDeepLinkCapabilities,canonicalAtlasJob,canonicalAtlasOrigin} from "../packages/atlas/deep-link";
import {assertJob} from "../packages/contracts";

test("QVIS-022 gates canonical execution to eight provenance-capable tested Atlas bindings",()=>{
  assert.equal(ATLAS_REFERENCE_COUNT,68);
  assert.equal(CANONICAL_ATLAS_IDS.length,8);
  for(const entry of ATLAS_ENTRIES){
    const capability=atlasDeepLinkCapabilities(entry.id),binding=atlasBinding(entry.id);
    assert.equal(capability.load,!!binding);
    assert.equal(capability.theory,true);
    assert.equal(capability.run,CANONICAL_ATLAS_IDS.includes(entry.id as typeof CANONICAL_ATLAS_IDS[number]));
    assert.equal(capability.sweep,entry.id==="two_level_pauli");
    const job=canonicalAtlasJob(entry.id,`atlas-${entry.id}`);
    if(!capability.run){assert.equal(job,null);continue;}
    assert.ok(job);assertJob(job);
    const origin=canonicalAtlasOrigin(job);
    assert.equal(origin?.id,entry.id);
    assert.equal(origin?.revision,ATLAS_REVISION);
    assert.equal(origin?.section,entry.references.chapters[0]);
  }
  for(const id of ["ising_chain","harmonic_oscillator","driven_harmonic_oscillator"]){
    assert.equal(atlasDeepLinkCapabilities(id).load,true);
    assert.equal(atlasDeepLinkCapabilities(id).run,false);
  }
});

test("QVIS-022 reverse links refuse altered source, parameters and descriptive jobs",()=>{
  const canonical=canonicalAtlasJob("two_level_pauli","atlas-origin");
  assert.ok(canonical&&canonical.operation==="diagonalize");
  assert.equal(canonicalAtlasOrigin(canonical)?.id,"two_level_pauli");
  assert.equal(canonicalAtlasOrigin({...canonical,model:{...canonical.model,parameters:{...canonical.model.parameters,delta:3}}}),null);
  assert.equal(canonicalAtlasOrigin({...canonical,model:{...canonical.model,source:{...canonical.model.source,exampleId:"Atlas graphene_nn"}}}),null);
  assert.equal(canonicalAtlasOrigin({...canonical,model:{...canonical.model,source:{...canonical.model.source,sourceRepository:"https://example.invalid"}}}),null);
  assert.equal(canonicalAtlasJob("graphene_nn","not-allowed"),null);
});
