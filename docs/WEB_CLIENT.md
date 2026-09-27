# Web client: QLAB-029

The React web client uses the existing authenticated gateway and supervised
Python worker. It currently exposes the two-level spectrum, driven Rabi
dynamics, worker/API status, the pinned 48-entry Hamiltonian Atlas, and native
SSH/QWZ topology labs. Other desktop laboratories remain desktop-only; the
Atlas marks their bindings accordingly rather than offering nonfunctional web
controls.

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
