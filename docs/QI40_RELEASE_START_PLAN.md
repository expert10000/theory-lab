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

