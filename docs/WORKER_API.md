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
| `quantum.start` | Start evolution, cavity, Lindblad or sweep job |
| `quantum.cancel` | Request active-job cancellation |
| `shutdown` | Graceful shutdown |

`worker-resources/v1` has `platform.system/machine`, `cpu.logicalCores`, `memory.totalBytes` (nullable), and `job.activeId` (nullable). The shared draft-07 schema validates it in Python and TypeScript.

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
