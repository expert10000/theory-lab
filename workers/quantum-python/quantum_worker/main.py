"""Line-delimited JSON-RPC 2.0. stdout is reserved for protocol messages."""
import json
import platform
import sys
import traceback
from jsonschema import ValidationError
from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.qutip_engine import availability, diagonalize
from quantum_worker.engines.native_engine import availability as native_availability, diagonalize as native_diagonalize
from quantum_worker.jobs.manager import JobManager

MAX_MESSAGE = 65536
MANAGER = JobManager()

def capabilities():
    qutip = availability()
    native = native_availability()
    result = {"schema": "worker-capabilities/v1", "protocol": 1,
              "worker": {"version": __version__}, "python": {"version": platform.python_version()},
              "engines": {"qutip": qutip, "native": native},
              "operations": ["diagonalize", "evolve"] if qutip["available"] or native["available"] else []}
    validate("worker-capabilities", result)
    return result

def dispatch(method, params):
    if method == "quantum.start":
        return MANAGER.start(params.get("job"), params.get("outputDir"))
    if method == "quantum.cancel":
        return MANAGER.cancel(params.get("jobId"))
    if method == "quantum.run":
        if params.get("engine") == "native":
            return native_diagonalize(params)
        return diagonalize(params)
    if method == "hello":
        return {"protocol": 1, "workerVersion": __version__}
    if method == "capabilities":
        return capabilities()
    if method == "health":
        return {"status": "ok"}
    if method == "shutdown":
        MANAGER.shutdown()
        return {"status": "stopping"}
    raise LookupError("Method not found")

def error(request_id, code, message):
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}

def handle(raw):
    try:
        request = json.loads(raw, parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
    except (ValueError, UnicodeDecodeError):
        return error(None, -32700, "Parse error"), False
    if (not isinstance(request, dict) or request.get("jsonrpc") != "2.0"
            or not isinstance(request.get("method"), str)
            or ("id" in request and (isinstance(request["id"], bool) or not isinstance(request["id"], (str, int, type(None)))))):
        return error(None, -32600, "Invalid request"), False
    request_id = request.get("id")
    notification = "id" not in request
    try:
        params = request.get("params", {})
        if not isinstance(params, dict):
            raise ValueError("params must be an object")
        result = dispatch(request["method"], params)
        response = {"jsonrpc": "2.0", "id": request_id, "result": result}
        stop = request["method"] == "shutdown"
    except (ValidationError, ValueError) as exc:
        response, stop = error(request_id, -32602, str(exc).splitlines()[0]), False
    except LookupError:
        response, stop = error(request_id, -32601, "Method not found"), False
    except Exception:
        traceback.print_exc(file=sys.stderr)
        response, stop = error(request_id, -32603, "Worker calculation failed; inspect worker diagnostics"), False
    return (None if notification else response), stop

def main():
    while True:
        raw = sys.stdin.buffer.readline(MAX_MESSAGE + 1)
        if not raw:
            break
        if len(raw) > MAX_MESSAGE:
            response, stop = error(None, -32600, "Message exceeds 64 KiB"), True
        else:
            response, stop = handle(raw)
        if response is not None:
            MANAGER.write_response(response)
        if stop:
            break

if __name__ == "__main__":
    main()
