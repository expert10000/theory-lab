import type {SpectrumResult} from "../../../packages/contracts";
import type {WorkspaceModel} from "./workspace-navigation";

export type ScientificSelection=
  | {kind:"energy";model:"two_level";runId:string;level:0|1}
  | {kind:"parameter";model:"two_level";key:"delta"|"omega"}
  | {kind:"operator";model:"two_level";key:"sigma_x"|"sigma_z"};

/** A selection is a reference, never a source of numerical or state data. */
export function validatedSelection(value:unknown,model:WorkspaceModel,result:SpectrumResult|null):ScientificSelection|null{
  if(model!=="two_level"||!value||typeof value!=="object"||Array.isArray(value))return null;
  const selection=value as Record<string,unknown>;
  if(selection.model!=="two_level")return null;
  if(selection.kind==="energy"&&typeof selection.runId==="string"&&
    (selection.level===0||selection.level===1)&&result?.runId===selection.runId)
    return {kind:"energy",model:"two_level",runId:selection.runId,level:selection.level};
  if(selection.kind==="parameter"&&(selection.key==="delta"||selection.key==="omega"))
    return {kind:"parameter",model:"two_level",key:selection.key};
  if(selection.kind==="operator"&&(selection.key==="sigma_x"||selection.key==="sigma_z"))
    return {kind:"operator",model:"two_level",key:selection.key};
  return null;
}
