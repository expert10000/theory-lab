# QI-40 unpacked Math3D consumer acceptance

Date: 2026-11-15

The retained packaged Theory Lab QWZ run was opened in the Math3D application
extracted from the [nonpublishing candidate build 42396101411](https://github.com/expert10000/Math3D/actions/runs/42396101411).
This checks a real Math3D viewer with an isolated profile and `MATH3D_E2E=1`.
It is an unpacked-app check; it does not exercise installation, rollback, or
the installed 80-cycle memory workload.

## Reproduce

Download the `two-app-stable-candidate` artifact from that build. Verify the
included `candidate-manifest.json`, Math3D installer, and Theory Lab installer.
Extract `Math3D Setup 1.7.0.exe` with 7-Zip, then extract
`$PLUGINSDIR/app-64.7z` to obtain `Math3D.exe` and its app resources. From the
Theory Lab repository root, with the [retained QWZ input](QI40_CONSUMER_HANDOFF.md):

```powershell
npm run accept:qi40-math3d -- artifacts/math3d-qi40-extracted/app/Math3D.exe 910ac76dcfe60037302c74e4690f8c621927e305bab6f540dadf8d23b10b2406 artifacts/qi40-retained-2026-11-15 --candidate artifacts/math3d-qi40-final-candidate/candidate-manifest.json --evidence artifacts/qi40-math3d-consumer-2026-11-15
```

The evidence directory must be new. The command independently verifies the
retained input, hashes the Math3D executable and both candidate installers,
opens `freshStudy/` with Math3D's `--quantum-study ... new` path, stages both
scene links, and opens each scene in the read-only viewer. It writes
`acceptance.json`, `curvature.png`, and `bands.png` with screenshot hashes.

## Observed result

| Item | Exact observation |
| --- | --- |
| Math3D source / installer | `2fa47e8870c74a96b9ff80ebb7c5c5bb50fd669f` / SHA-256 `1518115d4891701a53407a0e73a5a4b892b4d7e9d8a510e9388da30cb0afc3a2` |
| Extracted Math3D.exe | SHA-256 `910ac76dcfe60037302c74e4690f8c621927e305bab6f540dadf8d23b10b2406` |
| Candidate Theory Lab installer | SHA-256 `377707a7c917a5f1aabf7bc8cdc89f7ab44343800219bf6f562140664f815d25` |
| Retained run | `run-d0f3d7a5892641bd8df37c6e5f342fb5`; result SHA-256 `b840f09a3a610fde8a0c3c589d90546b3c490fa55e505d60b41c0b0e1adc1e9f` |
| Math3D handoff | Two exact QWZ scene links staged in a new Project; both verified and opened |
| Curvature view | 21×21, 441 supplied samples, producer Chern −1, kx/ky/Berry-curvature axes; visible 3D surface |
| Bands view | Two 441-sample supplied energy arrays, bulk gap 2 normalized energy, kx/ky/energy axes; visible upper and lower surfaces |
| Captured images | `curvature.png` SHA-256 `4d0b406aeedf24853a1020d2f6b4e89c59da40f24d629d34a083e2b8959b8552`; `bands.png` SHA-256 `2db927627b548cfe78a6d5c06ae45ce3146c85594eb4433aac1f50bf6e97c443` |

Both screenshots were visually inspected. The local evidence directory is
ignored by Git; preserve it when transferring the result. The packaged
Theory Lab producer used for the retained run is a separately built unpacked
executable, SHA-256 `94929ab6dba1a526ea995434846a958e1f0fc65cf1f8c07991bad10c0b2b7f23`.
Its bytes are not the candidate Theory Lab installer above, so this check
does not assert exact two-app installed parity.

A [later matched-installer acceptance](QI40_MATCHED_CANDIDATE_ACCEPTANCE.md)
uses a fresh run from the Theory Lab app extracted from that candidate's
Theory Lab installer and opens it in the paired extracted Math3D app.

The [Math3D NSIS 3.13 production record](https://github.com/expert10000/Math3D/blob/19484d0d/docs/evidence/quantum-qi40-nsis313-production-2026-11-07.md)
reports that the same final installer pair passed 18/18 install probes on each
of Windows 2022 and Windows latest, and its installed UI/QEC, rollback, and
upgrade jobs passed. The old rollback installer had an intermittent crash in
an earlier run. The installed memory run for a preceding current-main
candidate still measured 2,832,516 bytes against the provisional 2,097,152
byte limit. Full QI-40 certification remains open until the installed memory
and final exact-candidate cross-app gates pass.
