"""Bounded monochromatic forcing, not an arbitrary envelope or pulse interpreter.

H_lab = omega*(N+1/2) + epsilon(t)*a.dag() + epsilon(t).conj()*a,
epsilon(t)=epsilon0*exp(-i*nu*(t-tStart)). Native solves the finite rotating
Hamiltonian exactly; QuTiP integrates the laboratory Hamiltonian independently.
Initial projection is normalized by definition; solver output is never corrected.
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
from quantum_worker.engines.oscillator_dynamics import initial_coefficients, MOMENT_COLUMNS


def oscillator_drive(job, output_dir, cancelled, progress, _forcing=None):
    validate("quantum-job", job)
    if job["operation"] != ("oscillator_pulse" if _forcing else "oscillator_drive"):
        raise ValueError("Expected monochromatic oscillator drive")
    started = perf_counter()
    np, scipy, _ = libraries()
    p, s, initial = job["model"]["parameters"], job["solver"], job["initialState"]
    n, omega, nu, rows = p["cutoff"], p["omega"], p["driveFrequency"], s["samples"]
    eps = complex(p["epsilonRe"], p["epsilonIm"])
    psi0, probability = initial_coefficients(np, n, initial)
    a = np.diag(np.sqrt(np.arange(1, n)), 1)
    q, momentum = (a+a.T)/np.sqrt(2), -1j*(a-a.T)/np.sqrt(2)
    if _forcing:
        state_at, version = _forcing["states"](np, scipy, psi0)
    elif job["engine"] == "native":
        rotating = np.diag((omega-nu)*np.arange(n)+omega/2)+eps*a.T+eps.conjugate()*a
        energies, vectors = scipy.linalg.eigh(rotating)
        coefficients = vectors.conj().T@psi0
        state_at = lambda t: np.exp(-1j*nu*np.arange(n)*(t-s["tStart"]))*(vectors@(coefficients*np.exp(-1j*energies*(t-s["tStart"]))))
        version = scipy.__version__
    else:
        qt = engine()
        lowering = qt.destroy(n)
        def envelope(t):
            return eps*np.exp(-1j*nu*(t-s["tStart"]))
        def conjugate_envelope(t):
            return envelope(t).conjugate()
        h = qt.QobjEvo([omega*(qt.num(n)+.5*qt.qeye(n)), [lowering.dag(), envelope], [lowering, conjugate_envelope]])
        solver = qt.SESolver(h, options={"normalize_output": False, "atol": 1e-12, "rtol": 1e-10, "nsteps": 100000})
        solver.start(qt.Qobj(psi0), s["tStart"])
        state_at = lambda t: solver.step(t).full().ravel()
        version = qt.__version__
    alpha = complex(initial["alphaRe"], initial["alphaIm"]) if initial["type"] == "coherent" else 0j
    base_number = initial["index"] if initial["type"] == "fock" else 0
    destination = Path(output_dir).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    final = destination/(job["jobId"]+".f64")
    if final.exists():
        raise ValueError("Artifact for job ID already exists")
    temporary = destination/(job["jobId"]+"."+uuid4().hex+".part")
    digest = hashlib.sha256()
    columns = MOMENT_COLUMNS+["number_exact", "energy", "power"]+[part for k in range(n) for part in (f"c{k}_re", f"c{k}_im")]
    analysis = {"projectionProbability": probability, "omittedProbability": max(0., 1-probability),
                "maxNormDrift": 0., "maxBoundaryOccupation": 0., "maxQError": 0., "maxPError": 0.,
                "maxNumberError": 0., "maxWorkBalanceError": 0., "energyOffset": omega/2}
    if _forcing:
        analysis.update(_forcing["analysis"])
    work = 0.
    previous_time = s["tStart"]
    previous_power = initial_energy = None
    try:
        with temporary.open("xb") as stream:
            progress(0, rows)
            for row, t in enumerate(np.linspace(s["tStart"], s["tStop"], rows)):
                if cancelled.is_set():
                    return None
                tau = t-s["tStart"]
                psi = state_at(float(t))
                norm = float(np.vdot(psi, psi).real)
                qp, pp = q@psi, momentum@psi
                qm, pm = float(np.vdot(psi, qp).real/norm), float(np.vdot(psi, pp).real/norm)
                qvar, pvar = float(np.vdot(qp, qp).real/norm-qm**2), float(np.vdot(pp, pp).real/norm-pm**2)
                number, boundary = float(np.arange(n)@abs(psi)**2/norm), float(abs(psi[-1])**2/norm)
                # np.sinc(x) = sin(pi*x)/(pi*x): stable through exact resonance.
                displacement = (_forcing["displacement"](tau) if _forcing else
                    -1j*eps*tau*np.exp(-.5j*(omega+nu)*tau)*np.sinc((omega-nu)*tau/(2*np.pi)))
                beta = alpha*np.exp(-1j*omega*tau)+displacement
                qe, pe = float(np.sqrt(2)*beta.real), float(np.sqrt(2)*beta.imag)
                ne = float(base_number+abs(beta)**2)
                epsilon = _forcing["envelope"](tau) if _forcing else eps*np.exp(-1j*nu*tau)
                energy = float(omega*(number+.5)+np.sqrt(2)*(epsilon.real*qm+epsilon.imag*pm))
                if _forcing:
                    derivative = _forcing["derivative"](tau)
                    power = float(np.sqrt(2)*(derivative.real*qm+derivative.imag*pm))
                else:
                    power = float(np.sqrt(2)*nu*(epsilon.imag*qm-epsilon.real*pm))
                if initial_energy is None:
                    initial_energy = energy
                else:
                    work += .5*(power+previous_power)*(t-previous_time)
                previous_power, previous_time = power, t
                values = [float(t), qm, pm, qvar, pvar, number, boundary, norm, qe, pe, ne, energy, power]
                values += [float(v) for c in psi for v in (c.real, c.imag)]
                block = np.asarray(values, dtype="<f8").tobytes()
                stream.write(block)
                digest.update(block)
                for key, value in {"maxNormDrift": abs(norm-1), "maxBoundaryOccupation": boundary,
                                   "maxQError": abs(qm-qe), "maxPError": abs(pm-pe), "maxNumberError": abs(number-ne),
                                   "maxWorkBalanceError": abs(energy-initial_energy-work)}.items():
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
                  "status": "completed", "operation": job["operation"], "model": job["model"],
                  "initialState": initial, "solver": s, "engine": {"name": job["engine"], "version": version},
                  "data": {"schema": "quantum-pulsed-oscillator-data/v1" if _forcing else "quantum-driven-oscillator-data/v1", "format": "f64le", "path": final.name,
                           "rows": rows, "columns": columns, "bytes": rows*len(columns)*8, "sha256": digest.hexdigest()},
                  "analysis": analysis, "provenance": {"pythonVersion": platform.python_version(), "workerVersion": __version__,
                      "computedAt": datetime.now(timezone.utc).isoformat(), "durationMs": (perf_counter()-started)*1000}}
        if _forcing:
            result["integration"] = _forcing["integration"]()
        validate("quantum-result", result)
        os.replace(temporary, final)
        return result
    except InterruptedError:
        if cancelled.is_set():
            return None
        raise
    finally:
        if temporary.exists():
            temporary.unlink()
