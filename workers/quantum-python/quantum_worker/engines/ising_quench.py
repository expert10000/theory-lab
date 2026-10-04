"""Bounded sudden transverse-field quench from a verified Ising run's ground state.

No state vector is exported. The source run is verified and hash-bound by Electron;
the worker independently reconstructs its ground state and target Hamiltonian.
"""
from datetime import datetime, timezone
import platform
import re

from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.many_body import _native_hamiltonian
from quantum_worker.engines.native_engine import libraries


def solve(request):
    if not isinstance(request, dict) or set(request) != {"job", "source", "sourceResult", "quench"}:
        raise ValueError("Invalid Ising quench request")
    job, source, source_result, quench = (request[key] for key in ("job", "source", "sourceResult", "quench"))
    validate("quantum-job", job)
    validate("quantum-result", source_result)
    if job["operation"] != "many_body" or source_result["operation"] != "many_body" or (
            source_result["jobId"] != job["jobId"] or source_result["model"] != job["model"] or
            source_result["engine"]["name"] != job["engine"] or not isinstance(source, dict) or
            set(source) != {"runId", "jobSha256", "resultSha256"} or
            not isinstance(source["runId"], str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", source["runId"]) or
            source_result["runId"] != source["runId"] or any(
                not isinstance(source[key], str) or not re.fullmatch(r"[a-f0-9]{64}", source[key])
                for key in ("jobSha256", "resultSha256"))):
        raise ValueError("Invalid verified Ising source lineage")
    if not isinstance(quench, dict) or set(quench) != {"targetTransverse", "duration", "samples"} or (
            isinstance(quench["samples"], bool) or not isinstance(quench["samples"], int) or
            quench["samples"] < 5 or quench["samples"] > 101):
        raise ValueError("Invalid bounded Ising quench grid")
    np, _, _ = libraries()
    target_field, duration, samples = quench["targetTransverse"], quench["duration"], quench["samples"]
    if (not all(isinstance(v, (int, float)) and not isinstance(v, bool) and np.isfinite(v)
                for v in (target_field, duration)) or abs(target_field) > 10 or duration <= 0 or duration > 20):
        raise ValueError("Unsupported Ising quench parameters")
    p = job["model"]["parameters"]
    initial_h = _native_hamiltonian(np, p)
    initial_energies, initial_vectors = np.linalg.eigh(initial_h)
    initial_energy = float(initial_energies[0])
    gap = float(max(0, initial_energies[1] - initial_energy))
    threshold = 1e-8 * max(1, abs(initial_energy))
    if gap <= threshold:
        raise ValueError("Degenerate initial Ising ground state; a unique quench state is unavailable")
    if (abs(initial_energy-source_result["spectrum"]["lowEnergies"][0]) > 1e-7 or
            abs(gap-source_result["spectrum"]["gap"]) > 1e-7):
        raise ValueError("Initial spectrum disagrees with the verified source run")
    target_p = {**p, "transverse": target_field}
    target_h = _native_hamiltonian(np, target_p)
    target_energies, target_vectors = np.linalg.eigh(target_h)
    amplitudes = target_vectors.conj().T @ initial_vectors[:, 0]
    sites = p["sites"]
    states = np.arange(2**sites, dtype=np.int64)
    signs = np.array([1-2*((states >> (sites-1-i)) & 1) for i in range(sites)], dtype=np.float64)
    rows = []
    for t in np.linspace(0, duration, samples):
        evolved = target_vectors @ (np.exp(-1j*target_energies*t)*amplitudes)
        probability = abs(evolved)**2
        rows.append({"time":float(t),"siteMagnetization":[float(sign@probability) for sign in signs],
                     "norm":float(np.vdot(evolved, evolved).real),
                     "energy":float(np.vdot(evolved,target_h@evolved).real)})
    norm_drift = max(abs(row["norm"]-1) for row in rows)
    energy_drift = max(abs(row["energy"]-rows[0]["energy"]) for row in rows)
    if norm_drift > 1e-7 or energy_drift > 1e-7:
        raise ValueError("Ising quench conservation diagnostics exceeded tolerance")
    result = {"schema":"quantum-ising-quench/v1", "source":source,
              "initial":{**p,"groundEnergy":initial_energy,"gap":gap},
              "targetTransverse":target_field,"duration":duration,"samples":samples,
              "basis":"z-up-is-0-msb-first","columns":"time,site_magnetization,norm,energy",
              "rows":rows,"maximumNormDrift":norm_drift,"maximumEnergyDrift":energy_drift,
              "provenance":{"engine":"native","sourceEngine":job["engine"],
                            "pythonVersion":platform.python_version(),"workerVersion":__version__,
                            "computedAt":datetime.now(timezone.utc).isoformat()}}
    validate("quantum-ising-quench", result)
    return result
