# Desktop computational laboratory v0.1 acceptance

QLAB-017 freezes the original V1 foundation at application/package version `0.1.0`. This is a tested source checkout, **not** a standalone installer. The next phase begins at QLAB-018; atoms, molecules and crystals remain outside v0.1.

## Local acceptance, 2026-09-27

| Platform | Environment | TypeScript | Python | Electron end-to-end |
| --- | --- | --- | --- | --- |
| Windows 11 | Node 24.19.0, CPython 3.12.2, Electron 44.4.5, QuTiP 5.3.1, SciPy 1.18.1 | 25 pass | 25 pass | Pass |
| Ubuntu 22.04 under WSL2/WSLg | Linux Node 24.19.0, CPython 3.12.14, Electron 44.4.5, QuTiP 5.3.1, SciPy 1.18.1 | 25 pass | 25 pass | Pass |

The desktop acceptance script starts the actual sandboxed Electron renderer and supervised worker, then exercises both QuTiP and native engines, spectral/evolution comparisons, Landau–Zener/Stückelberg/Floquet, cavity QED, Lindblad dynamics, 1D/2D sweeps, all six source-linked Volume VIII presets, cancellation, worker restart, binary integrity, saved-run export, and workspace/run persistence across a full app restart. It also checks the Electron security preferences and minimum-window layout. Screenshots are written under ignored `artifacts/`.

The cross-platform workflow [desktop-v01.yml](../.github/workflows/desktop-v01.yml) repeats the same checks on Windows and Ubuntu runners; Linux CI uses Xvfb. Local WSLg success establishes Linux desktop behavior on this machine. A successful remote CI run should be required before treating a future platform package or installer as released.

## Reproduction

On Windows, use the [README](../README.md) setup steps, then run:

```powershell
npm run typecheck
npm test
npm run test:worker
npm run build
npm run test:desktop
```

On a Linux desktop with Node 24 and Python 3.12:

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -c workers/quantum-python/requirements.lock -e workers/quantum-python
npm ci
npm run typecheck
npm test
npm run test:worker
npm run build
npm run test:desktop
```

For headless Linux, prefix the last command with `xvfb-run -a -s '-screen 0 1600x1000x24'`. A compatible display and Electron runtime libraries are required. JAX/Dynamiqs and GPU acceleration are not part of this v0.1 freeze.

## Frozen boundary

The Python worker remains a local, supervised JSON-RPC process; renderer access is restricted to preload IPC. Versioned job/result/capabilities, workspace, binary-artifact and run-manifest contracts are retained. Dependency versions are pinned in `package-lock.json` and `workers/quantum-python/requirements.lock`; changing numerical engines or contracts after this point belongs to a later milestone. No automatic user-data retention, signed installer, GPU guarantee, or cloud transport is claimed.
