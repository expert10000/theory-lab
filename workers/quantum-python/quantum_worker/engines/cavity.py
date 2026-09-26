"""Closed atom–cavity dynamics for Jaynes–Cummings and quantum Rabi models.

Tensor order is atom × Fock. |g> = basis(2,0), |e> = basis(2,1),
matching the linked Volume VIII QuTiP Jaynes–Cummings reference adapter.
The lab uses the laboratory-frame Hamiltonian; the reference uses a frame
rotating at cavity frequency. Their one-excitation splitting is identical.
"""
from datetime import datetime, timezone
import hashlib
import os
from pathlib import Path
import platform
import struct
from time import perf_counter
from uuid import uuid4

from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.native_engine import libraries
from quantum_worker.engines.qutip_engine import engine

COLUMNS = ["time", "p_excited", "mean_photon", "boundary_probability", "norm", "parity"]


def _matrices(np, parameters, kind):
    n = parameters["cutoff"]
    eye = np.eye(n, dtype=complex)
    qubit_eye = np.eye(2, dtype=complex)
    a = np.diag(np.sqrt(np.arange(1, n)), 1)
    number = np.diag(np.arange(n))
    excited = np.diag([0, 1])
    lowering = np.array([[0, 1], [0, 0]], dtype=complex)
    h = (parameters["cavityFrequency"] * np.kron(qubit_eye, number)
         + parameters["qubitFrequency"] * np.kron(excited, eye))
    if kind == "jaynes_cummings":
        h += parameters["coupling"] * (np.kron(lowering.conj().T, a)
                                           + np.kron(lowering, a.conj().T))
    else:
        h += parameters["coupling"] * np.kron(lowering + lowering.conj().T,
                                                a + a.conj().T)
    return h


def _qutip_hamiltonian(qt, parameters, kind):
    n = parameters["cutoff"]
    a = qt.tensor(qt.qeye(2), qt.destroy(n))
    excited = qt.tensor(qt.basis(2, 1) * qt.basis(2, 1).dag(), qt.qeye(n))
    lowering = qt.tensor(qt.basis(2, 0) * qt.basis(2, 1).dag(), qt.qeye(n))
    h = parameters["cavityFrequency"] * a.dag() * a + parameters["qubitFrequency"] * excited
    if kind == "jaynes_cummings":
        return h + parameters["coupling"] * (lowering.dag() * a + lowering * a.dag())
    return h + parameters["coupling"] * (lowering + lowering.dag()) * (a + a.dag())


def cavity(job, output_dir, cancelled, progress):
    validate("quantum-job", job)
    if job["operation"] != "cavity":
        raise ValueError("Expected cavity job")
    settings = job["solver"]
    if settings["tStop"] <= settings["tStart"]:
        raise ValueError("tStop must exceed tStart")
    parameters = job["model"]["parameters"]
    n = parameters["cutoff"]
    if job["initialState"]["photons"] >= n:
        raise ValueError("Initial photons must be below the Fock cutoff")
    started = perf_counter()
    np, scipy, _ = libraries()
    start_index = (1 if job["initialState"]["qubit"] == "excited" else 0) * n + job["initialState"]["photons"]
    initial = np.zeros(2 * n, dtype=complex)
    initial[start_index] = 1
    if job["engine"] == "qutip":
        qt = engine()
        h = _qutip_hamiltonian(qt, parameters, job["model"]["type"])
        energies = [float(value) for value in h.eigenenergies()]
        solver = qt.SESolver(h, options={"normalize_output": True})
        solver.start(qt.tensor(qt.basis(2, start_index // n), qt.basis(n, start_index % n)), settings["tStart"])
        version = qt.__version__
        def state_at(t):
            return solver.step(t).full().ravel()
    elif job["engine"] == "native":
        h = _matrices(np, parameters, job["model"]["type"])
        eigenvalues, eigenvectors = np.linalg.eigh(h)
        energies = [float(value) for value in eigenvalues]
        coefficients = eigenvectors.conj().T @ initial
        version = scipy.__version__
        def state_at(t):
            return eigenvectors @ (np.exp(-1j * eigenvalues * (t - settings["tStart"])) * coefficients)
    else:
        raise ValueError("Unsupported cavity engine")

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
    signs = (-1.0) ** np.arange(n)
    try:
        with temporary.open("xb") as stream:
            progress(0, rows)
            for i in range(rows):
                if cancelled.is_set():
                    return None
                t = settings["tStop"] if i == rows - 1 else settings["tStart"] + i * interval
                state = state_at(t).reshape((2, n))
                probabilities = abs(state) ** 2
                per_photon = probabilities.sum(axis=0)
                norm = float(per_photon.sum())
                excited = float(probabilities[1].sum())
                mean_photon = float(np.arange(n) @ per_photon)
                boundary = float(per_photon[-1])
                parity = float(signs @ (probabilities[0] - probabilities[1]))
                block = struct.pack("<6d", t, excited, mean_photon, boundary, norm, parity)
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
            "status": "completed", "operation": "cavity", "model": job["model"],
            "initialState": job["initialState"], "solver": settings,
            "engine": {"name": job["engine"], "version": version},
            "dressedSpectrum": energies,
            "data": {"schema": "quantum-cavity-data/v1", "format": "f64le", "path": filename,
                     "rows": rows, "columns": COLUMNS, "bytes": rows * 48, "sha256": digest.hexdigest()},
            "provenance": {"pythonVersion": platform.python_version(), "workerVersion": __version__,
                           "computedAt": datetime.now(timezone.utc).isoformat(),
                           "durationMs": (perf_counter() - started) * 1000},
        }
        validate("quantum-result", result)
        return result
    finally:
        if temporary.exists():
            temporary.unlink()
