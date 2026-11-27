"""Pedagogical constant-gap reduced 2x2 Nambu sector; no UTe2 material fit."""
from datetime import datetime, timezone
import math
import platform
from time import perf_counter
from uuid import uuid4

from quantum_worker import __version__
from quantum_worker.contracts import validate


def solve(job):
    validate("quantum-bdg-sector-job", job)
    started = perf_counter()
    p = job["model"]["parameters"]
    extent, delta, phase, points = (p[k] for k in ("extent", "delta", "phaseRad", "points"))
    samples = []
    for i in range(points):
        xi = extent*(2*i/(points-1)-1)
        energy = math.hypot(xi, delta)
        node = energy == 0
        samples.append({"xi": xi, "eMinus": -energy, "ePlus": energy,
                        "electronWeight": None if node else (1+xi/energy)/2,
                        "holeWeight": None if node else (1-xi/energy)/2,
                        "pairingPhaseRad": None if delta == 0 else phase, "node": node})
    minimum = min(row["ePlus"] for row in samples)
    result = {
        "schema": "quantum-bdg-sector-result/v1", "jobId": job["jobId"],
        "runId": "run-" + uuid4().hex, "status": "completed", "model": job["model"],
        "basis": "reduced two-component Nambu sector", "samples": samples,
        "minimumPositiveEnergy": minimum, "gapClosed": minimum <= 1e-10,
        "units": {"xi": "dimensionless", "energy": "dimensionless", "phase": "rad"},
        "provenance": {"pythonVersion": platform.python_version(), "workerVersion": __version__,
                       "computedAt": datetime.now(timezone.utc).isoformat(),
                       "durationMs": (perf_counter()-started)*1000},
    }
    validate("quantum-bdg-sector-result", result)
    return result
