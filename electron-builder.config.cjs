"use strict";

/** Windows application package. The Python process is frozen separately and
 * stays outside app.asar with the contract schemas it validates at runtime. */
module.exports = {
  appId: "org.expert10000.quantum-hamiltonian-lab",
  productName: "Quantum Hamiltonian Lab",
  artifactName: "Quantum-Hamiltonian-Lab-Setup-${version}.${ext}",
  directories: { output: "release" },
  files: ["dist/main.cjs", "dist/preload.cjs", "dist/index.html", "dist/renderer.js", "package.json"],
  asar: true,
  extraResources: [
    { from: "build/packaged-worker/quantum-worker", to: "quantum-worker" },
    { from: "packages/contracts/schemas", to: "packages/contracts/schemas" },
    { from: "packages/quantum-scene/quantum-scene.v1.json", to: "packages/quantum-scene/quantum-scene.v1.json" },
    { from: "packages/quantum-scene/quantum-scene.v2.json", to: "packages/quantum-scene/quantum-scene.v2.json" },
  ],
  win: { target: "nsis" },
  nsis: { oneClick: false, perMachine: false, allowToChangeInstallationDirectory: true },
};
