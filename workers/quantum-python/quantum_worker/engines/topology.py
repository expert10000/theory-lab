"""Finite SSH chain and two-band topology. Native NumPy solver, ħ = 1."""
from datetime import datetime, timezone
import platform
from time import perf_counter
from uuid import uuid4

from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.native_engine import libraries


def ssh_analysis(np, parameters):
    t1, t2 = parameters["t1"], parameters["t2"]
    cells, points = parameters["cells"], parameters["kPoints"]
    k = np.linspace(-np.pi, np.pi, points)
    q = t1 + t2 * np.exp(1j * k)
    band = np.abs(q)
    gap = 2.0 * abs(abs(t1) - abs(t2))
    # Winding is undefined at a bulk gap closure, including the zero Hamiltonian.
    winding = None if gap < 1e-10 else int(abs(t2) > abs(t1))
    matrix = np.zeros((2 * cells, 2 * cells), dtype=np.float64)
    for cell in range(cells):
        a, b = 2 * cell, 2 * cell + 1
        matrix[a, b] = matrix[b, a] = t1
        if cell + 1 < cells:
            matrix[b, a + 2] = matrix[a + 2, b] = t2
    energies, vectors = np.linalg.eigh(matrix)
    pair = slice(cells - 1, cells + 1)
    density = np.mean(abs(vectors[:, pair]) ** 2, axis=1)
    # Probability in the two exposed orbitals, averaged over both midgap states.
    edge_weight = float(density[0] + density[-1])
    return {"kind": "ssh", "bulkGap": float(gap), "winding": winding,
            "kValues": k.tolist(), "lowerBand": (-band).tolist(), "upperBand": band.tolist(),
            "edgeEnergies": energies[pair].tolist(), "edgeDensity": density.tolist(),
            "edgeWeight": edge_weight}


def solve(job):
    validate("quantum-job", job)
    if job["operation"] != "topology" or job["engine"] != "native":
        raise ValueError("Expected native topology job")
    started = perf_counter()
    np, scipy, _ = libraries()
    model = job["model"]
    if model["type"] == "ssh":
        analysis = ssh_analysis(np, model["parameters"])
    else:
        raise ValueError("Unsupported topology model")
    result = {"schema": "quantum-result/v1", "jobId": job["jobId"], "runId": "run-" + uuid4().hex,
              "status": "completed", "operation": "topology", "model": model,
              "engine": {"name": "native", "version": scipy.__version__}, "analysis": analysis,
              "provenance": {"pythonVersion": platform.python_version(), "workerVersion": __version__,
                             "computedAt": datetime.now(timezone.utc).isoformat(),
                             "durationMs": (perf_counter() - started) * 1000}}
    validate("quantum-result", result)
    return result
