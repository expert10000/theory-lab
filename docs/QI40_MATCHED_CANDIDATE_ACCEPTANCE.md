# QI-40 matched installer-pair acceptance

Date: 2026-11-15

The [nonpublishing Math3D build 42396101411](https://github.com/expert10000/Math3D/actions/runs/42396101411)
contains a Math3D installer and a Theory Lab installer in one
`two-app-stable-candidate` artifact. Both exact installers were hashed and
unpacked. The unpacked Theory Lab app computed a fresh QWZ run, published a
two-scene study, and retained its saved run. The unpacked Math3D app then
opened both scenes from that retained study in a new Project.

## Reproduce on Windows

Install Node dependencies with `npm ci` and put 7-Zip's `7z` on `PATH`.
Download the candidate artifact and place its manifest and two installers
together. From this repository root, using new output directories:

```powershell
npm run extract:qi40-candidate -- artifacts/math3d-qi40-final-candidate/candidate-manifest.json artifacts/qi40-matched-candidate-2026-11-15
npm run accept:qi40-matched -- artifacts/math3d-qi40-final-candidate/candidate-manifest.json artifacts/qi40-matched-candidate-2026-11-15/extraction.json artifacts/qi40-matched-acceptance-2026-11-15-r3
npm run verify:qi40-matched -- artifacts/math3d-qi40-final-candidate/candidate-manifest.json artifacts/qi40-matched-candidate-2026-11-15/extraction.json artifacts/qi40-matched-acceptance-2026-11-15-r3
```

`extract:qi40-candidate` checks both installer hashes before extraction and
records hashes for each embedded app archive, executable, and `app.asar`.
`accept:qi40-matched` runs the packaged producer, independent retained-input
check, and Math3D consumer against those unpacked applications. It writes
`matched-acceptance.json`, `retained/`, and `consumer/` with its own
`acceptance.json` and two screenshots. It invokes the independent verifier
before reporting success. The verifier rehashes the candidate files and
screenshots, checks cross-app run identities, and rechecks all retained scene
bytes and Float64 arrays against the saved result. A changed copy of
`consumer/bands.png` was rejected.

## Observed matched run

| Item | SHA-256 or value |
| --- | --- |
| Candidate manifest | `fe2754b3738ed4224fc7889c1c041037e6d3f39a32079eefc143f048c88f4bb2` |
| Math3D installer / extracted executable | `1518115d4891701a53407a0e73a5a4b892b4d7e9d8a510e9388da30cb0afc3a2` / `910ac76dcfe60037302c74e4690f8c621927e305bab6f540dadf8d23b10b2406` |
| Theory Lab installer / extracted executable | `377707a7c917a5f1aabf7bc8cdc89f7ab44343800219bf6f562140664f815d25` / `e823ac30521a059f2d2c38ebbd00b8ebc1032df71c8f735546478bfd339b62dc` |
| Fresh saved QWZ run | `run-8c43880d466242d482057ff92c0e2c87`; result `32c4f12e554f650d290536c917a5f9bf1fe40956c5dcf234ec555f2dcaac5712` |
| QWZ science | mass −1, 21×21 grid, Chern −1, supplied bulk gap 2 |
| Curvature / bands scene | `0d4926170e3f19c78a7743d6129e44e7c50a2a7f9073045429a6385bf76f719d` / `2aaf3843ab8916bdafd1a41a0b71863fe570676e8a2fbbc4647d73e1a40ae483` |
| Retained ledger | `939d3c56396f12f86b70c6c1564edf5a47f0282073f03926546aced74da9cdd5` |
| Curvature / bands screenshot | `74adebaec195caf58c07f10fb4c7ad1b0293244fe2b7e9932df2e35ef2d96adc` / `35ee7ef7b21413426d1f991fc826470772c26a520592f1de8acddb5b997ca7ad` |

Both screenshots were visually inspected: the Berry-curvature surface and
the upper/lower energy surfaces rendered. The acceptance script checks the
verified bundle paths and source identity, 441 samples for each supplied
dataset, units, producer Chern value, and supplied bulk gap. Math3D may list
the two links in either order; each viewer is identified by its bundle path.

This is a sequential unpacked-app acceptance. The producer's launch target
is a capture stub, and the consumer opens the retained study via its CLI.
The [subsequent direct launch check](QI40_DIRECT_LAUNCH_ACCEPTANCE.md) found
that the pinned Theory Lab candidate rejects an installed-style Math3D target
because Electron treats `app.asar` as a directory through patched `fs.stat`.
A fixed unpacked Theory Lab build launched the paired Math3D app successfully.
That matched check does not exercise the installed deep link or installer execution on this
machine, Project rollback, or the 80-cycle memory budget. The [Math3D NSIS
record](https://github.com/expert10000/Math3D/blob/19484d0d/docs/evidence/quantum-qi40-nsis313-production-2026-11-07.md)
supplies separate installed setup evidence for these installer hashes. QI-40
certification remains open, with the installed memory result above target.

The generated artifacts are ignored by Git and must be preserved separately
if this local run is used in a release review.
