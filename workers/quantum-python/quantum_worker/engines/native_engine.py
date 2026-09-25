"""Independent NumPy/SciPy reference for the two-level models."""
from contextlib import redirect_stdout
from datetime import datetime, timezone
from functools import lru_cache
import math
import platform
import sys
from time import perf_counter
from uuid import uuid4

from quantum_worker import __version__
from quantum_worker.contracts import validate


@lru_cache(maxsize=1)
def libraries():
    # Keep third-party import notices off the JSON-RPC stdout channel.
    with redirect_stdout(sys.stderr):
        import numpy
        import scipy
        from scipy.integrate import DOP853
    return numpy, scipy, DOP853


def availability():
    try:
        _, scipy, _ = libraries()
        return {"available": True, "version": scipy.__version__}
    except Exception as exc:
        print(f"Native NumPy/SciPy unavailable: {exc}", file=sys.stderr)
        return {"available": False, "version": None}


def diagonalize(job):
    validate("quantum-job", job)
    if job["operation"] != "diagonalize" or job["engine"] != "native":
        raise ValueError("Expected native diagonalization job")
    started = perf_counter()
    np, scipy, _ = libraries()
    parameters = job["model"]["parameters"]
    delta, omega = parameters["delta"], parameters["omega"]
    hamiltonian = 0.5 * np.array([[delta, omega], [omega, -delta]], dtype=np.complex128)
    energies = [float(value) for value in np.linalg.eigvalsh(hamiltonian)]
    result = {
        "schema": "quantum-result/v1", "jobId": job["jobId"], "runId": f"run-{uuid4().hex}",
        "status": "completed", "operation": "diagonalize", "model": job["model"],
        "engine": {"name": "native", "version": scipy.__version__},
        "spectrum": {"eigenvalues": energies, "units": "normalized", "hbar": 1},
        "provenance": {"pythonVersion": platform.python_version(), "workerVersion": __version__,
                       "computedAt": datetime.now(timezone.utc).isoformat(),
                       "durationMs": (perf_counter() - started) * 1000},
    }
    validate("quantum-result", result)
    return result


class NativeEvolution:
    """Step DOP853 once and interpolate saved samples on its dense solution."""

    def __init__(self, job, cancelled):
        np, _, DOP853 = libraries()
        model = job["model"]
        parameters = model["parameters"]

        if model["type"] == "driven_two_level":
            def fields(t):
                return parameters["delta"], parameters["amplitude"] * math.cos(
                    parameters["frequency"] * t + parameters["phase"])
        elif model["type"] == "landau_zener":
            def fields(t):
                return parameters["sweepRate"] * t + parameters["bias"], parameters["gap"]
        else:
            raise ValueError("Unsupported native evolution model")

        def derivative(t, state):
            detuning, coupling = fields(t)
            return -0.5j * np.array([
                detuning * state[0] + coupling * state[1],
                coupling * state[0] - detuning * state[1],
            ], dtype=np.complex128)

        initial = np.zeros(2, dtype=np.complex128)
        initial[job["initialState"]["index"]] = 1.0
        settings = job["solver"]
        self.solver = DOP853(derivative, settings["tStart"], initial,
                             settings["tStop"], rtol=1e-9, atol=1e-11)
        self.segment = None
        self.cancelled = cancelled

    def step(self, t):
        if self.segment is None and t == self.solver.t:
            return self.solver.y
        while self.solver.t < t:
            if self.cancelled.is_set():
                return None
            if self.solver.status != "running":
                raise RuntimeError("Native integrator stopped before the requested sample")
            self.solver.step()
            if self.solver.status == "failed":
                raise RuntimeError("Native DOP853 integration failed")
            self.segment = self.solver.dense_output()
        if self.segment is None:
            raise RuntimeError("No dense native solution for sample")
        return self.segment(t)
