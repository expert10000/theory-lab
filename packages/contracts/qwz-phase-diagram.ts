export interface QwzPhasePoint {
  mass: number; grid: number; runId: string; resultSha256: string;
  chern: number | null; bulkGap: number; meshResolved: boolean; gapClosed: boolean;
  scenes: { curvature: string; bands: string };
}
export interface QwzPhaseDiagram {
  schema: "quantum-phase-diagram/v1"; studyId: string; model: "qwz"; computedAt: string;
  axes: { mass: number[]; grid: number[] };
  points: QwzPhasePoint[];
}
const id = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const hash = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export function assertQwzPhaseDiagram(value: unknown): asserts value is QwzPhaseDiagram {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid phase diagram");
  const map = value as QwzPhaseDiagram;
  if (map.schema !== "quantum-phase-diagram/v1" || !id(map.studyId) || map.model !== "qwz" ||
      typeof map.computedAt !== "string" || !Number.isFinite(Date.parse(map.computedAt)) ||
      !map.axes || !Array.isArray(map.axes.mass) || !Array.isArray(map.axes.grid) ||
      !map.axes.mass.length || !map.axes.grid.length || map.axes.mass.length > 64 || map.axes.grid.length > 32 ||
      !map.axes.mass.every(Number.isFinite) || !map.axes.grid.every(n => Number.isInteger(n) && n >= 11 && n <= 31) ||
      !map.axes.mass.every((n, i) => i === 0 || n > map.axes.mass[i - 1]) ||
      !map.axes.grid.every((n, i) => i === 0 || n > map.axes.grid[i - 1]) ||
      !Array.isArray(map.points) || !map.points.length || map.points.length > 64)
    throw new Error("Invalid phase diagram axes or points");
  const cells = new Set<string>(), runs = new Set<string>();
  for (const point of map.points) {
    if (!point || !map.axes.mass.includes(point.mass) || !map.axes.grid.includes(point.grid) ||
        !id(point.runId) || !hash(point.resultSha256) || !point.scenes ||
        !id(point.scenes.curvature) || !id(point.scenes.bands) ||
        !(point.chern === null || Number.isInteger(point.chern) && Math.abs(point.chern) <= 4) ||
        !Number.isFinite(point.bulkGap) || point.bulkGap < 0 ||
        typeof point.meshResolved !== "boolean" || typeof point.gapClosed !== "boolean" ||
        (point.gapClosed || !point.meshResolved) && point.chern !== null)
      throw new Error("Invalid phase point or unresolved Chern claim");
    const cell = `${point.mass}:${point.grid}`;
    if (cells.has(cell) || runs.has(point.runId)) throw new Error("Duplicate phase cell or source run");
    cells.add(cell); runs.add(point.runId);
  }
}
