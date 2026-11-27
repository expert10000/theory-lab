"""Open-x finite strip at one PHS-invariant ky, sourced from a qualified bulk toy."""
from datetime import datetime, timezone
import math
import platform
from time import perf_counter
from uuid import uuid4

from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.native_engine import libraries
from quantum_worker.engines.ute2_topology import exact_minimum_energy


def strip_matrix(np, mu, delta, width, ky):
    sy = 0 if abs(math.sin(ky)) < 1e-12 else math.sin(ky)
    z = -2*math.cos(ky)-mu
    onsite = np.array([[z, 1j*delta*sy],[-1j*delta*sy,-z]],complex)
    hopping = np.array([[-1,-.5j*delta],[-.5j*delta,1]],complex)
    matrix = np.zeros((2*width,2*width),complex)
    for cell in range(width):
        row = slice(2*cell,2*cell+2)
        matrix[row,row] = onsite
        if cell+1 < width:
            next_row = slice(2*cell+2,2*cell+4)
            matrix[row,next_row] = hopping
            matrix[next_row,row] = hopping.conj().T
    return matrix


def width_result(np, mu, delta, width, ky):
    matrix = strip_matrix(np,mu,delta,width,ky)
    energies,vectors = np.linalg.eigh(matrix)
    center = (width-1,width)
    selected = vectors[:,center]
    density = np.mean(np.sum(abs(selected.reshape(width,2,2))**2,axis=1),axis=1)
    boundary_weight = float(sum(density[:2])+sum(density[-2:]))
    residual = float(max(np.linalg.norm(matrix@selected[:,j]-energies[center[j]]*selected[:,j]) for j in range(2)))
    norm_error = float(max(abs(np.linalg.norm(selected[:,j])-1) for j in range(2)))
    transformed = selected[:,0].conj().reshape(width,2)[:,::-1].ravel()
    ph_overlap = float(abs(np.vdot(selected[:,1],transformed)))
    return {"width":width,"energies":energies.tolist(),
            "pairStates":[{"re":selected[:,j].real.tolist(),"im":selected[:,j].imag.tolist()} for j in range(2)],
            "pairDensity":density.tolist(),"boundaryWeight":boundary_weight,
            "maxResidual":residual,"maxNormError":norm_error,"particleHoleOverlap":ph_overlap}


def solve(job):
    validate("quantum-ute2-edge-job",job)
    started = perf_counter()
    np,_,_ = libraries()
    p=job["model"]["parameters"]
    mu,delta=p["mu"],p["delta"]
    minimum=exact_minimum_energy(mu,delta)
    if minimum <= 1e-10:
        raise ValueError("Finite strip requires an open exact bulk gap")
    ky=0. if mu<0 else -math.pi
    coarse=width_result(np,mu,delta,job["width"],ky)
    fine=width_result(np,mu,delta,2*job["width"],ky)
    def candidate(row):
        energy=abs(row["energies"][row["width"]])
        return (energy < minimum and row["boundaryWeight"] > .5 and
                row["maxResidual"] < 1e-8 and row["particleHoleOverlap"] > .99)
    localized=(job["bulkChern"] != 0 and candidate(coarse) and candidate(fine) and
               abs(fine["energies"][fine["width"]]) < abs(coarse["energies"][coarse["width"]]))
    result={"schema":"quantum-ute2-edge-result/v1","jobId":job["jobId"],
            "runId":"run-"+uuid4().hex,"status":"completed","source":job["source"],
            "model":job["model"],"bulkChern":job["bulkChern"],
            "boundary":"open x; periodic y; t=a=1","ky":ky,
            "bulkMinimumEnergy":minimum,"widths":[coarse,fine],
            "edgeStatus":"localized_in_gap" if localized else "not_resolved",
            "units":{"momentum":"rad/a","energy":"t=1","density":"probability per x cell"},
            "provenance":{"pythonVersion":platform.python_version(),"workerVersion":__version__,
                          "computedAt":datetime.now(timezone.utc).isoformat(),
                          "durationMs":(perf_counter()-started)*1000}}
    validate("quantum-ute2-edge-result",result)
    return result
