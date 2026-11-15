# Quantum QI-40 disposition for a proposed 2.0.0 release

Date: 2026-11-06  
Theory Lab source: `38842c8`  
Math3D source originally reviewed: `845465482e436e053db42617bb3434c7e5303030`  
Latest installed candidate measured: `ffc4f4a6832cd765947c0786f9b3f025c512cc19`

## Release decision

**QI-40 integration certification and the cross-app release freeze are withheld.**
The proposed 2.0.0 release may describe the QWZ Study as a bounded,
source-level workflow: one hash-verified saved QWZ run produces curvature and
supplied-band scenes, a study handoff names both scene roles, and Math3D checks
the scene files before opening them. This is a claim about the implemented
contracts and source tests, not certification of a fresh installed two-app
release, every Project downgrade, or a general Quantum Study platform.

Do not call the installed QWZ Study, QI-40, or the wider Quantum integration
"certified" in release notes until the gates below have installed-build
evidence for the exact release binaries. If 2.0.0 ships before then, label this
workflow **preview** and keep the current `quantum-scene/v1|v2` read-only
import path available. Do not promise that a Project saved after native scene
promotion opens for editing in a prior Math3D version.

## Evidence and open gates

| Gate | Current evidence | Required before a full QI-40 claim |
| --- | --- | --- |
| QWZ source parity | Exact saved-run hash, deterministic curvature/band recipes, verified two-scene handoff, and cross-language golden checks are recorded in the [result descriptor](quantum-result-v2-qwz.md), [recipe record](qwz-scene-recipes.md), and [handoff record](qwz-study-math3d-fork.md). | Run the final two-app matrix against the exact 2.0.0 candidate binaries and record scene hashes and visual inspection. |
| Installed memory | The [latest main-based candidate build](https://github.com/expert10000/Math3D/actions/runs/42232023714) at Math3D `ffc4f4a`, installer SHA-256 `c157d9aeeabe141290f5c7420efed86c0dd4b5b0ae9a3eff78057c61e1b06bf0`, passed the targeted exact-hash installation and packaged-worker checks. Its [Rice–Mele/hydrogen 80-cycle run](https://github.com/expert10000/Math3D/actions/runs/42303785120) grew **3,127,924 bytes** from closed cycle 20 to 80; its [QWZ curvature/bands run](https://github.com/expert10000/Math3D/actions/runs/42303788971) grew **11,246,092 bytes**. Both exceed the provisional **2,097,152-byte** target, observed context loss, and held WebGL contexts at 1 → 1 and textures at 5 → 5. A prior [patched candidate](https://github.com/expert10000/Math3D/actions/runs/42227831319) likewise failed at **2,990,092** and **10,545,992 bytes** for the two workloads. [Late-heap diagnostics](https://github.com/expert10000/Math3D/actions/runs/42230512462) found retained QWZ triangle/vertex objects rooted through React props on a native node. [E2E-hook ablation](https://github.com/expert10000/Math3D/actions/runs/42232801234) still grew **7,658,940 bytes** on QWZ source. A [120-cycle QWZ source run](https://github.com/expert10000/Math3D/actions/runs/42303876095) gained another **7,096,372 bytes** after cycle 80, so it had not plateaued. | Reduce retained QWZ preview objects, pass the 80-cycle total heap and resource budget on the exact final installer, and repeat the result for stability. |
| Installer reliability | The [Math3D QI-40 record](https://github.com/expert10000/Math3D/blob/cd3cc5221734232d4d60055917e28ab5c4c05a7b/docs/quantum-math3d-integration-roadmap-2026-11-04.md#qi-40--integration-certification--release-freeze) records intermittent `0xC0000005` setup failures in `System.dll` for both archived installers. A [full-dump replay](https://github.com/expert10000/Math3D/blob/04f93609dd/docs/evidence/quantum-qi40-geometry-workbook-full-dump-2026-11-06.md) reproduced the Theory Lab fault and found `System!Store`/`System!Call` tokens without a verified ordered stack. The [newer main-based candidate signoff](https://github.com/expert10000/Math3D/actions/runs/42232023714) also failed: one installer exited `0xC0000005`, and the pre-QEC rollback installer timed out after 180 seconds. The trigger remains unresolved. | Diagnose or remove the failure mode and pass a repeatable clean-runner installation matrix for exact candidate hashes. |
| Native Project rollback | A [pinned installed rollback](https://github.com/expert10000/Math3D/blob/cd3cc5221734232d4d60055917e28ab5c4c05a7b/docs/evidence/quantum-qi40-cleanup-installer-native-rollback-2026-11-06.md) classified a Project with promoted native Geometry as preview-only. A [later installed run](https://github.com/expert10000/Math3D/actions/runs/42219564141) passed the six exact scene references, v1/v2 readers, and a Project with promoted Graph2D across the pinned rollback. That result does not establish rollback editing for promoted Geometry or every native adapter. | Demonstrate a supported downgrade path for promoted native documents, or explicitly exclude downgrade editing and provide a verified pre-upgrade backup/export path. Keep pinned v1/v2 readers and exact fingerprints in the check. |

## Checks on the current Theory Lab source

On 2026-11-06, `npm run typecheck`, `npm test`, `npm run test:scenes`, and
`npm run test:worker` passed locally. The TypeScript suite reported 256 passes
and one skip; the worker suite reported 140 tests with three skips. These
checks support the producer and scene claims above. They do not exercise a
Math3D installer or close the installed gates. A final candidate build must
be recorded separately.

A later [local packaged Theory Lab producer check](QI40_PACKAGED_PRODUCER_ACCEPTANCE.md)
records an unpacked Windows executable and exact QWZ scene hashes. Its initial
check used a saved fixture; an extended check computed a fresh QWZ run and
verified both scene arrays against the saved worker result. Both checks used a
Math3D launch capture stub, so the installed two-app gates above remain open.
The [portable consumer handoff](QI40_CONSUMER_HANDOFF.md) now retains and
independently rechecks a fresh QWZ run and its two scene bundles. It supplies
input for the installed Math3D matrix; it does not replace that matrix.

The QI-40 release decision is **open** until every required gate passes for
identified artifacts, or the published release text stays within the preview
scope above. See the [Math3D QI-40 roadmap](https://github.com/expert10000/Math3D/blob/cd3cc5221734232d4d60055917e28ab5c4c05a7b/docs/quantum-math3d-integration-roadmap-2026-11-04.md#qi-40--integration-certification--release-freeze)
for the full cross-repository acceptance criteria.
