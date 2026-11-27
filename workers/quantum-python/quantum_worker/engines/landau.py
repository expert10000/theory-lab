"""Dimensionless two-order Landau free energy; no UTe2 material fit."""
from datetime import datetime, timezone
import platform
from time import perf_counter
from uuid import uuid4

from quantum_worker import __version__
from quantum_worker.contracts import validate

EPS = 1e-9


def equilibrium(p):
    a1, a2, b1, b2, g = (p[key] for key in ("a1", "a2", "b1", "b2", "g"))

    def free_energy(x, y):
        return a1*x + a2*y + b1*x*x/2 + b2*y*y/2 + g*x*y

    candidates = []

    def add(phase, x, y, stable):
        candidates.append({"phase": phase, "x": x, "y": y,
                           "freeEnergy": free_energy(x, y), "locallyStable": stable})

    add("normal", 0, 0, a1 >= -EPS and a2 >= -EPS)
    if a1 < -EPS:
        x = -a1 / b1
        add("sc1", x, 0, a2 + g*x >= -EPS)
    if a2 < -EPS:
        y = -a2 / b2
        add("sc2", 0, y, a1 + g*y >= -EPS)
    determinant = b1*b2 - g*g
    if determinant > EPS:
        x = (-b2*a1 + g*a2) / determinant
        y = (g*a1 - b1*a2) / determinant
        if x > EPS and y > EPS:
            add("mixed", x, y, True)
    stable = [row for row in candidates if row["locallyStable"]]
    minimum = min(row["freeEnergy"] for row in stable)
    global_minima = [row["phase"] for row in stable if
                     abs(row["freeEnergy"] - minimum) <= 1e-8*(1+abs(minimum))]
    return candidates, global_minima, determinant, abs(determinant) <= EPS


def solve(job):
    validate("quantum-landau-job", job)
    started = perf_counter()
    candidates, minima, determinant, marginal = equilibrium(job["model"]["parameters"])
    result = {
        "schema": "quantum-landau-result/v1", "jobId": job["jobId"],
        "runId": "run-" + uuid4().hex, "status": "completed", "model": job["model"],
        "candidates": candidates, "globalMinima": minima,
        "quarticDeterminant": determinant, "marginalQuartic": marginal,
        "units": {"orderAmplitude": "dimensionless", "freeEnergy": "dimensionless"},
        "provenance": {"pythonVersion": platform.python_version(), "workerVersion": __version__,
                       "computedAt": datetime.now(timezone.utc).isoformat(),
                       "durationMs": (perf_counter()-started)*1000},
    }
    validate("quantum-landau-result", result)
    return result
