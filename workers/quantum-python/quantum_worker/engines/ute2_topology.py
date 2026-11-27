"""Conditional class-D Chern number for the chapter's square-lattice spinless toy."""
from datetime import datetime, timezone
import math
import platform
from time import perf_counter
from uuid import uuid4

from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.native_engine import libraries


def exact_minimum_energy(mu, delta):
    """Minimize E² over cos(kx),cos(ky) in [-1,1].

    E²=Δ²(2-u²-v²)+[2(u+v)+μ]². The difference direction is concave
    for Δ>0, so a minimum lies on one of the four square edges. For Δ=0
    an edge minimum still exists. Each edge is a bounded quadratic in v.
    """
    values = []
    for fixed in (-1., 1.):
        remaining = [-1., 1.]
        if delta < 2:
            stationary = -2*(2*fixed+mu)/(4-delta*delta)
            remaining.append(max(-1., min(1., stationary)))
        for other in remaining:
            values.append(delta*delta*(1-other*other)+(2*(fixed+other)+mu)**2)
    return math.sqrt(max(0., min(values)))


def vectors(np, mu, delta, size):
    k = -np.pi + 2*np.pi*np.arange(size)/size
    kx, ky = np.meshgrid(k, k, indexing="ij")
    dx, dy = delta*np.sin(kx), -delta*np.sin(ky)
    dz = -2*(np.cos(kx)+np.cos(ky))-mu
    matrix = np.empty((size,size,2,2),complex)
    matrix[...,0,0], matrix[...,1,1] = dz, -dz
    matrix[...,0,1], matrix[...,1,0] = dx-1j*dy, dx+1j*dy
    _, eigenvectors = np.linalg.eigh(matrix)
    energy = np.sqrt(dx*dx+dy*dy+dz*dz)
    return eigenvectors[..., :, 0], float(np.min(energy))


def link_chern(np, occupied):
    ux = np.sum(np.conj(occupied)*np.roll(occupied,-1,axis=0),axis=-1)
    uy = np.sum(np.conj(occupied)*np.roll(occupied,-1,axis=1),axis=-1)
    minimum = float(min(np.min(abs(ux)),np.min(abs(uy))))
    if minimum <= 1e-10:
        return None, minimum
    ux, uy = ux/abs(ux), uy/abs(uy)
    plaquette = ux*np.roll(uy,-1,axis=0)*np.conj(np.roll(ux,-1,axis=1))*np.conj(uy)
    raw = float(np.sum(np.angle(plaquette))/(2*np.pi))
    rounded = round(raw)
    return (int(rounded) if abs(raw-rounded) <= 1e-6 else None), minimum


def curvature_integral(np, mu, delta, size):
    # Independent midpoint quadrature of occupied-band d·(∂x d × ∂y d).
    k = -np.pi + 2*np.pi*(np.arange(size)+.5)/size
    kx, ky = np.meshgrid(k,k,indexing="ij")
    sx, sy, cx, cy = np.sin(kx), np.sin(ky), np.cos(kx), np.cos(ky)
    z = -2*(cx+cy)-mu
    norm = np.sqrt(delta*delta*(sx*sx+sy*sy)+z*z)
    triple = delta*delta*(2*sx*sx*cy+2*sy*sy*cx-z*cx*cy)
    curvature = -.5*triple/norm**3
    return float(np.sum(curvature)*(2*np.pi/size)**2/(2*np.pi))


def solve(job):
    validate("quantum-ute2-topology-job",job)
    started = perf_counter()
    np, _, _ = libraries()
    p = job["model"]["parameters"]
    mu, delta, mesh = p["mu"],p["delta"],p["mesh"]
    minimum = exact_minimum_energy(mu,delta)
    closed = minimum <= 1e-10
    coarse, sampled_coarse = vectors(np,mu,delta,mesh)
    fine, sampled_fine = vectors(np,mu,delta,2*mesh)
    expected = None if closed else (-1 if delta>0 and -4<mu<0 else 1 if delta>0 and 0<mu<4 else 0)
    if closed:
        coarse_chern=fine_chern=coarse_link=fine_link=integral_coarse=integral_fine=None
        status="gap_closed"
    else:
        coarse_chern,coarse_link=link_chern(np,coarse)
        fine_chern,fine_link=link_chern(np,fine)
        integral_coarse=curvature_integral(np,mu,delta,4*mesh)
        integral_fine=curvature_integral(np,mu,delta,8*mesh)
        resolved = (coarse_chern is not None and coarse_chern==fine_chern==expected and
                    coarse_link>.1 and fine_link>.1 and
                    abs(integral_fine-expected)<.03 and abs(integral_fine-integral_coarse)<.03)
        status="defined" if resolved else "mesh_unresolved"
    result = {"schema":"quantum-ute2-topology-result/v1","jobId":job["jobId"],
              "runId":"run-"+uuid4().hex,"status":"completed","model":job["model"],
              "basis":"spinless two-component Nambu lattice toy",
              "orientation":"occupied band; kx then ky; x-major half-open torus",
              "bulkMinimumEnergy":minimum,"bulkGap":2*minimum,
              "sampledMinimumEnergy":sampled_fine,"gapClosed":closed,
              "coarseMesh":mesh,"fineMesh":2*mesh,
              "coarseLinkChern":coarse_chern,"fineLinkChern":fine_chern,
              "coarseMinimumLink":coarse_link,"fineMinimumLink":fine_link,
              "curvatureIntegralCoarse":integral_coarse,"curvatureIntegralFine":integral_fine,
              "analyticExpectedChern":expected,"chern":fine_chern if status=="defined" else None,
              "invariantStatus":status,
              "units":{"momentum":"rad/a","energy":"t=1"},
              "provenance":{"pythonVersion":platform.python_version(),"workerVersion":__version__,
                            "computedAt":datetime.now(timezone.utc).isoformat(),
                            "durationMs":(perf_counter()-started)*1000}}
    validate("quantum-ute2-topology-result",result)
    return result
