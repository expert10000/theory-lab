import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EVOLUTION_COLUMNS, type EvolutionSample } from "./evolution";

type View = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  arrow: THREE.ArrowHelper;
  marker: THREE.Mesh;
};

function blochPoint(x: number, y: number, z: number) {
  return new THREE.Vector3(x, z, -y);
}

function circle(
  scene: THREE.Scene,
  color: number,
  position: (angle: number) => THREE.Vector3,
) {
  const points = Array.from({ length: 129 }, (_, i) =>
    position((i / 128) * Math.PI * 2),
  );
  scene.add(
    new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 }),
    ),
  );
}

export function BlochSphere({
  data,
  sample,
}: {
  data: Float64Array;
  sample: EvolutionSample;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<View | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFallback(true);
      return;
    }
    setFallback(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
    camera.position.set(2.7, 2.0, 3.0);
    camera.lookAt(0, 0, 0);

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 24),
      new THREE.MeshBasicMaterial({
        color: 0x4b837e,
        transparent: true,
        opacity: 0.075,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    scene.add(shell);
    circle(
      scene,
      0x8bc9ba,
      (a) => new THREE.Vector3(Math.cos(a), 0, Math.sin(a)),
    );
    circle(
      scene,
      0x506c85,
      (a) => new THREE.Vector3(Math.cos(a), Math.sin(a), 0),
    );
    circle(
      scene,
      0x506c85,
      (a) => new THREE.Vector3(0, Math.sin(a), Math.cos(a)),
    );
    for (const [direction, color] of [
      [new THREE.Vector3(1, 0, 0), 0xa5b9e8],
      [new THREE.Vector3(0, 1, 0), 0xe2e7ef],
      [new THREE.Vector3(0, 0, -1), 0xdd9cc5],
    ] as const) {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          direction.clone().multiplyScalar(-1.12),
          direction.clone().multiplyScalar(1.12),
        ]),
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.55,
        }),
      );
      scene.add(line);
    }
    const rows = data.length / EVOLUTION_COLUMNS;
    const step = Math.max(1, Math.ceil(rows / 1400));
    const positions: THREE.Vector3[] = [];
    for (let i = 0; i < rows; i += step)
      positions.push(
        blochPoint(data[i * 10 + 3], data[i * 10 + 4], data[i * 10 + 5]),
      );
    if ((rows - 1) % step !== 0)
      positions.push(
        blochPoint(
          data[(rows - 1) * 10 + 3],
          data[(rows - 1) * 10 + 4],
          data[(rows - 1) * 10 + 5],
        ),
      );
    scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(positions),
        new THREE.LineBasicMaterial({
          color: 0x85e4ca,
          transparent: true,
          opacity: 0.72,
        }),
      ),
    );
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(),
      1,
      0xffca80,
      0.16,
      0.08,
    );
    scene.add(arrow);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffdfa8 }),
    );
    scene.add(marker);
    mount.appendChild(renderer.domElement);
    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    view.current = { renderer, scene, camera, arrow, marker };
    resize();
    return () => {
      view.current = null;
      observer.disconnect();
      scene.traverse((object) => {
        if (
          "geometry" in object &&
          object.geometry instanceof THREE.BufferGeometry
        )
          object.geometry.dispose();
        if ("material" in object) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          for (const material of materials)
            if (material instanceof THREE.Material) material.dispose();
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      mount.removeChild(renderer.domElement);
    };
  }, [data]);

  useEffect(() => {
    const current = view.current;
    if (!current) return;
    const position = blochPoint(...sample.bloch);
    const radius = position.length();
    current.arrow.setDirection(
      radius > 1e-12
        ? position.clone().normalize()
        : new THREE.Vector3(0, 1, 0),
    );
    current.arrow.setLength(Math.max(radius, 0.001), 0.16, 0.08);
    current.marker.position.copy(position);
    current.renderer.render(current.scene, current.camera);
  }, [sample]);

  return (
    <div
      className="bloch-panel"
      role="img"
      aria-label="Bloch sphere and evolution trajectory"
    >
      <div className="bloch-panel-head">
        <span>BLOCH SPHERE</span>
        <small>TRAJECTORY / LIVE STATE</small>
      </div>
      <div className="bloch-canvas" ref={host} data-testid="bloch-canvas">
        {fallback && (
          <svg
            className="bloch-fallback"
            viewBox="0 0 300 300"
            aria-label="Bloch projection fallback"
          >
            <circle cx="150" cy="150" r="108" fill="#17302f" stroke="#6cae9e" />
            <ellipse
              cx="150"
              cy="150"
              rx="108"
              ry="34"
              fill="none"
              stroke="#6cae9e"
            />
            <line x1="150" x2="150" y1="40" y2="260" stroke="#b7c6d4" />
            <line x1="45" x2="255" y1="150" y2="150" stroke="#b7c6d4" />
            <line
              x1="150"
              y1="150"
              x2={150 + sample.bloch[0] * 100}
              y2={150 - sample.bloch[2] * 100}
              stroke="#ffca80"
              strokeWidth="3"
            />
            <circle
              cx={150 + sample.bloch[0] * 100}
              cy={150 - sample.bloch[2] * 100}
              r="5"
              fill="#ffca80"
            />
          </svg>
        )}
      </div>
      <div className="bloch-axis-labels">
        <span>x / ⟨σx⟩</span>
        <span>y / ⟨σy⟩</span>
        <span>z / ⟨σz⟩</span>
      </div>
    </div>
  );
}
