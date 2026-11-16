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
