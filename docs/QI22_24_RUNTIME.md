# QI-22–24 runtime capability and transport implementation

Implemented 2026-11-05. The validated `worker-capabilities/v1` response remains the source of worker facts. `quantum-runtime-negotiation/v1` is a host decision over that response, not a second solver claim. It accepts protocol 1 and tested worker version 0.1.x, lists the viewer's scene formats, and checks each operation against its actual engine support. The Backend overview selects an actually available advertised engine; an explicitly submitted job still retains its selected engine and gets an advisory alternative if unavailable. Every `quantum.run` and `quantum.start` request passes this final capability gate. The worker hello version must match its capabilities version.

## Transport selection

Select exactly one transport before starting the desktop app. With none selected, the existing local Python worker runs over stdio.

| Transport | Required environment | Optional overrides | Binary transfer |
| --- | --- | --- | --- |
| SSH | `QLAB_REMOTE_SSH_TARGET`, `QLAB_REMOTE_ROOT` | `QLAB_REMOTE_PYTHON`, `QLAB_REMOTE_ARTIFACTS` | SCP with batch mode and strict host-key checking |
| WSL | `QLAB_WSL_DISTRO`, `QLAB_WSL_ROOT` | `QLAB_WSL_PYTHON`, `QLAB_WSL_ARTIFACTS` | `wsl.exe --exec cat` with a declared byte cap |
| Docker | `QLAB_DOCKER_CONTAINER`, `QLAB_DOCKER_ROOT` | `QLAB_DOCKER_PYTHON`, `QLAB_DOCKER_ARTIFACTS` | `docker cp` from the named container |

Worker roots, Python paths and artifact directories must be absolute POSIX paths with a strict character set. Distribution and container names are validated before being passed as process arguments. Only one transport may be selected. All transports run the same versioned JSON-RPC worker, preserve job IDs and cancellation requests, identify their target in worker status, and verify binary artifact size and SHA-256 before local publication. WSL and Docker stream artifact bytes through a declared stdout limit before writing locally; neither performs an unbounded `docker cp`. SSH remains the authenticated remote adapter; WSL and Docker use the local user's access to those runtimes.

Run `npm run check:transport` for handshake, identity, health and resources. Run `npm run accept:transport` for an end-to-end native spectrum, evolution artifact, integrity rejection, cancellation and restart. The latter requires a worker environment satisfying `workers/quantum-python/pyproject.toml`; a launchable Python alone is insufficient. Docker must already have a running container and the matching checkout. No container is created automatically.

## Accelerated numerical adapter

Dynamiqs remains optional. Registration now solves a two-level GPU probe with an exact analytic population and norm check; package import and a GPU device alone do not mark the engine available. `npm run benchmark:acceleration` runs a fixed 65-sample GPU evolution and an independent native SciPy evolution. It reports maximum population, norm, global-phase-invariant state, and repeat-run state errors, tolerance `5e-4`, device, version and timings. A relative-phase error fails even if populations match; a harmless global phase does not. `speedup` is present only when the numerical and repeatability checks pass. Without an installed GPU stack it reports `available: false`, `passed: false`, and `speedup: null`. Existing run outputs retain engine version, device and result/artifact hashes.

## Verification and limits

- TypeScript: `npm run typecheck`; `npx tsx --test tests/runtime-negotiation.test.ts tests/transport-adapters.test.ts tests/remote.test.ts`.
- Python: `node scripts/python.mjs -m unittest discover -s workers/quantum-python/tests -p test_acceleration.py -v` (set `QLAB_PYTHON` to a compatible interpreter if needed).
- WSL handshake was verified on Ubuntu. Its installed Python 3.10 and older system dependencies do not satisfy the project's Python ≥3.11 environment, so the full WSL job acceptance needs a compatible worker installation. The Docker daemon and Dynamiqs GPU stack were unavailable on the verification host; their end-to-end commands remain explicit acceptance gates.
