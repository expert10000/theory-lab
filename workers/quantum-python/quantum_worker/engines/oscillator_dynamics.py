"""Free harmonic motion: native spectral phases versus QuTiP integration.

Initial coherent state is the explicitly normalized finite Fock projection.
Projection loss is reported. Solver output and plotted box density are never
renormalized. Conditional moments divide by the measured norm.
"""
from datetime import datetime, timezone
import hashlib
import os
from pathlib import Path
import platform
from time import perf_counter
from uuid import uuid4

from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.native_engine import libraries
from quantum_worker.engines.qutip_engine import engine

MOMENT_COLUMNS = ["time", "q_mean", "p_mean", "q_variance", "p_variance", "mean_number", "boundary_probability", "norm", "q_exact", "p_exact"]


def initial_coefficients(np, cutoff, initial):
    psi = np.zeros(cutoff, dtype=complex)
    if initial["type"] == "fock":
        psi[initial["index"]] = 1
    else:
        alpha = complex(initial["alphaRe"], initial["alphaIm"])
        psi[0] = np.exp(-abs(alpha)**2/2)
        for n in range(1, cutoff):
            psi[n] = psi[n-1]*alpha/np.sqrt(n)
    probability = float(np.vdot(psi, psi).real)
    return psi/np.sqrt(probability), probability


def oscillator_evolve(job, output_dir, cancelled, progress):
    validate("quantum-job", job)
    if job["operation"] != "oscillator_evolve":
        raise ValueError("Expected oscillator evolution job")
    started = perf_counter()
    np, scipy, _ = libraries()
    p, settings, initial = job["model"]["parameters"], job["solver"], job["initialState"]
    n, omega, rows = p["cutoff"], p["omega"], settings["samples"]
    psi0, probability = initial_coefficients(np, n, initial)
    a = np.diag(np.sqrt(np.arange(1, n)), 1)
    q, momentum = (a+a.T)/np.sqrt(2), -1j*(a-a.T)/np.sqrt(2)
    energies = omega*(np.arange(n)+.5)
    if job["engine"] == "qutip":
        qt = engine()
        h = omega*(qt.num(n)+.5*qt.qeye(n))
        solver = qt.SESolver(h, options={"normalize_output": False, "atol": 1e-12, "rtol": 1e-10, "nsteps": 100000})
        solver.start(qt.Qobj(psi0), settings["tStart"])
        version = qt.__version__
        state_at = lambda t: solver.step(t).full().ravel()
    else:
        version = scipy.__version__
        state_at = lambda t: psi0*np.exp(-1j*energies*(t-settings["tStart"]))
    alpha = complex(initial["alphaRe"], initial["alphaIm"]) if initial["type"] == "coherent" else 0j
    destination = Path(output_dir).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    final = destination/(job["jobId"]+".f64")
    if final.exists():
        raise ValueError("Artifact for job ID already exists")
    temporary = destination/(job["jobId"]+"."+uuid4().hex+".part")
    digest = hashlib.sha256()
    columns = MOMENT_COLUMNS+[part for k in range(n) for part in (f"c{k}_re", f"c{k}_im")]
    analysis = {"projectionProbability": probability, "omittedProbability": max(0., 1-probability),
                "maxNormDrift": 0., "maxBoundaryOccupation": 0., "maxQError": 0., "maxPError": 0., "maxEnergyDrift": 0.}
    initial_number = float(np.arange(n) @ abs(psi0)**2)
    try:
        with temporary.open("xb") as stream:
            progress(0, rows)
            for row, t in enumerate(np.linspace(settings["tStart"], settings["tStop"], rows)):
                if cancelled.is_set():
                    return None
                psi = state_at(float(t))
                norm = float(np.vdot(psi, psi).real)
                qp, pp = q@psi, momentum@psi
                qm, pm = float(np.vdot(psi, qp).real/norm), float(np.vdot(psi, pp).real/norm)
                qvar, pvar = float(np.vdot(qp, qp).real/norm-qm**2), float(np.vdot(pp, pp).real/norm-pm**2)
                number, boundary = float(np.arange(n) @ abs(psi)**2/norm), float(abs(psi[-1])**2/norm)
                exact_alpha = alpha*np.exp(-1j*omega*(t-settings["tStart"]))
                qe, pe = float(np.sqrt(2)*exact_alpha.real), float(np.sqrt(2)*exact_alpha.imag)
                values = [float(t), qm, pm, qvar, pvar, number, boundary, norm, qe, pe]
                values += [float(v) for c in psi for v in (c.real, c.imag)]
                block = np.asarray(values, dtype="<f8").tobytes()
                stream.write(block)
                digest.update(block)
                for key, value in {"maxNormDrift": abs(norm-1), "maxBoundaryOccupation": boundary,
                                   "maxQError": abs(qm-qe), "maxPError": abs(pm-pe),
                                   "maxEnergyDrift": omega*abs(number-initial_number)}.items():
                    analysis[key] = max(analysis[key], float(value))
                if (row+1) % max(1, rows//100) == 0 or row+1 == rows:
                    progress(row+1, rows)
            if cancelled.is_set():
                return None
            stream.flush()
            os.fsync(stream.fileno())
        if cancelled.is_set():
            return None
        result = {"schema": "quantum-result/v1", "jobId": job["jobId"], "runId": "run-"+uuid4().hex,
                  "status": "completed", "operation": "oscillator_evolve", "model": job["model"],
                  "initialState": initial, "solver": settings, "engine": {"name": job["engine"], "version": version},
                  "data": {"schema": "quantum-oscillator-data/v1", "format": "f64le", "path": final.name,
                           "rows": rows, "columns": columns, "bytes": rows*len(columns)*8, "sha256": digest.hexdigest()},
                  "analysis": analysis, "provenance": {"pythonVersion": platform.python_version(), "workerVersion": __version__,
                      "computedAt": datetime.now(timezone.utc).isoformat(), "durationMs": (perf_counter()-started)*1000}}
        validate("quantum-result", result)
        os.replace(temporary, final)
        return result
    finally:
        if temporary.exists():
            temporary.unlink()
