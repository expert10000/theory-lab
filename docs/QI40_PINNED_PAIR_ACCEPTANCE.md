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
| Staged pair manifest | b761a82059351f3bcb8ebf286713e7d15ffabc4e4ef1199d85e5915fd385b5cc |

The old local Theory Lab setup
c95be1cfcee8e04cb698c3aa1333596d4502dd5ca940867d320c0e5878c3c3bd
contains the earlier 12,288-byte System.dll
3eb38ae99653a7dbc724132ee240f6e5c4af4bfe7c01d31d23faf373f9f2eaca.
The new verification script rejects it. That old setup and its earlier
unpacked acceptance are superseded by the pinned pair.

The pinned pair was staged as local-13a1de021ae74059, extracted from both
installers, and accepted through matched retained views and direct
Theory Lab-to-Math3D launch. The top-level acceptance self-verified against
its nested reports. Its run ID is
run-821bedf27d7c4d6682ba625ecc3404f0; result SHA-256 is
768c03dd6b0d54de8066303fddace02c8e4cfdcb1da545ca8ca642c77ed9447d;
launched study SHA-256 is
d9af7305809603bc9d42ce7f015c27902faa61acd2f4c3811da2dcb3a119e4d4.
The matched and direct acceptance report hashes are respectively
2cda576509da9e7cff57e7ecd5f1793252cc4e398bdb05ce25d461cfc899b072
and 8b8e96eece738bd62c5b5e9a1255569e66426879e9d59046d7976003a5bcd70f.

This is **unpacked application evidence**. It does not establish clean
installation reliability or close Math3D's retained-memory release gate.
Those installed checks remain necessary before QI-40 certification.

To reproduce the pinned Theory Lab setup on Windows, install the locked
dependencies and run npm run package:win:installer:qi40. The build
downloads the hash-pinned NSIS bundle and verifies the component actually
embedded in the resulting setup.
