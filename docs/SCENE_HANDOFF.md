# QVIS-023 portable scene handoff

The Theory Lab desktop Scenes page prepares a **regular `.qscene` folder**
from an exact, hash-verified saved run and selected standard or SSH/QWZ band
view. The Lab does not launch Math3D or contact a Math3D worker. Existing
scene export/import paths and `quantum-scene/v1` remain unchanged.

The folder contains `bundle.json`, `scene.json`, and the `f64le` binary files
named by `scene.datasets`. A consumer must verify the bundle manifest's
`scene.json` SHA-256, validate `quantum-scene/v1`, reject missing, extra or
linked files, and verify each dataset's declared byte length and SHA-256
before rendering. It must use the declared axes, handedness, coordinate
units, dataset units, and adapter-specific metadata; no conversion or
physical interpretation may be silently inferred. The scene provenance
records the source run ID and SHA-256 of the saved result. Those hashes
prove integrity relative to the supplied bytes, **not publisher identity**.

The Scenes handoff checks that the result hash still matches the preview
before prompting for a parent folder, repeats that check when exporting,
then reopens the written bundle through the same strict reader. The UI
shows the verified source, view, coordinates and dataset summary. This is a
full saved-run scene: a currently selected time sample, lattice site or
other Lab cursor is **not serialized** in `.qscene`. An independent viewer
may provide its own selection. Imported scenes, geometry fixtures and
chunked LOD bundles do not receive a saved-run handoff receipt.

Math3D integration remains a separate gate: its importer must pass the
same schema/hash/unit/sample acceptance on real Lab bundles, including
restart and tamper refusal, before an “Open in Math3D” action is enabled.
No direct Math3D-to-worker or Lab-to-Math3D worker call is part of this path.
