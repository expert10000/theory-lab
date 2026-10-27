// Additive v1 branch extension: existing static and periodic-bulk jobs remain valid.
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','packages','contracts','schemas');
const num=(minimum,maximum)=>({type:'number',minimum,maximum});
const integer=(minimum,maximum)=>({type:'integer',minimum,maximum});
const arr=(items,minItems,maxItems)=>({type:'array',items,minItems,maxItems});
for(const name of ['quantum-job','quantum-result']){
  const file=path.join(root,`${name}.v1.json`),raw=fs.readFileSync(file,'utf8');
  const lines=raw.split(/\r?\n/);
  const at=lines.findIndex(line=>line.includes('"type":{"const":"rice_mele_pump"}'));
  if(at<0)throw new Error(`Rice–Mele pump branch missing in ${name}`);
  const comma=lines[at].trimEnd().endsWith(',');
  const branch=JSON.parse(lines[at].trim().replace(/,$/,''));
  branch.properties.model.properties.parameters.properties.chainCells=integer(4,10);
  if(name==='quantum-result'){
    const a=branch.properties.analysis.properties;
    a.finiteChain={type:'object',additionalProperties:false,properties:{
      status:{enum:['resolved','size-sensitive','unresolved']},
      cells:integer(4,10),sites:integer(8,20),occupiedOrbitals:integer(4,10),centralBond:integer(3,9),
      duration:num(10,400),stepsPerPhase:integer(4,64),
      timeValues:arr(num(0,400),17,65),phaseValues:arr(num(0,6.283186),17,65),
      siteDensity:arr(num(0,1.000001),136,1300),
      bondElectronCurrent:arr(num(-10,10),119,1235),
      centralBondCharge:arr(num(-100,100),17,65),
      leftEdgePopulation:arr(num(0,2.000001),17,65),rightEdgePopulation:arr(num(0,2.000001),17,65),
      maxNormDrift:num(0,1),maxParticleDrift:num(0,1),maxContinuityResidual:num(0,100),
      timeStepChargeDrift:num(0,100),widthChargeDrift:num(0,100),
      method:{type:'string',minLength:20},
      units:{type:'object',additionalProperties:false,properties:{
        time:{const:'inverse hopping energy'},density:{const:'particles per site'},
        current:{const:'electron charge / inverse hopping time'},charge:{const:'electron charge'}},
      required:['time','density','current','charge']}
    },required:['status','cells','sites','occupiedOrbitals','centralBond','duration','stepsPerPhase',
      'timeValues','phaseValues','siteDensity','bondElectronCurrent','centralBondCharge',
      'leftEdgePopulation','rightEdgePopulation','maxNormDrift','maxParticleDrift',
      'maxContinuityResidual','timeStepChargeDrift','widthChargeDrift','method','units']};
  }
  lines[at]='    '+JSON.stringify(branch)+(comma?',':'');
  fs.writeFileSync(file,lines.join(raw.includes('\r\n')?'\r\n':'\n'));
}
