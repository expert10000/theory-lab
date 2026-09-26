"""Checkpointed 1D/2D final-population sweeps over registered two-level models."""
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import platform
import struct
from time import perf_counter
from uuid import uuid4

from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.native_engine import NativeEvolution, libraries
from quantum_worker.engines.qutip_engine import engine
from quantum_worker.models import build

BOUNDS = {
    "delta": (-1e6, 1e6), "amplitude": (-1e6, 1e6),
    "frequency": (0, 1e6), "phase": (-1000, 1000),
    "sweepRate": (-1e6, 1e6), "gap": (-1e6, 1e6),
    "bias": (-1e6, 1e6), "turnTime": (0.1, 1000),
}


def _axis_values(axis, model):
    name = axis["parameter"]
    if name not in model["parameters"]:
        raise ValueError("Sweep parameter does not belong to the model")
    minimum, maximum = BOUNDS[name]
    if axis["start"] >= axis["stop"] or axis["start"] < minimum or axis["stop"] > maximum:
        raise ValueError("Sweep range is outside model bounds")
    if name == "frequency" and model["type"] == "strong_drive" and axis["start"] <= 0:
        raise ValueError("Strong-drive frequency must be positive")
    return [axis["start"] + (axis["stop"] - axis["start"]) * i / (axis["points"] - 1)
            for i in range(axis["points"])]


def _save_atomic(path, values):
    temporary = path.with_name(path.name + "." + uuid4().hex + ".part")
    try:
        with temporary.open("xb") as stream:
            stream.write(struct.pack("<" + str(len(values)) + "d", *values))
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def _final_population(job, model, cancelled, qt=None):
    setting = job["sweep"]
    if job["engine"] == "qutip":
        solver = qt.SESolver(build(qt, model), options={"normalize_output": True})
        solver.start(qt.basis(2, setting["initialIndex"]), setting["tStart"])
        state = solver.step(setting["tStop"]).full().ravel()
    else:
        reference = {"model": model, "initialState": {"type": "basis", "index": setting["initialIndex"]},
                     "solver": {"tStart": setting["tStart"], "tStop": setting["tStop"]}}
        state = NativeEvolution(reference, cancelled).step(setting["tStop"])
        if state is None:
            return None
    return float(min(1, max(0, abs(state[1]) ** 2)))


def sweep(job, output_dir, cancelled, progress):
    validate("quantum-job", job)
    if job["operation"] != "sweep":
        raise ValueError("Expected sweep job")
    setting = job["sweep"]
    if setting["tStop"] <= setting["tStart"]:
        raise ValueError("tStop must exceed tStart")
    x_values = _axis_values(setting["x"], job["model"])
    y_values = _axis_values(setting["y"], job["model"]) if setting["y"] else [None]
    if setting["y"] and setting["x"]["parameter"] == setting["y"]["parameter"]:
        raise ValueError("Sweep axes must target different parameters")
    total = len(x_values) * len(y_values)
    if total > 10000:
        raise ValueError("Sweep exceeds 10,000 cells")
    started = perf_counter()
    _, scipy, _ = libraries()
    qt = engine() if job["engine"] == "qutip" else None
    version = qt.__version__ if qt else scipy.__version__
    # A library upgrade can change solver output; never reuse an older engine's cells.
    key_payload = {"engine": job["engine"], "engineVersion": version,
                   "model": job["model"], "sweep": setting}
    key = hashlib.sha256(json.dumps(key_payload, sort_keys=True, separators=(",", ":"),
                                    allow_nan=False).encode("utf-8")).hexdigest()
    destination = Path(output_dir).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    cache_dir = destination / "sweep-cache"
    cache_dir.mkdir(exist_ok=True)
    cache_path = cache_dir / (key + ".f64")
    if cache_path.exists():
        raw = cache_path.read_bytes()
        if len(raw) != total * 8:
            raise ValueError("Sweep cache shape mismatch")
        values = list(struct.unpack("<" + str(total) + "d", raw))
        if not all(math.isnan(value) or 0 <= value <= 1 for value in values):
            raise ValueError("Sweep cache contains invalid values")
    else:
        values = [math.nan] * total
    reused = sum(math.isfinite(value) for value in values)
    completed = reused
    computed = 0
    progress(completed, total)
    for y_index, y_value in enumerate(y_values):
        for x_index, x_value in enumerate(x_values):
            index = y_index * len(x_values) + x_index
            if math.isfinite(values[index]):
                continue
            if cancelled.is_set():
                _save_atomic(cache_path, values)
                return None
            model = {"type": job["model"]["type"],
                     "parameters": dict(job["model"]["parameters"])}
            model["parameters"][setting["x"]["parameter"]] = x_value
            if setting["y"]:
                model["parameters"][setting["y"]["parameter"]] = y_value
            population = _final_population(job, model, cancelled, qt)
            if population is None:
                _save_atomic(cache_path, values)
                return None
            values[index] = population
            computed += 1
            completed += 1
            progress(completed, total)
        # Atomic row checkpoints survive worker cancellation or restart.
        _save_atomic(cache_path, values)
    if cancelled.is_set():
        return None
    filename = job["jobId"] + ".f64"
    final_path = destination / filename
    if final_path.exists():
        raise ValueError("Artifact for job ID already exists")
    _save_atomic(final_path, values)
    digest = hashlib.sha256(final_path.read_bytes()).hexdigest()
    result = {
        "schema": "quantum-result/v1", "jobId": job["jobId"], "runId": "run-" + uuid4().hex,
        "status": "completed", "operation": "sweep", "model": job["model"], "sweep": setting,
        "engine": {"name": job["engine"], "version": version},
        "data": {"schema": "quantum-sweep-data/v1", "format": "f64le", "path": filename,
                 "shape": {"x": len(x_values), "y": len(y_values)}, "bytes": total * 8,
                 "sha256": digest},
        "cache": {"key": key, "reusedPoints": reused, "computedPoints": computed},
        "provenance": {"pythonVersion": platform.python_version(), "workerVersion": __version__,
                       "computedAt": datetime.now(timezone.utc).isoformat(),
                       "durationMs": (perf_counter() - started) * 1000},
    }
    validate("quantum-result", result)
    return result
