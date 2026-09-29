import type { SceneField } from "./index";

/** Pure data conversion for supplied regular Cartesian grids. No interpolation/normalization. */
export function regularGridFromZYX(
  x: readonly number[],
  y: readonly number[],
  z: readonly number[],
  field: unknown,
  quantity: "scalar" | "density" = "scalar",
): { grid: SceneField["grid"]; values: number[] } {
  if (!["scalar", "density"].includes(quantity))
    throw new Error("Unknown field quantity");
  const axes = [x, y, z];
  const steps = axes.map((axis) => {
    if (!Array.isArray(axis) || axis.length < 3 || axis.length > 49)
      throw new Error("Regular grid axes need 3..49 coordinates");
    for (let i = 0; i < axis.length; i++)
      if (
        typeof axis[i] !== "number" ||
        !Number.isFinite(axis[i]) ||
        Math.abs(axis[i]) > 1e6
      )
        throw new Error("Invalid grid coordinate");
    const step = (axis[axis.length - 1] - axis[0]) / (axis.length - 1);
    if (!(step > 0)) throw new Error("Regular grid axes must increase");
    for (let i = 0; i < axis.length; i++) {
      const expected = axis[0] + i * step;
      const tolerance =
        32 *
        Number.EPSILON *
        Math.max(1, Math.abs(expected), Math.abs(axis[i]));
      if (Math.abs(axis[i] - expected) > tolerance)
        throw new Error(
          "Nonuniform grid requires an explicit resampling adapter",
        );
    }
    return step;
  });
  const [nx, ny, nz] = axes.map((a) => a.length);
  if (!Array.isArray(field) || field.length !== nz)
    throw new Error("Field must have z/y/x shape");
  for (let iz = 0; iz < nz; iz++) {
    const layer = field[iz];
    if (!Array.isArray(layer) || layer.length !== ny)
      throw new Error("Field must have z/y/x shape");
    for (let iy = 0; iy < ny; iy++) {
      const row = layer[iy];
      if (!Array.isArray(row) || row.length !== nx)
        throw new Error("Field must have z/y/x shape");
      for (let ix = 0; ix < nx; ix++)
        if (
          typeof row[ix] !== "number" ||
          !Number.isFinite(row[ix]) ||
          Math.abs(row[ix]) > 1e100 ||
          (quantity === "density" && row[ix] < 0)
        )
          throw new Error("Invalid supplied field value");
    }
  }
  const values: number[] = [];
  for (let ix = 0; ix < nx; ix++)
    for (let iy = 0; iy < ny; iy++)
      for (let iz = 0; iz < nz; iz++) values.push(field[iz][iy][ix]);
  return {
    grid: {
      shape: [nx, ny, nz],
      origin: [x[0], y[0], z[0]],
      spacing: steps as [number, number, number],
      order: "xyz-z-fastest",
    },
    values,
  };
}
