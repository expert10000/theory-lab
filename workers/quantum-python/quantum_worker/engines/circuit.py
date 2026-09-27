"""Bounded charge-basis transmon, optional scqubits plus independent NumPy reference.

All energies are E/h in GHz when EJ and EC are supplied in GHz. A cutoff
comparison is diagnostic only; it is not proof of convergence.
"""
from contextlib import redirect_stdout
from datetime import datetime, timezone
from importlib import metadata, util
import platform
import sys
from time import perf_counter
from uuid import uuid4

from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.native_engine import libraries


def scqubits_availability():
    if util.find_spec("scqubits") is None:
        return {"available": False, "version": None}
    try:
        with redirect_stdout(sys.stderr):
            from scqubits import Transmon  # noqa: F401
        return {"available": True, "version": metadata.version("scqubits")}
    except Exception as error:
        print(f"scqubits unavailable: {error}", file=sys.stderr)
        return {"available": False, "version": None}


def native_eigensystem(np, p, ncut):
    n = np.arange(-ncut, ncut + 1, dtype=float)
    diagonal = 4 * p["EC"] * (n - p["ng"]) ** 2
    hamiltonian = np.diag(diagonal)
    hamiltonian += np.diag(np.full(2 * ncut, -p["EJ"] / 2), 1)
    hamiltonian += np.diag(np.full(2 * ncut, -p["EJ"] / 2), -1)
    return np.linalg.eigh(hamiltonian)


def scqubits_eigensystem(p, ncut, count):
    with redirect_stdout(sys.stderr):
        from scqubits import Transmon
        transmon = Transmon(EJ=p["EJ"], EC=p["EC"], ng=p["ng"], ncut=ncut,
                            truncated_dim=count)
        return transmon.eigensys(evals_count=count)


def solve(job):
    validate("quantum-job", job)
    if job["operation"] != "circuit":
        raise ValueError("Expected circuit job")
    started = perf_counter()
    np, scipy, _ = libraries()
    p = job["model"]["parameters"]
    if p["levels"] > 2 * p["ncut"] + 1:
        raise ValueError("Requested levels exceed charge basis dimension")
    if job["engine"] == "scqubits":
        info = scqubits_availability()
        if not info["available"]:
            raise ValueError("scqubits is unavailable; install the optional circuit stack")
        energies, vectors = scqubits_eigensystem(p, p["ncut"], p["levels"])
        extra, _ = scqubits_eigensystem(p, p["ncut"] + 2, 3)
        version = info["version"]
    elif job["engine"] == "native":
        energies, vectors = native_eigensystem(np, p, p["ncut"])
        extra, _ = native_eigensystem(np, p, p["ncut"] + 2)
        version = scipy.__version__
    else:
        raise ValueError("Unsupported circuit engine")
    low = [float(value) for value in energies[:p["levels"]]]
    e01, e12 = low[1] - low[0], low[2] - low[1]
    charges = np.arange(-p["ncut"], p["ncut"] + 1)
    n01 = abs(np.vdot(vectors[:, 0], charges * vectors[:, 1]))
    cutoff_drift = abs((extra[1] - extra[0]) - e01)
    result = {
        "schema": "quantum-result/v1", "jobId": job["jobId"], "runId": "run-" + uuid4().hex,
        "status": "completed", "operation": "circuit", "model": job["model"],
        "engine": {"name": job["engine"], "version": version},
        "spectrum": {"energies": low, "e01": float(e01), "e12": float(e12),
                     "anharmonicity": float(e12 - e01),
                     "chargeMatrixElement01": float(n01),
                     "cutoffDriftE01": float(cutoff_drift), "units": "GHz"},
        "provenance": {"pythonVersion": platform.python_version(), "workerVersion": __version__,
                       "computedAt": datetime.now(timezone.utc).isoformat(),
                       "durationMs": (perf_counter() - started) * 1000},
    }
    validate("quantum-result", result)
    return result
