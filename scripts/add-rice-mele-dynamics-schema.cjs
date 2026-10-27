// Additive v1 branch extension: old static Rice–Mele pump jobs remain valid.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'packages', 'contracts', 'schemas');
const num = (min, max) => ({type:'number',minimum:min,maximum:max});
const integer = (min,max) => ({type:'integer',minimum:min,maximum:max});
const arr = (items,min,max) => ({type:'array',items,minItems:min,maxItems:max});
for (const name of ['quantum-job','quantum-result']) {
  const file = path.join(root,`${name}.v1.json`);
  const raw = fs.readFileSync(file,'utf8');
  const lines = raw.split(/\r?\n/);
  const lineIndex = lines.findIndex(line => line.includes('"type":{"const":"rice_mele_pump"}'));
  if(lineIndex<0)throw new Error(`Rice–Mele pump branch missing in ${name}`);
  const line = lines[lineIndex], comma = line.trimEnd().endsWith(',');
  const branch = JSON.parse(line.trim().replace(/,$/,''));
  const parameters = branch.properties.model.properties.parameters.properties;
  delete parameters.dynamics;
  parameters.duration=num(10,400);
  parameters.stepsPerPhase=integer(4,64);
  if(name==='quantum-result'){
    const props = branch.properties.analysis.properties;
    props.dynamics={type:'object',additionalProperties:false,properties:{
      status:{enum:['resolved','gap-closed','unresolved']},duration:num(10,400),stepsPerPhase:integer(4,64),
      timeValues:arr(num(0,400),17,65),phaseValues:arr(num(0,6.283186),17,65),
      kValues:arr(num(-3.141594,3.141594),16,80),
      current:arr(num(-10,10),17,65),charge:arr(num(-100,100),17,65),
      currentByK:arr(num(-10,10),272,5200),excitedPopulation:arr(num(0,1.000001),17,65),
      transportedCharge:num(-100,100),maxNormDrift:num(0,1),
      timeStepChargeDrift:num(0,100),momentumChargeDrift:num(0,100),
      adiabaticChern:{type:['integer','null'],minimum:-1,maximum:1},
      method:{type:'string',minLength:20},units:{type:'object',additionalProperties:false,properties:{
        time:{const:'inverse hopping energy'},current:{const:'electron charge / inverse hopping time'},
        charge:{const:'electron charge / cell'}},required:['time','current','charge']}
    },required:['status','duration','stepsPerPhase','timeValues','phaseValues','kValues','current','charge',
      'currentByK','excitedPopulation','transportedCharge','maxNormDrift','timeStepChargeDrift',
      'momentumChargeDrift','adiabaticChern','method','units']};
  }
  lines[lineIndex]='    '+JSON.stringify(branch)+(comma?',':'');
  fs.writeFileSync(file,lines.join(raw.includes('\r\n')?'\r\n':'\n'));
}
