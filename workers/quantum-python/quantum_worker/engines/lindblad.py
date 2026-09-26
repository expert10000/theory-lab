"""Rotating-frame Jaynes–Cummings Lindblad laboratory.

Collapse rates are energy-decay rates. Pure dephasing uses sqrt(gamma_phi/2)
times the Pauli-z operator, so an isolated qubit coherence decays at gamma_phi.
"""
from datetime import datetime, timezone
import hashlib
import math
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

COLUMNS = ["time", "p_excited", "mean_photon", "purity", "coherence", "boundary_probability", "trace"]


def operators(np, p):
    n = p["cutoff"]
    identity = np.eye(n, dtype=complex)
    atom_identity = np.eye(2, dtype=complex)
    a = np.kron(atom_identity, np.diag(np.sqrt(np.arange(1, n)), 1))
    lowering = np.kron(np.array([[0, 1], [0, 0]], dtype=complex), identity)
    excited = np.kron(np.diag([0, 1]), identity)
    z = np.kron(np.diag([-1, 1]), identity)
    h = (p["qubitDetuning"] * excited + p["cavityDetuning"] * a.conj().T @ a
         + p["coupling"] * (lowering.conj().T @ a + lowering @ a.conj().T)
         + p["driveAmplitude"] * (a + a.conj().T))
    collapses = []
    if p["relaxation"]:
        collapses.append(math.sqrt(p["relaxation"]) * lowering)
    if p["dephasing"]:
        collapses.append(math.sqrt(p["dephasing"] / 2) * z)
    if p["cavityLoss"]:
        collapses.append(math.sqrt(p["cavityLoss"]) * a)
    return h, collapses


def liouvillian(np, h, collapses):
    dimension = h.shape[0]
    identity = np.eye(dimension, dtype=complex)
    matrix = -1j * (np.kron(identity, h) - np.kron(h.T, identity))
    for c in collapses:
        cdc = c.conj().T @ c
        matrix += (np.kron(c.conj(), c) - 0.5 * np.kron(identity, cdc)
                   - 0.5 * np.kron(cdc.T, identity))
    return matrix


def readout(np, rho, cutoff):
    diagonal = np.real(np.diag(rho)).reshape((2, cutoff))
    photons = diagonal.sum(axis=0)
    return {
        "pExcited": float(diagonal[1].sum()),
        "meanPhoton": float(np.arange(cutoff) @ photons),
        "purity": float(np.real(np.trace(rho @ rho))),
        "coherence": float(abs(np.trace(rho[:cutoff, cutoff:]))),
        "boundaryProbability": float(photons[-1]),
        "trace": float(np.real(np.trace(rho))),
    }


def _native_solver(np, scipy, matrix, rho0, settings, cancelled):
    from scipy.integrate import DOP853
    solver = DOP853(lambda _t, y: matrix @ y, settings["tStart"],
                    rho0.ravel(order="F"), settings["tStop"], rtol=1e-9, atol=1e-11)
    segment = None
    dimension = rho0.shape[0]

    def state_at(t):
        nonlocal segment
        if segment is None and t == solver.t:
            return solver.y.reshape((dimension, dimension), order="F")
        while solver.t < t:
            if cancelled.is_set():
                return None
            if solver.status != "running":
                raise RuntimeError("Native Lindblad integrator stopped before sample")
            solver.step()
            if solver.status == "failed":
                raise RuntimeError("Native Lindblad integration failed")
            segment = solver.dense_output()
        return segment(t).reshape((dimension, dimension), order="F")
    return state_at


def _steady_native(np, matrix, dimension):
    system = matrix.copy()
    rhs = np.zeros(dimension * dimension, dtype=complex)
    trace_row = np.zeros(dimension * dimension, dtype=complex)
    trace_row[::dimension + 1] = 1
    system[0, :] = trace_row
    rhs[0] = 1
    rho = np.linalg.solve(system, rhs).reshape((dimension, dimension), order="F")
    rho = 0.5 * (rho + rho.conj().T)
    return rho / np.trace(rho)


def lindblad(job, output_dir, cancelled, progress):
    validate("quantum-job", job)
    if job["operation"] != "lindblad":
        raise ValueError("Expected Lindblad job")
    settings = job["solver"]
    if settings["tStop"] <= settings["tStart"]:
        raise ValueError("tStop must exceed tStart")
    p = job["model"]["parameters"]
    cutoff = p["cutoff"]
    if job["initialState"]["photons"] >= cutoff:
        raise ValueError("Initial photons must be below the Fock cutoff")
    started = perf_counter()
    np, scipy, _ = libraries()
    atom = job["initialState"]["qubit"]
    atom_state = np.array([1, 0] if atom == "ground" else [0, 1] if atom == "excited"
                          else [1 / math.sqrt(2), 1 / math.sqrt(2)], dtype=complex)
    photon_state = np.zeros(cutoff, dtype=complex)
    photon_state[job["initialState"]["photons"]] = 1
    psi = np.kron(atom_state, photon_state)
    rho0 = np.outer(psi, psi.conj())
    h, collapses = operators(np, p)
    if job["engine"] == "qutip":
        qt = engine()
        dims = [[2, cutoff], [2, cutoff]]
        solver = qt.MESolver(qt.Qobj(h, dims=dims), [qt.Qobj(c, dims=dims) for c in collapses])
        solver.start(qt.Qobj(rho0, dims=dims), settings["tStart"])
        def state_at(t):
            return solver.step(t).full()
        version = qt.__version__
    elif job["engine"] == "native":
        matrix = liouvillian(np, h, collapses)
        state_at = _native_solver(np, scipy, matrix, rho0, settings, cancelled)
        version = scipy.__version__
    else:
        raise ValueError("Unsupported Lindblad engine")

    # The both-loss condition is conservative: it avoids labeling a nonunique
    # dephasing-only or undamped-cavity nullspace as a physical unique steady state.
    steady = None
    if p["relaxation"] > 0 and p["cavityLoss"] > 0:
        if job["engine"] == "qutip":
            steady_rho = qt.steadystate(qt.Qobj(h, dims=dims),
                                       [qt.Qobj(c, dims=dims) for c in collapses]).full()
        else:
            steady_rho = _steady_native(np, matrix, 2 * cutoff)
        steady = readout(np, steady_rho, cutoff)
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
                t = settings["tStop"] if i == rows - 1 else settings["tStart"] + i * interval
                rho = state_at(t)
                if rho is None:
                    return None
                values = readout(np, rho, cutoff)
                block = struct.pack("<7d", t, values["pExcited"], values["meanPhoton"],
                                    values["purity"], values["coherence"],
                                    values["boundaryProbability"], values["trace"])
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
            "status": "completed", "operation": "lindblad", "model": job["model"],
            "initialState": job["initialState"], "solver": settings,
            "engine": {"name": job["engine"], "version": version}, "steadyState": steady,
            "data": {"schema": "quantum-lindblad-data/v1", "format": "f64le", "path": filename,
                     "rows": rows, "columns": COLUMNS, "bytes": rows * 56, "sha256": digest.hexdigest()},
            "provenance": {"pythonVersion": platform.python_version(), "workerVersion": __version__,
                           "computedAt": datetime.now(timezone.utc).isoformat(),
                           "durationMs": (perf_counter() - started) * 1000},
        }
        validate("quantum-result", result)
        return result
    finally:
        if temporary.exists():
            temporary.unlink()
