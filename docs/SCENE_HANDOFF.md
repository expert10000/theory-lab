# QVIS-023 portable scene handoff

The Theory Lab desktop Scenes page prepares a **regular `.qscene` folder**
from an exact, hash-verified saved run and selected standard or SSH/QWZ band
view. **Open in Math3D** creates the same verified bundle under the Lab's
user-data directory, then starts a local Math3D checkout with its folder path.
The first use asks for the Math3D checkout folder and remembers it. After
**Open scene bundle** verifies a regular `.qscene` folder, the same button
opens that imported folder directly in Math3D, even when there is no saved
numerical run. Theory Lab verifies the bundle again and checks that its scene
and dataset hashes match the preview before launch. Math3D independently
verifies it on opening. Existing scene export/import paths and
`quantum-scene/v1` remain unchanged.

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
chunked LOD bundles do not receive a saved-run handoff receipt. An imported
regular bundle can be opened in Math3D but does not receive that receipt.

Math3D verifies the manifest, schema and every binary dataset independently
before opening its read-only preview. A changed or damaged bundle is refused.
The current local launcher supports a built Math3D source checkout with its
Electron dependency installed; packaged application discovery is later work.
Math3D opens a new window when launched this way. No direct Math3D-to-worker
or Lab-to-Math3D worker call is part of this path.
