# Portable visualization v0.1 — QVIS-013

Source-release acceptance on Windows, 2026-09-28 (Node 24.19.0, Electron 44.4.5,
installed Chrome via Playwright). QVIS-001–013 are delivered at
the bounded scopes in QVIS_DELIVERY_011_013.md and the Roadmap tab. This is not
an installer release, published package or Math3D integration. The earlier QLAB
Linux acceptance record in RELEASE_V0.1.md is separate from this Windows run.

## Compatibility and available paths

| Format / feature | Desktop | Web Portable scenes |
| --- | --- | --- |
| quantum-scene/v1 + quantum-scene-bundle/v1 | Saved preview, new-folder export, read-only import | Authenticated saved preview, read-only local folder import |
| Scalar/complex grids and analytic hydrogenic fields | Shared field viewer, slices/threshold surfaces and diagnostics | Same field viewer for saved/imported data; no orbital compute form |
| Lattice/reciprocal/bands | Bounded fixtures, supplied SSH/QWZ saved bands, inspection/export | Same viewers for imported bundles; saved SSH/QWZ standard/band views |
| Supplied topology quantities | Scalar/vector/phase references and reported invariants | Same inspector; no viewer-computed invariants |
| quantum-scene-stream/v1 + quantum-scene-stream-bundle/v1 | Chunked export/import, preview/refine/cancel | Saved chunked preview and read-only folder import/refine/cancel |

Old valid regular fixtures remain accepted. Optional lattice, reciprocal, band
and topology metadata use explicit compatible schema additions; older strict
consumers must update their validators to accept new keys/primitives. Stream
manifests are separate formats: old regular readers are not expected to read
them. New QWZ runs include band arrays; older saved results lacking them need
a re-run for the band view. Original full-level bytes and source provenance are
preserved. Imports detect corruption, not publisher identity or scientific truth.

## Bounds and scientific limits

- Ordinary scene: existing 16 MiB total Float64 payload budget and schema bounds.
- Stream: at most 8 complete levels, 1024 unique chunks, 64 MiB unique chunk
  bytes, 64 KiB per chunk, 1 MiB metadata; each level retains ordinary bounds.
- Verified LRU chunk cache: 4 MiB; unread levels are not claimed verified.
- Retained display subsets are sampled original data, not new calculations,
  interpolation, renormalization, convergence evidence or resolved gaps.
- Decoder, in-flight requests, retained display and GPU buffers add overhead;
  these budgets are not a total process-memory cap. No unlimited-volume engine,
  out-of-core GPU rendering or time-sequence player is delivered.
- Analytic single-electron hydrogenic 1s–3d only, not many-electron chemistry.
  Lattices are bounded open geometry fixtures, not arbitrary crystals or periodic
  bond construction. Supplied SSH/QWZ topology does not add new model engines.
- Browser folder imports remain local, need no token and never create worker
  jobs/history entries. Saved HTTP routes require bearer authentication and exact
  origin; strict CSP is unchanged. Non-loopback use still requires TLS.

## Acceptance evidence

Run from the repository after installing the locked Node/Python dependencies:

```powershell
npm run typecheck
npm test
npm run test:worker
npm run test:scenes
npm run test:web
npm run test:desktop
```

Acceptance results: typecheck/build passed; Node 78 tests (77 passed, one
unconfigured SSH skip); Python worker 53 tests (49 passed, four unavailable
optional-engine skips); independent strict-CSP scene smoke, product web smoke
and Windows Electron acceptance/restart smoke passed. No failing tests.

Coverage includes legacy TS/Python scene fixtures, invalid topology references
and invariant states, stream manifest/chunk corruption, cancellation, cache
reuse/eviction, full-level byte equality and safe folder boundaries. Real Chrome
tests exercise strict-CSP geometry/field/band/topology inspectors, authenticated
saved HTTP scenes, chunked refinement, local regular/chunked imports, rejected
imports retaining the valid view, a real saved analytic 2p orbital imported into
the browser with phase/slice inspection, unauthenticated local imports and unchanged
run history. Windows Electron acceptance exercises existing labs and real saved
orbital chunked export/import/refinement through the preload boundary.

Optional SSH/engine tests may explicitly skip when unconfigured/unavailable;
skips are not acceptance evidence for those integrations. Firefox, Safari,
remote TLS deployment and a new Linux desktop run are not claimed tested here.
Math3D remains a separate consumer implementation track; no Math3D code changed.
