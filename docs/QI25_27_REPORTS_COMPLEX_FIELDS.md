# QI-25 and QI-27: verified reports and complex fields

Implemented 2026-11-05. Both features consume saved, hash-verified scientific data. They add presentation and export paths without changing worker result bytes.

## QI-25 study report

The Runs view exports a `.qreport` directory. `RunStore.exportReport` reopens the saved run through its existing contract, source-hash, artifact-hash and model consistency checks. The export is staged and published by directory rename. It contains:

- `report.md`: input/result/artifact SHA-256 values, model, operation, engine, worker, numerical settings, a local figure reference and explicit uncertainty wording.
- `figure.svg`: the existing full-sample scientific figure, tied to the same result hash.
- `job.json`, `result.json` and optional `data.f64`: exact verified source bytes.
- `validation.json`: checks actually performed by the saved-run loader. Unsupported physical/convergence checks are marked `not-evaluated` rather than inferred.
- `manifest.json`: SHA-256 and byte length for each included file plus the source hashes.

The export refuses a changed saved artifact. The report is a portable Markdown bundle; it does not execute notebook code or claim uncertainty that the worker did not record.

## QI-27 complex-field viewer

The verified regular-grid viewer exposes density `|ψ|²`, amplitude `|ψ|`, signed real and imaginary components, and cyclic phase. It can extract separate real-zero and imaginary-zero component surfaces using bounded marching tetrahedra. Their intersection indicates a complex node; either surface alone is not called a physical node. Phase is masked where density is near zero. The viewer explicitly states that absolute phase and signed components depend on arbitrary global phase.

The three-dimensional surface extraction keeps the 60,000-triangle budget, cancellation between slabs and verified source-artifact path. The complex-field fixture `ψ=x+iy` checks exact derived values, phase wrapping and both zero surfaces. Math3D's independently verified Field Explorer also gains an amplitude slice; its existing density surface remains separate.

Verification: `npm run typecheck`, `npm run build`, and `npx tsx --test tests/scientific-figure.test.ts tests/fields.test.ts`.
