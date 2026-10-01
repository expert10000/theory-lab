# Worker observatory and API

The authenticated web laboratory has a **Worker & API** page. It refreshes every five seconds and reports worker state, selected transport, platform, logical CPU count, physical RAM total, active asynchronous job, installed engine versions, advertised operations, protocol methods, and recent gateway calls. Resource values come from the Python worker—even over SSH—not from the browser. Physical RAM is host total, not free memory or a per-job allocation.

The Electron **Backend** tab shows the same worker resource snapshot and the selected SSH connection. Local Python over stdio is the default. When `QLAB_REMOTE_SSH_TARGET` and `QLAB_REMOTE_ROOT` are set before launch, it displays the target, checkout, Python executable and artifact directory resolved by the supervisor. Python defaults to `<remote-root>/.venv/bin/python`; remote artifacts default to `<remote-root>/.qlab-remote-artifacts`. Authentication remains in the user's OpenSSH configuration. The UI never reads or displays private keys.

## Protocol methods

The Python worker receives newline-delimited JSON-RPC 2.0 through local stdio or `ssh -T`. It has no HTTP listening port.

| Method | Purpose |
| --- | --- |
| `hello` | Protocol and worker version handshake |
| `capabilities` | Versioned engine and operation inventory |
| `health` | Supervisor liveness check |
| `resources` | `worker-resources/v1` snapshot |
| `quantum.run` | Inline spectrum, many-body, circuit or topology result |
| `quantum.start` | Start evolution, cavity, Lindblad, sweep or orbital job |
| `quantum.cancel` | Request active-job cancellation |
| `shutdown` | Graceful shutdown |

### Orbital operation (QVIS-004, Electron only)

`quantum.start` accepts a native `orbital` job with a `hydrogenic` model. Its
parameters are `n`, `l`, `m`, `basis` (`complex`, `real_cos`, `real_sin`), `Z`,
`radius` (cube half-width in a₀), and `grid` (21/31/41/49). Progress counts x slabs.
The result carries an interleaved f64le `[psi_re,psi_im]` artifact in
`xyz-z-fastest` order, analytic energy in Hartree, infinite-domain radial norm
and mean radius, unrenormalized finite-grid probability and a radial profile.
QVIS-007 adds optional `radialNodes` (positive radii in a₀) and
`cubeProbabilityBounds` (two radial sphere integrals bracketing the cube's
continuum probability, estimated numerically). Convergence studies submit up
to four ordinary orbital jobs sequentially; no additional RPC method is needed.
The existing trusted preload exposes only `orbital(job)`; no new worker HTTP
endpoint, gateway operation or Math3D connection is introduced. See
[FIELDS_ORBITALS.md](FIELDS_ORBITALS.md) for scientific assumptions and formats.

`worker-resources/v1` has `platform.system/machine`, `cpu.logicalCores`, `memory.totalBytes` (nullable), and `job.activeId` (nullable). The shared draft-07 schema validates it in Python and TypeScript.

### Damped oscillator operation (D1-014–016, Electron only)

`quantum.start` also accepts the bounded `oscillator_damped` master-equation
job. The trusted preload exposes `oscillatorDamped(job)` through the same
supervised start/progress/cancel and verified-artifact path. QuTiP MESolver
and native SciPy DOP853 independently evolve a finite Fock density matrix
with thermal loss/excitation. `quantum-damped-oscillator-data/v1` stores six
readouts and the full complex matrix at each sample (at most 832,944 bytes).
The host independently propagates and validates the matrix before saving or
exporting. There is no gateway operation, new HTTP route, scene adapter or
Math3D connection. See [D1_DAMPED_OSCILLATOR.md](D1_DAMPED_OSCILLATOR.md).

### Parametric oscillator operation (D1-017–019, Electron only)

`quantum.start` accepts bounded `oscillator_parametric` vacuum jobs. The
trusted preload exposes `oscillatorParametric(job)` through the same
supervised progress/cancel and verified-artifact path. QuTiP integrates the
finite-Fock state and native SciPy uses Hermitian spectral phases. The
`quantum-parametric-oscillator-data/v1` artifact stores nine readouts plus
all complex Fock coefficients at each sample. The host independently checks
propagation, moments, parity and finite-cutoff diagnostics before durable
storage and CSV/variance-SVG/manifest export. No gateway route, scene
adapter or Math3D call is added. See
[D1_PARAMETRIC_OSCILLATOR.md](D1_PARAMETRIC_OSCILLATOR.md).

## Gateway routes

The separate Node gateway requires `Authorization: Bearer <token>` on every `/api/*` route. It uses HTTP only on loopback; non-loopback binding requires TLS and an explicit origin. Jobs are checked against `quantum-job/v1` and return `quantum-result/v1`. The browser-facing job route currently supports `diagonalize`, `evolve`, `circuit` and bounded native `topology`; other worker operations remain desktop-only. SSH and QWZ topology responses are checked against the submitted model before persistence and again in the browser before plotting.

| Route | Response |
| --- | --- |
| `GET /api/status` | Worker state, capabilities and selected transport |
| `GET /api/resources` | Validated `worker-resources/v1` |
| `GET /api/activity` | `gateway-activity/v1` call counters and last 20 sanitized calls |
| `GET /api/runs` | Saved run summaries |
| `POST /api/jobs` | One validated job at a time |
| `POST /api/jobs/:jobId/cancel` | Cancellation acceptance |
| `GET /api/artifacts/:jobId` | Verified little-endian Float64 artifact |

The activity feed is in memory and records only time, HTTP method, normalized route, response status and elapsed milliseconds. It excludes access tokens, job payloads, exact artifact IDs and diagnostic polling. It is not an audit log and resets when the gateway restarts. Resource and status endpoints are read-only; they do not start calculations.

Example (replace the token and use a gateway you started yourself):

```sh
curl -H "Authorization: Bearer <token>" http://127.0.0.1:8765/api/resources
```

Run `npm run test:web` for the local browser path. With the `QLAB_REMOTE_*` settings from the SSH setup, `npm run test:ssh-ui` checks that Electron shows the selected SSH target and worker resources; `npm run test:web` then tests the gateway over SSH too. The machine-local `qlab-wsl-local` alias created during acceptance is an example OpenSSH profile, not a built-in default or an external deployment.
