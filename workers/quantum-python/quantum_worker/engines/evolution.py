"""Driven two-level QuTiP evolution and little-endian binary artifact."""
import hashlib
import math
import os
from pathlib import Path
import platform
import struct
from time import perf_counter
from datetime import datetime, timezone
from uuid import uuid4
from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.qutip_engine import engine

COLUMNS = ["time", "p0", "p1", "sigma_x", "sigma_y", "sigma_z", "c0_re", "c0_im", "c1_re", "c1_im"]

def evolve(job, output_dir, cancelled, progress):
    validate("quantum-job", job)
    if job["operation"] != "evolve":
        raise ValueError("Expected evolution job")
    settings = job["solver"]
    if settings["tStop"] <= settings["tStart"]:
        raise ValueError("tStop must exceed tStart")
    started = perf_counter()
    qt = engine()
    p = job["model"]["parameters"]
    def coefficient(t):
        return 0.5 * p["amplitude"] * math.cos(p["frequency"] * t + p["phase"])
    hamiltonian = qt.QobjEvo([0.5 * p["delta"] * qt.sigmaz(), [qt.sigmax(), coefficient]])
    solver = qt.SESolver(hamiltonian, options={"normalize_output": True})
    solver.start(qt.basis(2, job["initialState"]["index"]), settings["tStart"])
    destination = Path(output_dir).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    filename = job["jobId"] + ".f64"
    final_path = destination / filename
    if final_path.exists():
        raise ValueError("Artifact for job ID already exists")
    temporary = destination / (job["jobId"] + "." + uuid4().hex + ".part")
    rows = settings["samples"]
    interval = (settings["tStop"] - settings["tStart"]) / (rows - 1)
    digest = hashlib.sha256()
    try:
        with temporary.open("xb") as stream:
            progress(0, rows)
            for i in range(rows):
                if cancelled.is_set():
                    return None
                t = settings["tStart"] + interval * i
                state = solver.step(t)
                c0, c1 = state.full().ravel()
                p0, p1 = abs(c0) ** 2, abs(c1) ** 2
                sx = 2 * (c0.conjugate() * c1).real
                sy = 2 * (c0.conjugate() * c1).imag
                sz = p0 - p1
                block = struct.pack("<10d", t, p0, p1, sx, sy, sz,
                                    c0.real, c0.imag, c1.real, c1.imag)
                stream.write(block)
                digest.update(block)
                if (i + 1) % max(1, rows // 100) == 0 or i + 1 == rows:
                    progress(i + 1, rows)
            if cancelled.is_set():
                return None
            stream.flush()
            os.fsync(stream.fileno())
        if cancelled.is_set():
            return None
        os.replace(temporary, final_path)
        result = {
            "schema": "quantum-result/v1", "jobId": job["jobId"], "runId": "run-" + uuid4().hex,
            "status": "completed", "operation": "evolve", "model": job["model"],
            "initialState": job["initialState"], "solver": settings, "observables": job["observables"],
            "engine": {"name": "qutip", "version": qt.__version__},
            "data": {"schema": "quantum-data/v1", "format": "f64le", "path": filename,
                     "rows": rows, "columns": COLUMNS, "bytes": rows * 80, "sha256": digest.hexdigest()},
            "provenance": {"pythonVersion": platform.python_version(), "workerVersion": __version__,
                           "computedAt": datetime.now(timezone.utc).isoformat(),
                           "durationMs": (perf_counter() - started) * 1000},
        }
        validate("quantum-result", result)
        return result
    finally:
        if temporary.exists():
            temporary.unlink()
