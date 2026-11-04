# QWZ study handoff and verified source fork

The Scene Lab now offers a two-view QWZ study handoff for one selected, verified saved run. It writes the exact curvature and bands `.qscene` folders plus a `quantum-study-handoff/v1` manifest containing the run ID, result hash, scene IDs and roles. Lab can launch a built Math3D checkout or an installed Windows application. If no target is selected, the study folder remains available for manual opening in Math3D's Project panel.

Math3D independently verifies both folders before the user chooses a new or current Project. The existing single-scene route still works.

Math3D can also send a separate `--quantum-source-fork` request. Lab checks the requested saved run and exact result hash before showing the parent. The user must click **Fork verified run** in Lab to execute its existing saved-rerun pipeline. The new run records immutable parent job/result hashes and leaves the parent untouched. Failed verification or environment preflight prevents the fork.

Current multi-scene study scope is QWZ curvature plus supplied bands. Other study types require a declared scene set and role checks.
