"""Bounded confining quartic oscillator in a truncated harmonic Fock basis."""
from datetime import datetime, timezone
import platform
from time import perf_counter
from uuid import uuid4
import numpy as np
from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.native_engine import libraries
from quantum_worker.engines.qutip_engine import engine


def solve(job):
    validate("quantum-job", job)
    if job["operation"] != "oscillator_anharmonic":
        raise ValueError("Expected anharmonic oscillator job")
    started = perf_counter()
    p = job["model"]["parameters"]
    n, omega, coupling, levels = p["cutoff"], p["omega"], p["lambda"], p["levels"]
    if job["engine"] == "qutip":
        qt = engine()
        a = qt.destroy(n)
        x = (a + a.dag()) / np.sqrt(2 * omega)
        h = omega * (qt.num(n) + .5 * qt.qeye(n)) + coupling * (x ** 4)
        values, states = h.eigenstates()
        vectors = [np.real_if_close(state.full().reshape(-1)).real for state in states[:levels]]
        x2, x4 = (x ** 2).full().real, (x ** 4).full().real
        version = qt.__version__
    else:
        _, scipy, _ = libraries()
        a = np.diag(np.sqrt(np.arange(1, n, dtype=float)), 1)
        x = (a + a.T) / np.sqrt(2 * omega)
        x2 = x @ x
        x4 = x2 @ x2
        h = omega * (a.T @ a + .5 * np.eye(n)) + coupling * x4
        values, eigenvectors = scipy.linalg.eigh(h)
        vectors = [eigenvectors[:, i] for i in range(levels)]
        version = scipy.__version__
    vectors = [v / np.linalg.norm(v) for v in vectors]
    ground = vectors[0]
    result = {
        "schema":"quantum-result/v1", "jobId":job["jobId"], "runId":"run-"+uuid4().hex,
        "status":"completed", "operation":"oscillator_anharmonic", "model":job["model"],
        "engine":{"name":job["engine"],"version":version},
        "spectrum":{"energies":[float(v) for v in values[:levels]],"units":"normalized","hbar":1},
        "states":{"coefficients":[v.tolist() for v in vectors]},
        "analysis":{"groundX2":float(ground @ x2 @ ground),"groundX4":float(ground @ x4 @ ground),
                    "groundParity":float(np.sum((-1)**np.arange(n)*ground**2)),"harmonicGround":omega/2},
        "provenance":{"pythonVersion":platform.python_version(),"workerVersion":__version__,
                      "computedAt":datetime.now(timezone.utc).isoformat(),
                      "durationMs":(perf_counter()-started)*1000},
    }
    validate("quantum-result", result)
    return result
