# QI-40 portable consumer handoff

Date: 2026-11-15

The packaged Theory Lab acceptance command can now retain a verified QWZ
source and both study folders for a later, independent Math3D check:

```powershell
$exe = (Resolve-Path 'artifacts/qi40-package-2026-11-15-r2/win-unpacked/Quantum Hamiltonian Lab.exe').Path
npm run accept:packaged-qwz -- $exe 94929ab6dba1a526ea995434846a958e1f0fc65cf1f8c07991bad10c0b2b7f23 --retain artifacts/qi40-retained-2026-11-15
npm run verify:qi40-retained -- artifacts/qi40-retained-2026-11-15
```

The retention directory must be new. It contains:

| Path | Contents |
| --- | --- |
| `acceptance.json` | Packaged worker, fixture, and fresh-run acceptance result |
| `artifact-hashes.json` | SHA-256 for every copied file and the acceptance record |
| `freshRun/` | Exact saved QWZ job, result, and run manifest |
| `freshStudy/` | Verified curvature and bands scene bundles plus study manifest |
| `fixtureStudy/` | Golden saved-fixture scene pair for comparison |

`verify:qi40-retained` uses only Node filesystem and crypto APIs. It checks
the copied files against the ledger, the saved run against its manifest, both
study manifests against their source identities, every scene and dataset hash,
and the fresh Float64 curvature and band samples against the saved result.
The command rejected a deliberately modified `freshRun/result.json`.

The local retained example has acceptance SHA-256
`1661a448c9c53e0337c9d5f39ec91bded4f2d272861915de59740527963bf691` and ledger SHA-256
`00c387a93ad8ddd287678c7ef7029ed62ded236c8dfbdbb0bbe8c3ad5c9d6c7a`.
Its fresh run is `run-d0f3d7a5892641bd8df37c6e5f342fb5`, with result
SHA-256 `b840f09a3a610fde8a0c3c589d90546b3c490fa55e505d60b41c0b0e1adc1e9f`.
These IDs and hashes are observations of one run; a fresh worker run creates
new identities.

The [manual Windows producer workflow](../.github/workflows/qi40-packaged-producer.yml)
uploads this retained folder alongside the complete unpacked Theory Lab
candidate and a `candidate-hashes.json` record. It has not run remotely on
this branch. The local folder is ignored by Git; keep or upload the generated
artifact when transferring it to the Math3D acceptance environment.

## Math3D acceptance still required

On a clean Windows machine, verify the exact Math3D installer and executable
hashes, then use Math3D's Project import path to open `freshStudy/` and
`fixtureStudy/`. Record the two scene roles, source run/result hashes, visible
curvature and supplied bands, and any import or rendering errors. Repeat with
the exact installed Theory Lab candidate, rather than assuming an unpacked
producer run proves an installer. Run Math3D's retained-memory and native
Project rollback gates for the same candidate versions.

The retained folder is producer evidence and a portable test input. It does
not certify installed Math3D rendering, installer reliability, retained
memory, or downgrade editing.
