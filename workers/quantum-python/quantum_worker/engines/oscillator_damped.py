"""Bounded thermal Lindblad oscillator; no drive or user-defined operators."""
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
from quantum_worker.engines.oscillator_dynamics import initial_coefficients

READOUTS = ["time", "mean_number", "purity", "trace", "boundary_probability", "coherence"]


def oscillator_damped(job, output_dir, cancelled, progress):
    validate("quantum-job", job)
    if job["operation"] != "oscillator_damped":
        raise ValueError("Expected damped oscillator job")
    started = perf_counter()
    np, scipy, _ = libraries()
    p, settings = job["model"]["parameters"], job["solver"]
    n, kappa, nth = p["cutoff"], p["loss"], p["thermalOccupation"]
    psi, probability = initial_coefficients(np, n, job["initialState"])
    rho0 = np.outer(psi, psi.conj())
    a = np.diag(np.sqrt(np.arange(1, n)), 1).astype(complex)
    h = np.diag(p["omega"]*(np.arange(n)+.5)).astype(complex)
    c_down = np.sqrt(kappa*(nth+1))*a
    c_up = np.sqrt(kappa*nth)*a.conj().T
    collapses = [c for c in (c_down, c_up) if np.any(c)]
    times = np.linspace(settings["tStart"], settings["tStop"], settings["samples"])
    if job["engine"] == "qutip":
        qt = engine()
        solver = qt.MESolver(qt.Qobj(h), [qt.Qobj(c) for c in collapses],
                             options={"atol": 1e-12, "rtol": 1e-10, "nsteps": 100000, "normalize_output": False})
        solver.start(qt.Qobj(rho0), float(times[0]))
        state_at = lambda t: solver.step(t).full()
        version = qt.__version__
    else:
        from scipy.integrate import solve_ivp
        version = scipy.__version__
        def rhs(_t, flat):
            rho = flat.reshape((n, n))
            derivative = -1j*(h@rho-rho@h)
            for c in collapses:
                cd = c.conj().T
                cd_c = cd@c
                derivative += c@rho@cd-.5*(cd_c@rho+rho@cd_c)
            return derivative.ravel()
        solution = solve_ivp(rhs, (float(times[0]), float(times[-1])), rho0.ravel(),
                             t_eval=times, method="DOP853", atol=1e-12, rtol=1e-10)
        if not solution.success:
            raise ValueError(f"Native master equation failed: {solution.message}")
        states = solution.y.T.reshape((len(times), n, n))
        state_at = lambda row: states[row]
    destination = Path(output_dir).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    final = destination/(job["jobId"]+".f64")
    if final.exists():
        raise ValueError("Artifact for job ID already exists")
    temporary = destination/(job["jobId"]+"."+uuid4().hex+".part")
    columns = READOUTS+[f"rho_{i}_{j}_{part}" for i in range(n) for j in range(n) for part in ("re", "im")]
    digest = hashlib.sha256()
    initial_number = float(np.arange(n) @ np.diag(rho0).real)
    analysis = {"projectionProbability": probability, "maxTraceError": 0.,
                "minimumEigenvalue": 1., "maxBoundaryOccupation": 0., "maxNumberReferenceError": 0.}
    try:
        with temporary.open("xb") as stream:
            progress(0, len(times))
            for row, t in enumerate(times):
                if cancelled.is_set():
                    return None
                rho = state_at(float(t)) if job["engine"] == "qutip" else state_at(row)
                diagonal = np.diag(rho).real
                trace = float(np.trace(rho).real)
                number = float(np.arange(n) @ diagonal)
                purity = float(np.trace(rho@rho).real)
                coherence = float(np.sum(np.abs(rho))-np.sum(np.abs(diagonal)))
                boundary = float(diagonal[-1])
                minimum = float(np.linalg.eigvalsh((rho+rho.conj().T)/2)[0])
                if not np.isfinite(rho).all() or abs(trace-1)>2e-6 or minimum < -2e-7:
                    raise ValueError("Master equation produced invalid density matrix")
                values = [float(t), number, purity, trace, boundary, max(0., coherence)]
                values += [float(component) for z in rho.ravel() for component in (z.real, z.imag)]
                block = np.asarray(values, dtype="<f8").tobytes()
                stream.write(block)
                digest.update(block)
                tau = float(t-times[0])
                reference = nth+(initial_number-nth)*np.exp(-kappa*tau)
                analysis["maxTraceError"] = max(analysis["maxTraceError"], abs(trace-1))
                analysis["minimumEigenvalue"] = min(analysis["minimumEigenvalue"], minimum)
                analysis["maxBoundaryOccupation"] = max(analysis["maxBoundaryOccupation"], boundary)
                analysis["maxNumberReferenceError"] = max(analysis["maxNumberReferenceError"], abs(number-reference))
                if (row+1)%max(1,len(times)//100)==0 or row+1==len(times):
                    progress(row+1, len(times))
            if cancelled.is_set():
                return None
            stream.flush()
            os.fsync(stream.fileno())
        if cancelled.is_set():
            return None
        result = {"schema":"quantum-result/v1", "jobId":job["jobId"], "runId":"run-"+uuid4().hex,
                  "status":"completed", "operation":"oscillator_damped", "model":job["model"],
                  "initialState":job["initialState"], "solver":settings,
                  "engine":{"name":job["engine"],"version":version},
                  "data":{"schema":"quantum-damped-oscillator-data/v1", "format":"f64le", "path":final.name,
                          "rows":len(times),"columns":columns,"bytes":len(times)*len(columns)*8,"sha256":digest.hexdigest()},
                  "analysis":analysis,
                  "provenance":{"pythonVersion":platform.python_version(),"workerVersion":__version__,
                                "computedAt":datetime.now(timezone.utc).isoformat(),"durationMs":(perf_counter()-started)*1000}}
        validate("quantum-result", result)
        os.replace(temporary, final)
        return result
    finally:
        if temporary.exists():
            temporary.unlink()
