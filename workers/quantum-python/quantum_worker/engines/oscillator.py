"""Static 1D number Hamiltonian, hbar=1; q and p are dimensionless.

Fock engines are independent. The Hermite plotting path is intentionally shared
analytic postprocessing. Neither finite-box density nor cutoff drift is used to
claim general oscillator convergence.
"""
from datetime import datetime, timezone
import math
import platform
from time import perf_counter
from uuid import uuid4

from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.native_engine import libraries
from quantum_worker.engines.qutip_engine import engine


def native_fock(np, omega, cutoff, state):
    a = np.diag(np.sqrt(np.arange(1, cutoff, dtype=float)), 1)
    h = omega * (a.T @ a + .5 * np.eye(cutoff))
    energies = np.linalg.eigvalsh(h)
    psi = np.eye(cutoff)[:, state]
    q, p = (a + a.T) / math.sqrt(2), -1j * (a - a.T) / math.sqrt(2)
    return energies, float(np.linalg.norm(q @ psi)**2), float(np.linalg.norm(p @ psi)**2), float(abs(psi[-1])**2)


def qutip_fock(omega, cutoff, state):
    qt = engine()
    a, psi = qt.destroy(cutoff), qt.basis(cutoff, state)
    h = omega * (qt.num(cutoff) + .5 * qt.qeye(cutoff))
    q, p = (a + a.dag()) / math.sqrt(2), -1j * (a - a.dag()) / math.sqrt(2)
    return h.eigenenergies(), float(qt.expect(q*q, psi)), float(qt.expect(p*p, psi)), float(abs(psi.full()[-1, 0])**2)


def solve(job):
    validate("quantum-job", job)
    if job["operation"] != "oscillator":
        raise ValueError("Expected oscillator job")
    started = perf_counter()
    np, scipy, _ = libraries()
    from scipy.special import eval_hermite
    p = job["model"]["parameters"]
    if job["engine"] == "native":
        fock = lambda n: native_fock(np, p["omega"], n, p["state"])
        version = scipy.__version__
    else:
        fock = lambda n: qutip_fock(p["omega"], n, p["state"])
        version = engine().__version__
    energies, qvar, pvar, boundary = fock(p["cutoff"])
    extra, _, _, _ = fock(p["cutoff"] + 4)
    low = energies[:p["levels"]]
    expected = p["omega"] * (np.arange(p["levels"]) + .5)
    q = np.linspace(-p["extent"], p["extent"], p["points"])
    amplitude = (np.pi**(-.25) / math.sqrt(2**p["state"] * math.factorial(p["state"]))
                 * eval_hermite(p["state"], q) * np.exp(-q*q/2))
    density = amplitude**2
    probability = float(np.sum((density[1:] + density[:-1]) * np.diff(q) / 2))
    result = {
        "schema": "quantum-result/v1", "jobId": job["jobId"], "runId": "run-" + uuid4().hex,
        "status": "completed", "operation": "oscillator", "model": job["model"],
        "engine": {"name": job["engine"], "version": version},
        "spectrum": {"energies": low.tolist(), "units": "normalized", "hbar": 1},
        "state": {"q": q.tolist(), "amplitude": amplitude.tolist(), "density": density.tolist()},
        "analysis": {"ladderError": float(np.max(abs(low - expected))),
                     "cutoffDrift": float(np.max(abs(low - extra[:p["levels"]]))),
                     "qVariance": qvar, "pVariance": pvar, "boundaryOccupation": boundary,
                     "gridProbability": probability},
        "provenance": {"pythonVersion": platform.python_version(), "workerVersion": __version__,
                       "computedAt": datetime.now(timezone.utc).isoformat(),
                       "durationMs": (perf_counter() - started) * 1000},
    }
    validate("quantum-result", result)
    return result
