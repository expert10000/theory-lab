import {
  verifyScenePayload,
  type QuantumScene,
  type SceneObject,
  type ScenePayload,
} from "./index";
export type SceneDigest = (bytes: Uint8Array) => Promise<string>;
/** Data-only, CSP-safe construction. Filesystem/worker policy stays in the host. */
export class SceneBuilder {
  readonly payload: ScenePayload;
  constructor(
    readonly scene: QuantumScene,
    readonly digest: SceneDigest,
  ) {
    this.payload = { scene, artifacts: {} };
  }
  async data(id: string, values: number[], components: 1 | 3, unit: string) {
    const bytes = new Uint8Array(values.length * 8),
      view = new DataView(bytes.buffer);
    values.forEach((v, i) => view.setFloat64(i * 8, v, true));
    const path = `${id}.f64`;
    this.scene.datasets.push({
      id,
      path,
      format: "f64le",
      components,
      count: values.length / components,
      unit,
      bytes: bytes.length,
      sha256: await this.digest(bytes),
    });
    this.payload.artifacts[path] = bytes;
    return id;
  }
  object(
    id: string,
    label: string,
    kind: SceneObject["kind"],
    positions: string,
    color: string,
    refs: Partial<SceneObject> = {},
  ) {
    this.scene.objects.push({
      id,
      label,
      kind,
      positions,
      visible: true,
      style: { color, opacity: 1, size: kind === "point-cloud" ? 0.15 : 1 },
      ...refs,
    });
  }
  async finish() {
    await verifyScenePayload(this.payload, this.digest);
    return this.payload;
  }
}
