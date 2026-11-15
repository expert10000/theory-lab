# QI-40 release start plan

Date: 2026-11-15  
Theory Lab base: `38842c8`

## Objective

Prepare an auditable, bounded QWZ Study preview from Theory Lab while keeping
full QI-40 installed integration certification on hold. The release decision
and unresolved gates are recorded in
[RELEASE_2.0_QI40_DISPOSITION.md](RELEASE_2.0_QI40_DISPOSITION.md).

## First four commits in this repository

1. **Release scope:** record the existing preview disposition, link it from the
   QWZ handoff guide, and publish this execution plan.
2. **Handoff integrity:** verify the written study manifest and both exported
   scene bundles before returning a handoff receipt. Reject a missing,
   mismatched, or modified role/source/scene identity.
3. **Reproducible source evidence:** add a command that generates the pinned QWZ
   study from a verified saved run and writes a JSON ledger of exact source,
   manifest, scene, and payload hashes. A second pass must produce the same
   ledger.
4. **Continuous gate:** run the source evidence command on Windows and Linux
   CI, and document how to reproduce it locally.

These commits establish Theory Lab producer evidence. They do not certify an
installed two-app release.

## Commits 5–8

5. Publish the QWZ study only after both scene views and the manifest verify.
   Failed preparation must leave no visible partial study.
6. Exercise the two-view QWZ handoff through Electron with a captured Math3D
   launch, exact source identity, and invalid-hash rejection.
7. Add a packaged Theory Lab acceptance command that pins the executable hash,
   loads the verified QWZ fixture in an isolated profile, and checks the
   two-scene launch without claiming Math3D rendering.
8. Record the candidate acceptance procedure and its exact artifact evidence.
   Keep full installed two-app certification conditional on the gates below.

The local unpacked Windows producer result and its limits are in
[QI40_PACKAGED_PRODUCER_ACCEPTANCE.md](QI40_PACKAGED_PRODUCER_ACCEPTANCE.md).

## Commits 9–12

9. Compute a fresh QWZ run in the packaged worker and verify its saved result
   hash, Chern value, and bulk gap.
10. Launch a fresh two-scene study in `attach` mode and compare its Float64
    curvature and band arrays with the saved worker result.
11. Add a manually triggered Windows workflow that archives the exact
    unpacked candidate and its hash and acceptance records.
12. Record the observed packaged result and keep the remaining installed
    Math3D gates explicit.

## Reproduce the source gate

Run `npm run test:qi40-source` from the repository root. The command verifies
the pinned saved result, writes both scene bundles, checks their golden scene
hashes, and compares two independent exports. To retain the study and JSON
ledger, run `npm run test:qi40-source -- <new-output-directory>`. The directory
must not already exist. Open its `study/` subfolder in a compatible Math3D
checkout for manual source inspection.

Windows and Linux CI run the same command and upload `evidence.json` with the
workflow run. This ledger identifies the Theory Lab producer output only; an
installed two-app acceptance record still needs exact executable and installer
hashes plus the Math3D results listed below.

The manual packaged producer workflow adds fresh-worker and handoff evidence
for its own executable. It does not replace the installed two-app matrix.

## Gates after these commits

| Gate | Next work | Completion evidence |
| --- | --- | --- |
| Installed QWZ parity | Run the exact candidate Theory Lab and Math3D binaries together, including visual inspection and scene hash comparison. | Candidate versions and installer hashes, recorded scene hashes, test output, and inspected views. |
| Math3D retained memory | Remove the retained QWZ preview objects and repeat the 80-cycle installed workload. | Stable total heap within the agreed budget, with WebGL resource counts and repeat runs. |
| Installer reliability | Diagnose the intermittent setup fault and rerun clean installs for exact binaries. | Repeatable install matrix with no crash or timeout. |
| Native Project rollback | Establish a supported downgrade or a verified backup/export route, preserving v1/v2 readers. | Installed rollback results for promoted native documents and exact scene fingerprints. |

The full QI-40 claim remains blocked until all gates pass for identified
release artifacts. A preview release must retain read-only
`quantum-scene/v1|v2` imports and must not promise older Math3D versions can
edit promoted native Projects.

