// One-time additive schema migration. Keep the legacy topology branches intact.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'packages', 'contracts', 'schemas');
const n = (lo, hi) => ({ type: 'number', minimum: lo, maximum: hi });
const i = (lo, hi) => ({ type: 'integer', minimum: lo, maximum: hi });
const arr = (items, lo, hi) => ({ type: 'array', items, minItems: lo, maxItems: hi });
const params = { type: 'object', additionalProperties: false, properties: {
  baseHopping: n(.25, 2), modulation: n(-1, 1), staggerAmplitude: n(-2, 2),
  staggerOffset: n(-2, 2), kSamples: i(16, 80), phaseSamples: i(16, 64),
}, required: ['baseHopping','modulation','staggerAmplitude','staggerOffset','kSamples','phaseSamples'] };
const model = { type: 'object', additionalProperties: false, properties: {
  type: { const: 'rice_mele_pump' }, parameters: params,
  source: { $ref: '#/oneOf/0/properties/model/properties/source' },
}, required: ['type','parameters'] };
const scalar = n(-100, 100);
const nullable = { type: ['number','null'], minimum: -2, maximum: 2 };
const invariant = { type: ['integer','null'], minimum: -1, maximum: 1 };
const units = { type:'object', additionalProperties:false, properties: {
  momentum: {const:'rad / cell'}, phase:{const:'rad'}, energy:{const:'hopping energy'},
  polarization:{const:'electron charge / cell'},
}, required:['momentum','phase','energy','polarization'] };
const analysisProps = {
  kind:{const:'rice_mele_pump'}, status:{enum:['defined','gap-closed','mesh-unresolved']},
  chern:invariant, polarizationWinding:invariant, exactGap:n(0,100), coarseGap:n(0,100), fineGap:n(0,100),
  coarseChern:nullable, fineChern:nullable, coarseWinding:nullable, fineWinding:nullable,
  minimumLink:n(0,1.000001), fineMinimumLink:n(0,1.000001),
  kValues:arr(n(-3.141594,3.141594),16,80), phaseValues:arr(n(0,6.283186),16,64),
  t1Values:arr(scalar,16,64), t2Values:arr(scalar,16,64), deltaValues:arr(scalar,16,64),
  lowerBand:arr(scalar,256,5120), upperBand:arr(scalar,256,5120), berryFlux:arr(n(-3.141594,3.141594),256,5120),
  polarization:arr(n(-4,4),17,65), method:{type:'string',minLength:20}, units,
};
const analysis = {type:'object',additionalProperties:false,properties:analysisProps,required:Object.keys(analysisProps)};
for (const [name, isResult] of [['quantum-job',false],['quantum-result',true]]) {
  const file = path.join(root, `${name}.v1.json`);
  let raw = fs.readFileSync(file,'utf8');
  const existing = JSON.parse(raw);
  if (existing.oneOf.some(branch=>branch.properties?.model?.properties?.type?.const==='rice_mele_pump')) continue;
  const staticBranch = existing.oneOf.find(branch=>branch.properties?.model?.properties?.type?.const==='rice_mele');
  if (!staticBranch) throw new Error(`Missing static Rice–Mele branch in ${name}`);
  const branch = structuredClone(staticBranch);
  branch.properties.model = model;
  if (isResult) branch.properties.analysis = analysis;
  const tail = /\r?\n  \]\r?\n\}\s*$/;
  if (!tail.test(raw)) throw new Error(`Unexpected schema tail: ${name}`);
  raw = raw.replace(tail, `,\n    ${JSON.stringify(branch)}\n  ]\n}\n`);
  fs.writeFileSync(file, raw);
}
