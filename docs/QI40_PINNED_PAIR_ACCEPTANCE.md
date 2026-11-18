# QI-40 pinned installer pair, 2026-11-16

The replacement Theory Lab installer was built from app source
84238d503ebe237c1e92b47087ab144ec4c18674 with the pinned NSIS 3.13
bundle used by Math3D. The bundle archive SHA-256 is
c18e9ad9684cf4c5bbd7b768cbf1b056d40771d7bd9ae1b513346452decf89d2.
The setup's extracted System.dll is 30,208 bytes with SHA-256
1556ee1bf1cb477124e1269b534ed81653ba71994dab7903ee3782b75acc2810.
The same component hash was verified in the pinned Math3D setup.

| Artifact | SHA-256 |
| --- | --- |
| Math3D Setup 1.7.0.exe, source run 42396101411 | 1518115d4891701a53407a0e73a5a4b892b4d7e9d8a510e9388da30cb0afc3a2 |
| Quantum-Hamiltonian-Lab-Setup-0.1.0.exe, local pinned build | 13a1de021ae74059d3cbf041f2d5471e609bc6030188febd5d5354cdaa7305be |
| Component-checked pair manifest | 9ac66e97f80acab898a43b263e96d37e4b46dc6723233d0fe9317befd25092d9 |

The old local Theory Lab setup
c95be1cfcee8e04cb698c3aa1333596d4502dd5ca940867d320c0e5878c3c3bd
contains the earlier 12,288-byte System.dll
3eb38ae99653a7dbc724132ee240f6e5c4af4bfe7c01d31d23faf373f9f2eaca.
The new verification script rejects it. That old setup and its earlier
unpacked acceptance are superseded by the pinned pair.

The pinned pair was staged as local-13a1de021ae74059, extracted from both
installers, and accepted through matched retained views and direct
Theory Lab-to-Math3D launch. The top-level acceptance independently reopens
both setup archives and checks the embedded component as well as its nested
reports. Its latest checked run ID is run-73a42c38e750439bb506de6eb8bacc98;
result SHA-256 is
3f8ad785e7ca05d356e0eee381b78d3e9ffdd4b1d27b6eba0ffbecff2326fd0b;
launched study SHA-256 is
37d7fe965b2cd048ce276638299e8d266af007d15c734ef9195da28bafd362b9.
The matched and direct acceptance report hashes are respectively
07fa11f6c54c96f5a6746fd76517f58e688701e6249da221e67be48df62a1cea
and 42d23ceccb0760b422bded2e5dfe60a8228641b045cbbc8836e1124e2bca2f4c.

This is **unpacked application evidence**. It does not establish clean
installation reliability or close Math3D's retained-memory release gate.
Those installed checks remain necessary before QI-40 certification.

To reproduce the pinned Theory Lab setup on Windows, install the locked
dependencies and run npm run package:win:installer:qi40. The build
downloads the hash-pinned NSIS bundle and verifies the component actually
embedded in the resulting setup.

The manual QI-40 packaged producer workflow also builds the pinned setup,
checks that its app.asar and frozen worker match the accepted unpacked
producer, and archives the exact setup with component and payload hashes.

The same workflow now silently installs that setup in a new Windows runner
directory. Its probe records the setup exit code and compares the installed
executable, app.asar, and frozen worker with the just-packaged files. On
success, it computes a fresh QWZ run from the installed executable, retains
the study and source files, and independently verifies the probe and retained
evidence. A failed install retains an error record and matching Windows
Application Error details when available.

This adds one clean-runner installed Theory Lab producer check. Math3D is a
launch capture stub in that check. The two-app installed scene and retained
memory gates still require their own evidence.

## Installed unsigned Dev pair diagnostic, 2026-11-18

The [clean Windows pair run](https://github.com/expert10000/Math3D/actions/runs/44282845421)
installed both setups and passed its candidate, installation, fresh producer,
direct launch, and two-view checks. The archived `installed-pair.json` in
artifact `qi40-unsigned-dev-pair-44097555120` records these exact inputs:

| Installed application | Source commit | Setup SHA-256 | Installed executable SHA-256 | NSIS System.dll SHA-256 |
| --- | --- | --- | --- | --- |
| Math3D Dev 2.0.0 | `f53b14614f5f5598b949347af52ef133b2e04fdb` | `76fee0efde77174a55f151753ce450fa0f2add17d1d98a772fa541cd11d281ee` | `4081af0e1aa0cf2960cc7f2c65cc4cd5a280e62426843622dfc73a5be72632fd` | `3eb38ae99653a7dbc724132ee240f6e5c4af4bfe7c01d31d23faf373f9f2eaca` |
| Theory Lab 0.1.0 | `34654af10ae070dd0cc02e5fb58a9f2197f49a4a` | `1f5e9a1f9944980c446b77edc7a320ac02f94f364fb3e41b9900a9e1b7135e2b` | `11a9744bda5a65229ec0e7b8e4e4f60ba9933fabeebb7daa11a11f79a5b0f1fb` | `1556ee1bf1cb477124e1269b534ed81653ba71994dab7903ee3782b75acc2810` |

The installed Lab computed fresh run `run-ff37cdc374234d62bd1e78c20e7b1384`
with result SHA-256 `352a397b0caadc3d83d83938341afd671afd8e37c347814e6a6a7b50ef324c2b`.
The direct-launch and consumer reports match that run and result. The consumer
opened the curvature and bands views and retained both screenshots.

The same workflow's installed Math3D QWZ 80-cycle check reported 150,148 bytes
of late heap growth against the provisional 2,097,152-byte target. This is a
passing diagnostic for this unsigned Dev pair. Math3D Dev's embedded NSIS
component is the earlier unpinned hash above; a signed stable 2.0 candidate
was not produced because release signing configuration was absent. The signed
exact-candidate pair, repeatable installation, and broader retained-memory
release gates remain open.

## Retained source replay follow-up, 2026-11-18

Math3D retained [41 byte-exact files from this pair](https://github.com/expert10000/Math3D/blob/b66c1b46/tests/fixtures/quantum-qi40-fresh-pair-artifact/README.md),
including the fresh run, both complete scene bundles, study, acceptance
reports, and screenshots. The installed-pair report SHA-256 is
`f4c2c74ab1c87f398454bf9297d641e329550df04d583427125f661355d00a42`.
The [clean Windows source replay](https://github.com/expert10000/Math3D/actions/runs/44298131950)
used those exact bytes with `MATH3D_E2E=0` and passed the full QWZ Study and
Graph journey through restart, source refusal, and independent Project
transfer. Its [review receipt](https://github.com/expert10000/Math3D/blob/53e57585/docs/releases/2.0.0/evidence/qi40-production-runtime-source-ci-b66c1b46.json)
records the grid and independent band-gap and curvature-integral checks.

This is a reproducible source-Math3D replay of input from the installed Lab,
not a new installed Math3D journey. The signed exact-candidate pair and
mixed-route retained-memory gates remain open.
