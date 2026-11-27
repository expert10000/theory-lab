"""Bounded square-lattice p_x/p_y pairing toy; finite sampling makes no topology claim."""
from datetime import datetime, timezone
import math
import platform
from time import perf_counter
from uuid import uuid4

from quantum_worker import __version__
from quantum_worker.contracts import validate


def harmonic(k):
    value = math.sin(k)
    return 0 if abs(value) < 1e-12 else value


def solve(job):
    validate("quantum-lattice-pairing-job", job)
    started = perf_counter()
    p = job["model"]["parameters"]
    n = p["gridSize"]
    rows = []
    for ix in range(n):
        for iy in range(n):
            kx, ky = -math.pi+2*math.pi*ix/n, -math.pi+2*math.pi*iy/n
            xi = -2*(math.cos(kx)+math.cos(ky))-p["mu"]
            re = p["amplitudeX"]*harmonic(kx)+p["amplitudeY"]*math.cos(p["relativePhaseRad"])*harmonic(ky)
            im = p["amplitudeY"]*math.sin(p["relativePhaseRad"])*harmonic(ky)
            magnitude = math.hypot(re,im)
            energy = math.hypot(xi,magnitude)
            node = energy <= 1e-10
            rows.append({"kx":kx,"ky":ky,"xi":xi,"deltaRe":re,"deltaIm":im,
                         "gapMagnitude":magnitude,
                         "phaseRad":None if magnitude <= 1e-12 else math.atan2(im,re),
                         "eMinus":-energy,"ePlus":energy,
                         "electronWeight":None if node else (1+xi/energy)/2,
                         "holeWeight":None if node else (1-xi/energy)/2,"node":node})
    minimum = min(row["ePlus"] for row in rows)
    result = {"schema":"quantum-lattice-pairing-result/v1", "jobId":job["jobId"],
              "runId":"run-"+uuid4().hex,"status":"completed","model":job["model"],
              "basis":"spinless two-component Nambu lattice toy",
              "grid":{"order":"kx-major/ky-minor","domain":"[-pi,pi)","spacing":2*math.pi/n},
              "samples":rows,"sampledMinimumEnergy":minimum,"sampledGapClosed":minimum <= 1e-10,
              "units":{"momentum":"rad/a","energy":"t=1","phase":"rad"},
              "provenance":{"pythonVersion":platform.python_version(),"workerVersion":__version__,
                            "computedAt":datetime.now(timezone.utc).isoformat(),
                            "durationMs":(perf_counter()-started)*1000}}
    validate("quantum-lattice-pairing-result", result)
    return result
