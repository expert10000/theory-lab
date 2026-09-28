export function scalarRange(values: Float64Array): [number, number] {
  let low = Infinity, high = -Infinity;
  for (const value of values) { low = Math.min(low, value); high = Math.max(high, value); }
  if (low < 0 && high > 0) { high = Math.max(-low, high); low = -high; }
  return [low, high];
}
export function scalarColor(value: number, low: number, high: number): [number, number, number] {
  const span = high - low;
  const scale = Math.max(Math.abs(low), Math.abs(high));
  const ratio = Number.isFinite(span) ? (value - low) / span : (value / scale - low / scale) / (high / scale - low / scale);
  const fraction = high === low ? .5 : Math.max(0, Math.min(1, ratio));
  return [fraction, .35 + .3 * (1 - Math.abs(2 * fraction - 1)), 1 - fraction];
}
