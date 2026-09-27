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


def qwz_analysis(np, parameters):
    mass, grid = parameters["mass"], parameters["grid"]
    # All possible closings are at high-symmetry points: m = -2, 0, +2.
    gap = 2.0 * min(abs(mass + 2), abs(mass), abs(mass - 2))
    k = -np.pi + 2 * np.pi * np.arange(grid) / grid
    kx, ky = np.meshgrid(k, k, indexing="ij")
    dx, dy = np.sin(kx), np.sin(ky)
    dz = mass + np.cos(kx) + np.cos(ky)
    sampled_gap = float(2 * np.min(np.sqrt(dx * dx + dy * dy + dz * dz)))
    if gap < 1e-10:
        return {"kind": "qwz", "bulkGap": 0.0, "sampledGap": 0.0,
                "gapClosed": True, "chern": None, "latticeChern": None,
                "analyticChern": None, "meshResolved": False, "chernIntegral": None,
                "berryCurvature": []}
    matrix = np.empty((grid, grid, 2, 2), dtype=np.complex128)
    matrix[..., 0, 0] = dz
    matrix[..., 1, 1] = -dz
    matrix[..., 0, 1] = dx - 1j * dy
    matrix[..., 1, 0] = dx + 1j * dy
    _, eigenvectors = np.linalg.eigh(matrix)
    occupied = eigenvectors[..., :, 0]
    ux = np.sum(np.conj(occupied) * np.roll(occupied, -1, axis=0), axis=-1)
    uy = np.sum(np.conj(occupied) * np.roll(occupied, -1, axis=1), axis=-1)
    if min(float(np.min(abs(ux))), float(np.min(abs(uy)))) < 1e-10:
        raise ValueError("QWZ momentum mesh crosses a singular link; refine the grid")
    ux, uy = ux / abs(ux), uy / abs(uy)
    plaquette = ux * np.roll(uy, -1, axis=0) * np.conj(np.roll(ux, -1, axis=1)) * np.conj(uy)
    chern_raw = float(np.sum(np.angle(plaquette)) / (2 * np.pi))
    chern = int(round(chern_raw))
    if abs(chern_raw - chern) > 1e-6:
        raise ValueError("Nonintegral lattice Chern number")
    # The mass-sign (Dirac-point) phase diagram is an independent check on a
    # mesh that may be too coarse near m = -2, 0, +2.
    analytic_chern = -1 if -2 < mass < 0 else 1 if 0 < mass < 2 else 0
    resolved = chern == analytic_chern
    # Independent continuous two-band curvature at cell centers, integrated by
    # a midpoint quadrature. This converges with mesh refinement; FHS is integer.
    halfstep = np.pi / grid
    cx, cy = np.meshgrid(k + halfstep, k + halfstep, indexing="ij")
    sx, sy = np.sin(cx), np.sin(cy)
    cosx, cosy = np.cos(cx), np.cos(cy)
    z = mass + cosx + cosy
    norm = np.sqrt(sx * sx + sy * sy + z * z)
    curvature = -0.5 * (sx * sx * cosy + sy * sy * cosx + z * cosx * cosy) / norm ** 3
    integral = float(np.sum(curvature) * (2 * np.pi / grid) ** 2 / (2 * np.pi))
    return {"kind": "qwz", "bulkGap": float(gap), "sampledGap": sampled_gap,
            "gapClosed": False, "chern": chern if resolved else None,
            "latticeChern": chern, "analyticChern": analytic_chern,
            "meshResolved": resolved, "chernIntegral": integral,
            "berryCurvature": curvature.ravel().tolist()}


def solve(job):
    validate("quantum-job", job)
    if job["operation"] != "topology" or job["engine"] != "native":
        raise ValueError("Expected native topology job")
    started = perf_counter()
    np, scipy, _ = libraries()
    model = job["model"]
    if model["type"] == "ssh":
        analysis = ssh_analysis(np, model["parameters"])
    elif model["type"] == "qwz":
        analysis = qwz_analysis(np, model["parameters"])
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
