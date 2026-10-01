/** The optional coarse control never clamps or replaces the exact draft. */
export function spectrumSliderValue(raw:string):number|null{
  if(raw.trim()==="")return null;
  const value=Number(raw);
  return Number.isFinite(value)&&value>=-10&&value<=10?value:null;
}
