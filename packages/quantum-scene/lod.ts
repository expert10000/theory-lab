import {SceneBuilder} from "./builder";
import {verifyScenePayload,type ScenePayload} from "./index";

// A display subset, never a recalculated worker result or convergence estimate.
export async function scenePreview(payload:ScenePayload,digest:(bytes:Uint8Array)=>Promise<string>):Promise<ScenePayload>{
  const arrays=await verifyScenePayload(payload,digest),scene=structuredClone(payload.scene);
  scene.id=`preview-${scene.provenance.resultSha256.slice(0,24)}`;scene.title=`Display subset · ${scene.title}`.slice(0,240);
  scene.datasets=[];scene.objects=[];scene.annotations=[{id:"lod-disclaimer",text:"Coarse display subset of original samples; no interpolation, renormalization, convergence or topology calculation.",position:[0,0,0]}];
  delete scene.lattice;delete scene.reciprocal;delete scene.bands;delete scene.topology;delete scene.fields;
  const b=new SceneBuilder(scene,digest);
  if(payload.scene.fields?.length){scene.fields=[];for(const f of payload.scene.fields){const copy=structuredClone(f),steps=f.grid.shape.map(n=>(n-1)%4===0&&n>=9?4:(n-1)%2===0&&n>=5?2:1),shape=f.grid.shape.map((n,a)=>(n-1)/steps[a]+1) as [number,number,number];
    for(const key of ["real","imaginary"] as const){if(!f[key])continue;const source=arrays.get(f[key]!)!,values:number[]=[];for(let x=0;x<shape[0];x++)for(let y=0;y<shape[1];y++)for(let z=0;z<shape[2];z++)values.push(source[(x*steps[0]*f.grid.shape[1]+y*steps[1])*f.grid.shape[2]+z*steps[2]]);copy[key]=await b.data(`preview-${f.id}-${key}`,values,1,payload.scene.datasets.find(d=>d.id===f[key])!.unit);}
    copy.grid.shape=shape;copy.grid.spacing=f.grid.spacing.map((v,a)=>v*steps[a]) as [number,number,number];scene.fields.push(copy);
  }}else{const o=payload.scene.objects.find(o=>o.scalars)??payload.scene.objects[0],n=arrays.get(o.positions)!.length/3,indices=Array.from({length:Math.min(n,256)},(_,i)=>Math.round(i*(n-1)/Math.max(1,Math.min(n,256)-1)));
    const take=(id:string,c:1|3)=>indices.flatMap(i=>[...arrays.get(id)!.slice(i*c,i*c+c)]),unit=(id:string)=>payload.scene.datasets.find(d=>d.id===id)!.unit;
    const positions=await b.data("preview-positions",take(o.positions,3),3,unit(o.positions)),values=o.values?await b.data("preview-vectors",take(o.values,3),3,unit(o.values)):undefined,scalars=o.scalars?await b.data("preview-scalars",take(o.scalars,1),1,unit(o.scalars)):undefined;
    b.object("preview-samples",`${o.label} · retained original samples`,values?"vectors":"point-cloud",positions,o.style.color,{...(values?{values}:{}),...(scalars?{scalars}:{}),...(o.colorMap?{colorMap:o.colorMap}:{})});
  }return b.finish();
}
