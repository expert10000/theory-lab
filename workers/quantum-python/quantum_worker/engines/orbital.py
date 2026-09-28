"""Analytic hydrogen-like orbitals. Infinite nuclear mass, atomic units, no spin."""
import hashlib
import math
import os
import platform
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter
from uuid import uuid4
from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.native_engine import libraries


def radial(n, l, Z, r):
    np, _, _ = libraries()
    from scipy.special import eval_genlaguerre
    rho = 2 * Z * np.asarray(r) / n
    normalization = (2 * Z / n)**1.5 * math.sqrt(math.factorial(n-l-1)/(2*n*math.factorial(n+l)))
    return normalization * np.exp(-rho/2) * rho**l * eval_genlaguerre(n-l-1, 2*l+1, rho)


def wavefunction(p, x, y, z):
    np, _, _ = libraries()
    from scipy.special import sph_harm_y
    r = np.sqrt(x*x+y*y+z*z)
    theta = np.arccos(np.clip(np.divide(z,r,out=np.ones_like(r),where=r>0),-1,1))
    phi = np.mod(np.arctan2(y,x),2*np.pi)
    angular = sph_harm_y(p["l"],p["m"],theta,phi)
    if p["basis"] != "complex":
        angular = angular.real if p["m"] == 0 else math.sqrt(2)*(-1)**p["m"]*(angular.real if p["basis"] == "real_cos" else angular.imag)
    return radial(p["n"],p["l"],p["Z"],r)*angular


def available():
    try:
        from scipy.special import sph_harm_y, eval_genlaguerre
        return True
    except ImportError:
        return False


def radial_nodes(n, l, Z):
    from scipy.special import roots_genlaguerre
    degree = n-l-1
    return (roots_genlaguerre(degree, 2*l+1)[0]*n/(2*Z)).tolist() if degree else []


def orbital(job, output_dir, cancelled, progress):
    validate("quantum-job",job)
    if job["operation"] != "orbital" or job["engine"] != "native":
        raise ValueError("Expected native orbital job")
    np, scipy, _ = libraries()
    from scipy.integrate import quad
    started = perf_counter()
    p = job["model"]["parameters"]
    n,l,Z,grid,radius = p["n"],p["l"],p["Z"],p["grid"],p["radius"]
    axis = np.linspace(-radius,radius,grid)
    spacing = 2*radius/(grid-1)
    weights = np.ones(grid); weights[[0,-1]] = .5
    y,z = np.meshgrid(axis,axis,indexing="ij")
    yz_weights = weights[:,None]*weights[None,:]
    directory = Path(output_dir); directory.mkdir(parents=True,exist_ok=True)
    filename = job["jobId"]+".f64"
    final = directory/filename
    temporary = directory/(job["jobId"]+"."+uuid4().hex+".part")
    digest = hashlib.sha256(); probability = 0.0
    progress(0,grid)
    try:
        with temporary.open("xb") as stream:
            for i,x in enumerate(axis):
                if cancelled.is_set():
                    return None
                psi = wavefunction(p,x,y,z)
                probability += float(weights[i]*np.sum(np.abs(psi)**2*yz_weights)*spacing**3)
                block = np.stack((psi.real,psi.imag),axis=-1).astype("<f8").tobytes(order="C")
                stream.write(block); digest.update(block)
                progress(i+1,grid)
            stream.flush(); os.fsync(stream.fileno())
        if cancelled.is_set():
            return None
        norm,_ = quad(lambda r: float(r*r*radial(n,l,Z,r)**2),0,np.inf,epsabs=1e-10)
        mean,_ = quad(lambda r: float(r**3*radial(n,l,Z,r)**2),0,np.inf,epsabs=1e-10)
        expected_mean = (3*n*n-l*(l+1))/(2*Z)
        if abs(norm-1)>1e-8 or abs(mean-expected_mean)>1e-8:
            raise ValueError("Orbital radial validation failed")
        radii = np.linspace(0,max(radius,12*n*n/Z),401)
        nodes = radial_nodes(n,l,Z)
        if len(nodes) != n-l-1 or any(abs(float(radial(n,l,Z,r))) > 1e-10 for r in nodes):
            raise ValueError("Orbital radial node validation failed")
        # The cube contains the sphere R and is contained in the sphere sqrt(3)R.
        bounds = [min(1.0,max(0.0,quad(lambda r: float(r*r*radial(n,l,Z,r)**2),0,q,epsabs=1e-10)[0]))
                  for q in (radius,math.sqrt(3)*radius)]
        result = {"schema":"quantum-result/v1","jobId":job["jobId"],"runId":"run-"+uuid4().hex,"status":"completed",
                  "operation":"orbital","model":job["model"],"engine":{"name":"native","version":scipy.__version__},
                  "data":{"schema":"quantum-data/v1","format":"f64le","path":filename,"rows":grid**3,
                          "columns":["psi_re","psi_im"],"bytes":grid**3*16,"sha256":digest.hexdigest()},
                  "analysis":{"energyHartree":-Z*Z/(2*n*n),"gridProbability":probability,"radialNormalization":norm,"meanRadius":mean,
                              "radialRadii":radii.tolist(),"radialProbability":(radii*radii*radial(n,l,Z,radii)**2).tolist(),
                              "radialNodes":nodes,"cubeProbabilityBounds":bounds},
                  "provenance":{"pythonVersion":platform.python_version(),"workerVersion":__version__,
                                "computedAt":datetime.now(timezone.utc).isoformat(),"durationMs":(perf_counter()-started)*1000}}
        validate("quantum-result",result)
        if cancelled.is_set():
            return None
        os.replace(temporary,final)
        return result
    finally:
        if temporary.exists():
            temporary.unlink()
