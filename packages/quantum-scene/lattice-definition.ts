import type { Vec3 } from "./index";
export type LatticeFamily = "square" | "honeycomb" | "simple_cubic";
export function latticeDefinition(family: LatticeFamily) {
  if (family === "honeycomb")
    return {
      dimensions: 2 as const,
      translations: [
        [Math.sqrt(3), 0, 0],
        [Math.sqrt(3) / 2, 1.5, 0],
      ] as Vec3[],
      basis: [
        { label: "A", position: [0, 0, 0] as Vec3 },
        { label: "B", position: [0, 1, 0] as Vec3 },
      ],
    };
  return {
    dimensions: (family === "simple_cubic" ? 3 : 2) as 2 | 3,
    translations: (family === "simple_cubic"
      ? [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ]
      : [
          [1, 0, 0],
          [0, 1, 0],
        ]) as Vec3[],
    basis: [{ label: "A", position: [0, 0, 0] as Vec3 }],
  };
}
