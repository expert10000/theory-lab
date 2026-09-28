# Web client: QLAB-029

The React web client uses the existing authenticated gateway and supervised
Python worker. It currently exposes the two-level spectrum, driven Rabi
dynamics, worker/API status, the pinned 48-entry Hamiltonian Atlas, and native
SSH/QWZ topology labs. Other desktop laboratories remain desktop-only; the
Atlas marks their bindings accordingly rather than offering nonfunctional web
controls. QVIS-013 adds **Portable scenes**, reusing desktop geometry, lattice,
reciprocal, band, topology and field viewers. Authenticated saved-run views are
read-only; regular/chunked local folder imports work without authentication.
Imported files stay in browser memory, with no upload or run-history mutation.

The read-only Atlas snapshot is bundled into `web.js` from
`packages/atlas/atlas.v1.json`. It needs no network fetch and is available
before gateway authentication. The nine app-level bindings come from the same
tested mapping module used by desktop. Only static two-level, semiclassical
Rabi-drive and SSH/QWZ bindings currently open web controls.

For computation, the bearer token is kept in React memory and is never stored
in browser storage. The gateway checks token and origin, validates bounded
`quantum-job/v1` requests, supervises the worker, checks that topology results
match the submitted job, and saves runs. The browser independently checks
inline topology arrays and physical consistency before plotting. This guard
uses no runtime code generation so the gateway's strict Content Security
Policy remains intact. Existing evolution artifacts are still verified by
SHA-256 before plotting.

The QWZ view distinguishes a verified lattice Chern number, an under-resolved
mesh, and an exact gap closure. It also shows the independent midpoint Berry
curvature integral and its convergence error. Browser smoke tests exercise all
three states through the real gateway and worker.

Run `npm run test:web` for the browser integration test; use
`npm run start:gateway` with the configured `QLAB_GATEWAY_TOKEN` for local use.
Non-loopback binding requires TLS and an exact allowed origin. Do not publish
the development gateway without configuring those controls.

Scene API (all GET, bearer/origin protected; optional `view=standard|bands`):

- `/api/scenes/:runId` — bounded quantum-scene/v1 metadata.
- `/api/scenes/:runId/datasets/:datasetId` — only a declared dataset's bytes.
- `/api/scenes/:runId/stream` — separate quantum-scene-stream/v1 manifest.
- `/api/scenes/:runId/chunks/:chunkName` — only declared content-addressed chunks.

The gateway materializes one scene at a time (409 during another preparation),
caches at most one regular scene and one multilevel collection, and reads only
verified RunStore outputs. It accepts no scene uploads or arbitrary filesystem
paths. The browser bounds response sizes and verifies hashes plus semantics
before displaying; unread stream levels are not labelled verified. Cancellation
or corruption retains the previous valid preview. The gateway can still serve
saved scenes when its worker is stopped. See RELEASE_QVIS_V0.1.md for tested
compatibility, bounds and platform limitations. Browser export is not included.
