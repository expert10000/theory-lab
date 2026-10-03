import type {QuantumResult} from "../../../packages/contracts";
import {supportsScene} from "../../../packages/quantum-scene/from-result";

export type SceneView="standard"|"bands";
export interface SceneLaunch {nonce:number;runId:string;view:SceneView}

/** UI capability only; main still verifies the saved result and generated scene. */
export function availableSceneViews(result:QuantumResult):{standard:boolean;bands:boolean}{
  if(result.operation==="topology"){
    const analysis=result.analysis;
    return {standard:result.model.type==="ssh"||analysis.kind==="qwz"&&!analysis.gapClosed,
      bands:!!analysis.lowerBand&&!!analysis.upperBand&&
        (analysis.kind==="ssh"||!!analysis.bandKValues)};
  }
  return {standard:supportsScene(result.operation,result.model.type),bands:false};
}
