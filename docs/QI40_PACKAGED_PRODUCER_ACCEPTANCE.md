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

## Fresh packaged QWZ continuation

The extended acceptance harness at Theory Lab `51f59ef` was rerun against the
same unpacked candidate and recorded executable SHA-256. It also computed a new
QWZ run in the frozen worker: mass `-1`, grid `21×21`, Chern `-1`, and bulk
gap `2`. The saved result bytes matched the stored result SHA-256. A wrong
hash was refused, then the packaged Lab launched a new two-scene study with
`attach` mode. Both scene bundles passed their file hashes, source identities,
and exact Float64 comparisons of curvature and supplied band arrays against
the saved worker result.

One local run produced this evidence. Fresh run IDs and hashes vary between
runs and are recorded as observations, not fixed golden values.

| Fresh-run artifact | Observed SHA-256 |
| --- | --- |
| Saved result, run `run-6559d160eb3c41f28d6614f058860f01` | `0e80b15bcc9077e4df3b3157d04cdc57e31964406fc2f485b9e725d702778185` |
| Study manifest | `8f891b585a2d93ddae8f6f53e86dfd2aba301d457ccd3316d4ba4f3895471ecf` |
| Curvature scene JSON | `13553d0ff59b6c9b2b197dd5de814fe5c2ad18326d6bc59f5872ebf4376f4460` |
| Bands scene JSON | `807cc7bef8ebab85a66d5efa58e477de51d053d3e3347666d8c424bad2f592dd` |
| Acceptance JSON | `c397e9043deadeeb1373cdea3c8266220259c8735598e595fec1dccb9ea232c3` |

The ignored local record is
`artifacts/qi40-package-2026-11-15-r2/packaged-producer-acceptance-v2.json`.
The [manual Windows workflow](../.github/workflows/qi40-packaged-producer.yml)
rebuilds an unpacked candidate, runs source and Electron handoff gates, then
archives the full candidate, hash ledger and packaged acceptance JSON. It has
not run remotely for this branch.

The Math3D target in both checks is a capture stub. These results do not
inspect Math3D rendering, retained memory, installer behavior, or native
Project rollback. The full installed two-app gates remain open in the
[QI-40 release disposition](RELEASE_2.0_QI40_DISPOSITION.md).
