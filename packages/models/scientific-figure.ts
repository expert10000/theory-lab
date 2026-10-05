import type {QuantumResult} from "../contracts";
import type {ScientificFigureMetadata} from "../contracts/figure";

type Semantics=Pick<ScientificFigureMetadata,"axes"|"series"|"plottedSamples">;
const axis=(label:string,unit:string)=>({label,unit});
const series=(labels:readonly string[],unit:string)=>labels.map(label=>({label,unit}));
function columnUnit(label:string){
  if(/p[_0-9]|probability|population|density/i.test(label))return "probability";
  if(/photon|number|occupation/i.test(label))return "count";
  if(/variance/i.test(label))return "normalized²";
  return "dimensionless";
}

/** Declares only the quantities actually drawn by the existing SVG geometry. */
export function figureSemantics(result:QuantumResult):Semantics{
  if(result.operation==="diagonalize")return {axes:{x:axis("Level","index"),y:axis("Energy","normalized")},
    series:series(["E−","E+"],"normalized"),plottedSamples:2};
  if(result.operation==="many_body")return {axes:{x:axis("Low-energy level","index"),y:axis("Energy","normalized")},
    series:series(["Eₙ"],"normalized"),plottedSamples:result.spectrum.lowEnergies.length};
  if(result.operation==="circuit"||result.operation==="oscillator"||result.operation==="oscillator_anharmonic"){
    const unit=result.operation==="circuit"?"GHz":"normalized";
    return {axes:{x:axis("Level","index"),y:axis("Energy",unit)},series:series(["Eₙ"],unit),
      plottedSamples:result.spectrum.energies.length};
  }
  if(result.operation==="orbital")return {axes:{x:axis("Radius","a₀"),y:axis("Radial probability density","a₀⁻¹")},
    series:series(["r²|R(r)|²"],"a₀⁻¹"),plottedSamples:result.analysis.radialRadii.length};
  if(result.operation==="topology")return result.analysis.kind==="ssh"?
    {axes:{x:axis("Crystal momentum k","radian"),y:axis("Band energy","normalized")},
      series:series(["Lower band","Upper band"],"normalized"),plottedSamples:result.analysis.kValues.length}:
    {axes:{x:axis("kₓ","radian"),y:axis("kᵧ","radian")},
      series:series(["Berry curvature"],"dimensionless"),plottedSamples:result.analysis.berryCurvature.length};
  if(result.operation==="sweep"){
    const x=result.sweep.x,y=result.sweep.y;
    return {axes:{x:axis(x.parameter,"normalized"),y:axis(y?y.parameter:"Final P₁",y?"normalized":"probability")},
      series:series(["Final P₁"],"probability"),plottedSamples:result.data.shape.x*result.data.shape.y};
  }
  const cols=result.operation==="oscillator_parametric"?[3,4]:
    result.operation==="evolve"||result.operation==="oscillator_evolve"||result.operation==="oscillator_drive"||
    result.operation==="oscillator_pulse"||result.operation==="oscillator_damped"||result.operation==="cavity"?[1,2]:[1,3];
  const names=cols.map(index=>result.data.columns[index]);
  return {axes:{x:axis("Time","normalized"),y:axis("Recorded value","per series")},
    series:names.map(label=>({label,unit:columnUnit(label)})),plottedSamples:result.data.rows};
}
