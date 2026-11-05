/** Display-only DFT of the saved P1 samples. Frequencies are cycles per model time unit. */
export function sampledPopulationSpectrum(data: Float64Array, rows: number):
  { frequency: number; magnitude: number }[] {
  if (!Number.isSafeInteger(rows) || rows < 3 || data.length !== rows * 10)
    throw new TypeError("Incomplete saved evolution grid");
  const start = data[0], stop = data[(rows - 1) * 10];
  const step = (stop - start) / (rows - 1);
  if (!Number.isFinite(step) || step <= 0) throw new TypeError("Invalid evolution time grid");
  const mean = Array.from({ length: rows }, (_, i) => data[i * 10 + 2])
    .reduce((sum, value) => sum + value, 0) / rows;
  const values = Array.from({ length: rows }, (_, i) => {
    const time = data[i * 10], population = data[i * 10 + 2];
    if (!Number.isFinite(time) || !Number.isFinite(population) ||
        Math.abs(time - (start + i * step)) > 1e-8 * Math.max(1, Math.abs(stop)))
      throw new TypeError("Evolution time grid is not uniformly recorded");
    return (population - mean) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (rows - 1)));
  });
  return Array.from({ length: Math.min(64, Math.floor(rows / 2)) }, (_, ordinal) => {
    const bin = ordinal + 1;
    let real = 0, imaginary = 0;
    for (let i = 0; i < rows; i++) {
      const phase = 2 * Math.PI * bin * i / rows;
      real += values[i] * Math.cos(phase);
      imaginary -= values[i] * Math.sin(phase);
    }
    return { frequency: bin / (rows * step), magnitude: 2 * Math.hypot(real, imaginary) / rows };
  });
}
