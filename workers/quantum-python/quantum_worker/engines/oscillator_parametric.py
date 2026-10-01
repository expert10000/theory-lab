"""Stable single-mode quadratic squeezing, restricted to vacuum input."""
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

READOUTS = ["time", "q_mean", "p_mean", "q_variance", "p_variance", "mean_number", "boundary_probability", "norm", "parity"]


def reference(np, omega, coupling, tau):
    frequency = np.sqrt(omega**2-abs(coupling)**2)
    sine, cosine = np.sin(frequency*tau), np.cos(frequency*tau)
    u = cosine-1j*(omega/frequency)*sine
    v = -1j*(coupling/frequency)*sine
    return abs(v)**2, abs(u+v.conjugate())**2/2, abs(u-v.conjugate())**2/2


def oscillator_parametric(job, output_dir, cancelled, progress):
    validate("quantum-job", job)
    if job["operation"] != "oscillator_parametric":
        raise ValueError("Expected parametric oscillator job")
    started = perf_counter()
    np, scipy, _ = libraries()
    p, settings = job["model"]["parameters"], job["solver"]
    n, omega = p["cutoff"], p["omega"]
    coupling = complex(p["lambdaRe"], p["lambdaIm"])
    a = np.diag(np.sqrt(np.arange(1, n)), 1).astype(complex)
    adag = a.conj().T
    h = omega*(adag@a+.5*np.eye(n))+.5*(coupling*adag@adag+coupling.conjugate()*a@a)
    q, momentum = (a+adag)/np.sqrt(2), -1j*(a-adag)/np.sqrt(2)
    psi0 = np.zeros(n, dtype=complex); psi0[0] = 1
    if job["engine"] == "qutip":
        qt = engine()
        solver = qt.SESolver(qt.Qobj(h), options={"normalize_output": False, "rtol":1e-10, "atol":1e-12, "nsteps":100000})
        solver.start(qt.Qobj(psi0), settings["tStart"])
        state_at = lambda t: solver.step(t).full().ravel()
        version = qt.__version__
    else:
        energies, vectors = scipy.linalg.eigh(h)
        overlaps = vectors.conj().T@psi0
        state_at = lambda t: vectors@(np.exp(-1j*energies*(t-settings["tStart"]))*overlaps)
        version = scipy.__version__
    times = np.linspace(settings["tStart"], settings["tStop"], settings["samples"])
    destination = Path(output_dir).resolve(); destination.mkdir(parents=True, exist_ok=True)
    final = destination/(job["jobId"]+".f64")
    if final.exists(): raise ValueError("Artifact for job ID already exists")
    temporary = destination/(job["jobId"]+"."+uuid4().hex+".part")
    columns = READOUTS+[piece for k in range(n) for piece in (f"c{k}_re",f"c{k}_im")]
    digest = hashlib.sha256()
    analysis = {"maxNormDrift":0., "maxBoundaryOccupation":0., "maxParityDrift":0.,
                "maxNumberReferenceError":0., "maxQVarianceReferenceError":0., "maxPVarianceReferenceError":0.,
                "bogoliubovFrequency":float(np.sqrt(omega**2-abs(coupling)**2)), "energyOffset":omega/2}
    try:
        with temporary.open("xb") as stream:
            progress(0,len(times))
            for row,t in enumerate(times):
                if cancelled.is_set():return None
                psi=state_at(float(t));norm=float(np.vdot(psi,psi).real)
                qpsi,ppsi=q@psi,momentum@psi
                qm,pm=float(np.vdot(psi,qpsi).real/norm),float(np.vdot(psi,ppsi).real/norm)
                qvar,pvar=float(np.vdot(qpsi,qpsi).real/norm-qm**2),float(np.vdot(ppsi,ppsi).real/norm-pm**2)
                occupation=float(np.arange(n)@abs(psi)**2/norm)
                boundary=float(abs(psi[-1])**2/norm)
                parity=float(((-1.)**np.arange(n))@abs(psi)**2/norm)
                expected_n,expected_q,expected_p=reference(np,omega,coupling,float(t-times[0]))
                values=[float(t),qm,pm,qvar,pvar,occupation,boundary,norm,parity]
                values += [float(component) for z in psi for component in (z.real,z.imag)]
                if not np.isfinite(values).all() or abs(norm-1)>2e-6:
                    raise ValueError("Invalid parametric oscillator state")
                block=np.asarray(values,dtype="<f8").tobytes()
                stream.write(block);digest.update(block)
                for key,value in {"maxNormDrift":abs(norm-1),"maxBoundaryOccupation":boundary,
                                  "maxParityDrift":abs(parity-1),"maxNumberReferenceError":abs(occupation-expected_n),
                                  "maxQVarianceReferenceError":abs(qvar-expected_q),
                                  "maxPVarianceReferenceError":abs(pvar-expected_p)}.items():
                    analysis[key]=max(analysis[key],float(value))
                if (row+1)%max(1,len(times)//100)==0 or row+1==len(times):progress(row+1,len(times))
            if cancelled.is_set():return None
            stream.flush();os.fsync(stream.fileno())
        if cancelled.is_set():return None
        result={"schema":"quantum-result/v1","jobId":job["jobId"],"runId":"run-"+uuid4().hex,
                "status":"completed","operation":"oscillator_parametric","model":job["model"],
                "initialState":job["initialState"],"solver":settings,"engine":{"name":job["engine"],"version":version},
                "data":{"schema":"quantum-parametric-oscillator-data/v1","format":"f64le","path":final.name,
                        "rows":len(times),"columns":columns,"bytes":len(times)*len(columns)*8,"sha256":digest.hexdigest()},
                "analysis":analysis,"provenance":{"pythonVersion":platform.python_version(),"workerVersion":__version__,
                "computedAt":datetime.now(timezone.utc).isoformat(),"durationMs":(perf_counter()-started)*1000}}
        validate("quantum-result",result)
        os.replace(temporary,final)
        return result
    finally:
        if temporary.exists():temporary.unlink()
