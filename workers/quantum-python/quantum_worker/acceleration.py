"""Optional GPU benchmark: accuracy is the gate for any speed comparison."""
import json
import math
import threading
from time import perf_counter

from quantum_worker.engines.dynamiqs_engine import availability, states
from quantum_worker.engines.native_engine import NativeEvolution

TOLERANCE = 5e-4


def assess_samples(reference, candidate, tolerance=TOLERANCE):
    """Compare matching samples and reject invalid normalization before timing claims."""
    if len(reference) != len(candidate) or not reference:
        return {"passed": False, "maxPopulationError": None, "maxNormError": None}
    differences = []
    norms = []
    for expected, actual in zip(reference, candidate):
        if len(expected) != 2 or len(actual) != 2:
            return {"passed": False, "maxPopulationError": None, "maxNormError": None}
        differences.append(abs(abs(expected[1]) ** 2 - abs(actual[1]) ** 2))
        norms.append(abs(sum(abs(value) ** 2 for value in actual) - 1))
    if not all(math.isfinite(value) for value in differences + norms):
        return {"passed": False, "maxPopulationError": None, "maxNormError": None}
    error, norm = max(differences), max(norms)
    return {"passed": error <= tolerance and norm <= 1e-5,
            "maxPopulationError": error, "maxNormError": norm}


def benchmark_evolution():
    info = availability()
    report = {"schema": "quantum-acceleration-benchmark/v1", "engine": "dynamiqs",
              "available": info["available"], "version": info["version"], "device": info["device"],
              "samples": 65, "tolerance": TOLERANCE, "passed": False,
              "maxPopulationError": None, "maxNormError": None, "maxRepeatError": None,
              "deterministic": False,
              "nativeMs": None, "acceleratedMs": None, "speedup": None}
    if not info["available"]:
        return report
    job = {"model": {"type": "driven_two_level", "parameters": {
        "delta": 0.7, "amplitude": 0.6, "frequency": 1.2, "phase": 0.3}},
        "initialState": {"type": "basis", "index": 0},
        "solver": {"tStart": 0.0, "tStop": 6.0, "samples": 65}}
    cancelled = threading.Event()
    started = perf_counter()
    cpu = NativeEvolution(job, cancelled)
    reference = [tuple(cpu.step(6.0 * index / 64)) for index in range(65)]
    native_ms = (perf_counter() - started) * 1000
    started = perf_counter()
    candidate = [values for _, values in states(job, cancelled)]
    accelerated_ms = (perf_counter() - started) * 1000
    repeated = [values for _, values in states(job, cancelled)]
    checks = assess_samples(reference, candidate)
    report.update(checks)
    repeat = assess_samples(candidate, repeated, 1e-8)
    report["maxRepeatError"] = repeat["maxPopulationError"]
    report["deterministic"] = repeat["passed"]
    report["passed"] = checks["passed"] and repeat["passed"]
    report["nativeMs"] = native_ms
    report["acceleratedMs"] = accelerated_ms
    if report["passed"]:
        report["speedup"] = native_ms / accelerated_ms if accelerated_ms > 0 else None
    return report


if __name__ == "__main__":
    print(json.dumps(benchmark_evolution(), sort_keys=True))
