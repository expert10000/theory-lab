from contextlib import redirect_stdout
from datetime import datetime, timezone
from functools import lru_cache
import platform
import sys
from time import perf_counter
from uuid import uuid4
from quantum_worker import __version__
from quantum_worker.contracts import validate

@lru_cache(maxsize=1)
def engine():
    # Third-party startup notices must never corrupt the JSON-RPC stream.
    with redirect_stdout(sys.stderr):
        import qutip
    return qutip

def availability():
    try:
        return {"available": True, "version": engine().__version__}
    except Exception as exc:
        print(f"QuTiP unavailable: {exc}", file=sys.stderr)
        return {"available": False, "version": None}

def diagonalize(job):
    validate("quantum-job", job)
    started = perf_counter()
    qt = engine()
    parameters = job["model"]["parameters"]
    hamiltonian = 0.5 * parameters["delta"] * qt.sigmaz() + 0.5 * parameters["omega"] * qt.sigmax()
    energies = [float(value) for value in hamiltonian.eigenenergies()]
    result = {
        "schema": "quantum-result/v1", "jobId": job["jobId"], "runId": f"run-{uuid4().hex}",
        "status": "completed", "operation": "diagonalize", "model": job["model"],
        "engine": {"name": "qutip", "version": qt.__version__},
        "spectrum": {"eigenvalues": energies, "units": "normalized", "hbar": 1},
        "provenance": {"pythonVersion": platform.python_version(), "workerVersion": __version__,
                       "computedAt": datetime.now(timezone.utc).isoformat(), "durationMs": (perf_counter() - started) * 1000},
    }
    validate("quantum-result", result)
    return result
