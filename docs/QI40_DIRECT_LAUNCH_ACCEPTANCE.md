# QI-40 direct Math3D launch acceptance

Date: 2026-11-15

An exact installed-style Math3D executable was rejected by Theory Lab's
previously pinned candidate, despite its adjacent `resources/app.asar` file
being present. Electron's patched `fs.stat` reports an `.asar` archive as a
directory. The installed-target check required `isFile()` and raised
`Math3D installation is incomplete`. An Electron probe confirmed that
`original-fs.stat` reports the same archive as a file. Commit `f026d7c`
uses `original-fs` for this check and leaves the executable and source
checkout checks intact.

## Reproduce the fixed unpacked build

On Windows, from this repository root:

```powershell
npm run typecheck
npm run package:win:dir
$lab = (Resolve-Path 'release/win-unpacked/Quantum Hamiltonian Lab.exe').Path
$math3d = (Resolve-Path 'artifacts/qi40-matched-candidate-2026-11-15/math3d/app/Math3D.exe').Path
npm run accept:qi40-direct-launch -- $lab 45c83b308ca5b2d887f56698ea32d1427d0cdf2b8c13179ff8fc8946a0b44102 $math3d 910ac76dcfe60037302c74e4690f8c621927e305bab6f540dadf8d23b10b2406 artifacts/qi40-matched-acceptance-2026-11-15-r3/retained artifacts/qi40-direct-launch-2026-11-15-r2
npm run verify:qi40-direct-launch -- $lab $math3d artifacts/qi40-matched-acceptance-2026-11-15-r3/retained artifacts/qi40-direct-launch-2026-11-15-r2
```

Use a new evidence directory for a new acceptance run. The executable hashes
above identify the observed local builds; rebuilds may have different hashes.
The command loads the previously verified saved QWZ run into an isolated Lab
profile, checks that a wrong result hash is refused, and calls the real
`openQwzStudyInMath3D` bridge. It verifies the spawned Math3D process,
its Lab parent process, `--quantum-study ... new` arguments, and a renderer
process. It retains the generated handoff study and hashes every file.
The independent verifier compares that copied study with the saved producer
study, including both scene bundles.

## Observed result

| Item | Observation |
| --- | --- |
| Fixed unpacked Theory Lab executable | SHA-256 `45c83b308ca5b2d887f56698ea32d1427d0cdf2b8c13179ff8fc8946a0b44102` |
| Fixed Theory Lab `app.asar` / frozen worker | `1fbce580401e6a50541f5c096c7312bae63fad954ce14b475c703dfae7faab7c` / `b9c6d7935febdde1a7b4f69b5c946a22b6839b8dad491e4af027fee5bae2de1e` |
| Math3D executable extracted from build `42396101411` | SHA-256 `910ac76dcfe60037302c74e4690f8c621927e305bab6f540dadf8d23b10b2406` |
| Saved run / result | `run-8c43880d466242d482057ff92c0e2c87` / `32c4f12e554f650d290536c917a5f9bf1fe40956c5dcf234ec555f2dcaac5712` |
| Retained and directly launched study manifests | Both SHA-256 `9dc1fa326d46798853188bbe1ceea5b05d48fac76b2f2b2425b850eb59930494`; all scene and dataset files matched |
| Independently verified direct launch record | SHA-256 `be65034dd771fdf1201d05a40ffa2f20cc0a86680d3894b354a16f2ffca36039` |

The fixed packaged producer also passed its fresh-worker QWZ acceptance with
Chern −1 and supplied bulk gap 2. The direct launch run used a previously
retained saved run; it verified the new package's bridge and Math3D process
handoff. The prior matched candidate acceptance separately verified that
Math3D renders both views from this exact saved run. A deliberately changed
copy of a directly launched `scene.json` was rejected by
`verify:qi40-direct-launch`.

This is still an **unpacked** Theory Lab build and an extracted Math3D app.
It does not prove a newly installed Theory Lab or an installed Math3D launch,
nor does process evidence replace visual inspection of that launched window.
The pinned Theory Lab installer in build `42396101411` predates this fix and
must not be used to claim the direct-launch gate. A new installer pair needs
the exact-hash installation matrix and 80-cycle memory check before QI-40
certification. The local artifacts are ignored by Git and must be preserved
separately for release review.
