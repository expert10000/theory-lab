export const EVOLUTION_COLUMNS = 10;

export interface ComplexValue {
  re: number;
  im: number;
}

export interface EvolutionSample {
  index: number;
  time: number;
  populations: readonly [number, number];
  bloch: readonly [number, number, number];
  amplitudes: readonly [ComplexValue, ComplexValue];
  density: readonly [
    readonly [ComplexValue, ComplexValue],
    readonly [ComplexValue, ComplexValue],
  ];
  trace: number;
  purity: number;
}

export function sampleAt(data: Float64Array, index: number): EvolutionSample {
  if (data.length % EVOLUTION_COLUMNS !== 0)
    throw new Error("Evolution artifact has an incomplete row");
  const rows = data.length / EVOLUTION_COLUMNS;
  if (!Number.isInteger(index) || index < 0 || index >= rows)
    throw new RangeError("Evolution sample index is out of range");
  const offset = index * EVOLUTION_COLUMNS;
  const p0 = data[offset + 1];
  const p1 = data[offset + 2];
  const c0 = { re: data[offset + 6], im: data[offset + 7] };
  const c1 = { re: data[offset + 8], im: data[offset + 9] };
  const coherence = {
    re: c0.re * c1.re + c0.im * c1.im,
    im: c0.im * c1.re - c0.re * c1.im,
  };
  return {
    index,
    time: data[offset],
    populations: [p0, p1],
    bloch: [data[offset + 3], data[offset + 4], data[offset + 5]],
    amplitudes: [c0, c1],
    density: [
      [{ re: p0, im: 0 }, coherence],
      [
        { re: coherence.re, im: -coherence.im },
        { re: p1, im: 0 },
      ],
    ],
    trace: p0 + p1,
    purity: p0 * p0 + p1 * p1 + 2 * (coherence.re ** 2 + coherence.im ** 2),
  };
}
