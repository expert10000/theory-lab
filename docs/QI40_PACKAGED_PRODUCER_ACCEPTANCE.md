# QI-40 packaged Theory Lab producer check

Date: 2026-11-15

This is a local Windows unpacked-app check from Theory Lab source `8209a2e`.
The package still identifies itself as version `0.1.0`; it is not a 2.0.0
installer or a final release candidate.

| Artifact | SHA-256 |
| --- | --- |
| `Quantum Hamiltonian Lab.exe` | `94929ab6dba1a526ea995434846a958e1f0fc65cf1f8c07991bad10c0b2b7f23` |
| `resources/app.asar` | `cfedcba926f9c134bee12affa2c32c7b83bc6f86f0da130e6d3205d864f7fabc` |
| `resources/quantum-worker/quantum-worker.exe` | `3eeafccf36683e05af53dab5d6646cd7c9546929120ff1ffd95eb32d3ec0715a` |

The executable was built with the pinned PyInstaller 6.16.0 worker and
electron-builder 26.0.12 using `npm run build`,
`node scripts/build-frozen-worker.mjs`, and
`npx electron-builder --win --dir --config electron-builder.config.cjs --config.directories.output=artifacts/qi40-package-2026-11-15-r2`.
The ignored local output is
`artifacts/qi40-package-2026-11-15-r2/win-unpacked`.

The acceptance command used the **recorded hash above** as its expected input:

```powershell
$exe = (Resolve-Path 'artifacts/qi40-package-2026-11-15-r2/win-unpacked/Quantum Hamiltonian Lab.exe').Path
npm run accept:packaged-qwz -- $exe 94929ab6dba1a526ea995434846a958e1f0fc65cf1f8c07991bad10c0b2b7f23
```

It passed worker readiness and the pinned two-level smoke energies, opened a
hash-verified saved QWZ fixture in the packaged Lab, refused a wrong result
hash, and launched a capture stub with the two-view study path. The written
study had curvature and bands roles, exact source identity, verified dataset
hashes, and these scene metadata hashes:

| Scene role | Scene JSON SHA-256 |
| --- | --- |
| Curvature | `38f8275bfd0e568251ef44742fe7ef412c958cb066e713558768cc2872af65b5` |
| Bands | `9759d1e5555fd8c7af7614a08e372593d55398894960f5d96eb41a349555890b` |

The study manifest SHA-256 was
`44a318144d8bb232aad91c50325e0c9f4204af8b22d34539e7aa2f42033c6323`.
The machine-readable local output is
`artifacts/qi40-package-2026-11-15-r2/packaged-producer-acceptance.json`.
A deliberately wrong executable SHA-256 was rejected before application
launch.

This test uses a previously verified saved QWZ fixture; it does not compute a
fresh QWZ run in the installed worker. The Math3D target is a capture stub, so
it does not inspect Math3D rendering, memory, installer behavior, or native
Project rollback. These remain open in the
[QI-40 release disposition](RELEASE_2.0_QI40_DISPOSITION.md).
