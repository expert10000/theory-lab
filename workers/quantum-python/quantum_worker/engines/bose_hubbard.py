"""Bounded, fixed-particle Bose-Hubbard dimer in hopping units J=1."""
from datetime import datetime, timezone
import platform
from time import perf_counter
from uuid import uuid4

from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.native_engine import libraries


def hamiltonian(np, particles, interaction_ratio):
    """Basis row n is |n, N-n>, n=0..N; open two-site bond."""
    matrix = np.zeros((particles + 1, particles + 1), dtype=np.float64)
    for n in range(particles + 1):
        right = particles - n
        matrix[n, n] = interaction_ratio * (n * (n - 1) + right * (right - 1)) / 2
        if n < particles:
            hopping = -float(np.sqrt((n + 1) * right))
            matrix[n, n + 1] = hopping
            matrix[n + 1, n] = hopping
    return matrix


def solve(job):
    validate("quantum-bose-hubbard-job", job)
    started = perf_counter()
    np, scipy, _ = libraries()
    particles = job["model"]["parameters"]["particles"]
    interaction_ratio = job["model"]["parameters"]["interactionRatio"]
    matrix = hamiltonian(np, particles, interaction_ratio)
    energies, vectors = np.linalg.eigh(matrix)
    basis = list(range(particles + 1))
    states = []
    for index, energy in enumerate(energies):
        amplitudes = vectors[:, index].copy()
        first = next(i for i, value in enumerate(amplitudes) if abs(value) > 1e-12)
        if amplitudes[first] < 0:
            amplitudes *= -1
        probability = amplitudes**2
        left = float(np.dot(basis, probability))
        variance = float(np.dot(np.square(basis), probability) - left**2)
        coherence = float(sum(
            amplitudes[n + 1] * amplitudes[n] * np.sqrt((n + 1) * (particles - n))
            for n in range(particles)
        ))
        states.append({
            "index": index,
            "amplitudes": [float(value) for value in amplitudes],
            "occupation": [left, float(particles - left)],
            "numberVariance": [max(0.0, variance), max(0.0, variance)],
            "oneBodyCoherence": coherence,
            "residual": float(np.linalg.norm(matrix @ amplitudes - energy * amplitudes)),
            "normalizationError": float(abs(np.linalg.norm(amplitudes) - 1)),
        })
    result = {
        "schema": "quantum-bose-hubbard-result/v1", "jobId": job["jobId"],
        "runId": "run-" + uuid4().hex, "status": "completed",
        "model": job["model"],
        "engine": {"name": "native", "version": scipy.__version__},
        "basis": {"leftOccupations": basis, "ordering": "|n,N-n> ascending n"},
        "spectrum": {"energies": [float(value) for value in energies],
                     "gap": float(energies[1] - energies[0]), "energyUnits": "J"},
        "states": states,
        "units": {"occupation": "bosons per site", "numberVariance": "bosons^2",
                  "oneBodyCoherence": "bosons"},
        "provenance": {"pythonVersion": platform.python_version(),
                       "workerVersion": __version__,
                       "computedAt": datetime.now(timezone.utc).isoformat(),
                       "durationMs": (perf_counter() - started) * 1000},
    }
    validate("quantum-bose-hubbard-result", result)
    return result
