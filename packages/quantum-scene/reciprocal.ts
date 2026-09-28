import {latticeDefinition, type LatticeFamily} from "./lattice-definition";
import {SceneBuilder} from "./builder";
import type {Vec3, SceneReciprocal} from "./index";
/** Explicit primitive-zone fixtures, not an arbitrary Wigner–Seitz algorithm. */
export async function addReciprocalGuides(b: SceneBuilder, family: LatticeFamily, directUnit="schematic primitive spacing", unit="rad / schematic primitive spacing") {
  const def=latticeDefinition(family), pi=Math.PI;
  let basis:Vec3[], points:SceneReciprocal["points"], boundary:number[], path:string[];
  if(family==="honeycomb") {
    basis=[[2*pi/Math.sqrt(3),-2*pi/3,0],[0,4*pi/3,0]];
    const radius=4*pi/(3*Math.sqrt(3));
    boundary=Array.from({length:7},(_,i)=>[radius*Math.cos(i*pi/3),radius*Math.sin(i*pi/3),0]).flat();
    points=[{id:"Gamma",label:"Γ",position:[0,0,0]},{id:"M",label:"M",position:[pi/Math.sqrt(3),pi/3,0]},{id:"K",label:"K",position:[radius,0,0]}];path=["Gamma","M","K","Gamma"];
  }else {
    basis=def.translations.map(t=>t.map(v=>v*2*pi) as Vec3);
    points=[{id:"Gamma",label:"Γ",position:[0,0,0]},{id:"X",label:"X",position:[pi,0,0]},{id:"M",label:"M",position:[pi,pi,0]}];
    if(family==="simple_cubic") {
      points.push({id:"R",label:"R",position:[pi,pi,pi]});path=["Gamma","X","M","Gamma","R","X"];boundary=[];
      for(let mask=0;mask<8;mask++)for(let axis=0;axis<3;axis++)if(!(mask&(1<<axis))) {
        const p=[0,1,2].map(i=>(mask&(1<<i))?pi:-pi),q=[...p];q[axis]=pi;boundary.push(...p,...q);
      }
    }else {path=["Gamma","X","M","Gamma"];boundary=[-pi,-pi,0,pi,-pi,0,pi,pi,0,-pi,pi,0,-pi,-pi,0];}
  }
  const positionRef=await b.data("symmetry-points",points.flatMap(p=>p.position),3,unit);
  b.object("symmetry-points","Named high-symmetry k-points","point-cloud",positionRef,"#f2b36f");
  b.object("primitive-bz","Supplied primitive Brillouin-zone boundary",family==="simple_cubic"?"segments":"polyline",await b.data("primitive-bz",boundary,3,unit),"#79d9c1");
  b.object("symmetry-path",path.map(id=>points.find(p=>p.id===id)!.label).join(" → "),"polyline",await b.data("symmetry-path",path.flatMap(id=>points.find(p=>p.id===id)!.position),3,unit),"#f2b36f");
  for(let i=0;i<basis.length;i++) {
    b.object(`reciprocal-b${i+1}`,`Reciprocal b${i+1} (2π convention)`,"vectors",await b.data(`reciprocal-origin-${i}`,[0,0,0],3,unit),"#5995f0",{values:await b.data(`reciprocal-basis-${i}`,basis[i],3,unit)});
    b.scene.annotations.push({id:`reciprocal-label-${i}`,text:`b${i+1}`,position:basis[i]});
  }
  points.forEach(p=>b.scene.annotations.push({id:`k-label-${p.id}`,text:p.label,position:p.position}));
  b.scene.reciprocal={directBasis:def.translations,basis,directUnit,reciprocalUnit:unit,pointObject:"symmetry-points",points,paths:[{object:"symmetry-path",label:path.map(id=>points.find(p=>p.id===id)!.label).join(" → "),points:path}],boundaryObjects:["primitive-bz"]};
}
