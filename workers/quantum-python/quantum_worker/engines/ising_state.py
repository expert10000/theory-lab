"""Reproducible, bounded state summary for a verified saved Ising job.

This is a separate v1 artifact; it never modifies the frozen many_body result.
"""
from contextlib import redirect_stdout
import re
import sys

from quantum_worker.contracts import validate
from quantum_worker.engines.many_body import _native_hamiltonian, _quspin_hamiltonian, quspin_availability
from quantum_worker.engines.native_engine import libraries


def solve(request):
    if not isinstance(request, dict) or set(request) != {"job", "source"}:
        raise ValueError("Invalid Ising state request")
    job, source = request["job"], request["source"]
    validate("quantum-job", job)
    if job["operation"] != "many_body" or not isinstance(source, dict) or set(source) != {
            "runId", "jobSha256", "resultSha256"} or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", source["runId"]) or any(
            not isinstance(source[key], str) or not re.fullmatch(r"[a-f0-9]{64}", source[key])
            for key in ("jobSha256", "resultSha256")):
        raise ValueError("Invalid run-bound Ising state request")
    np, _, _ = libraries()
    parameters = job["model"]["parameters"]
    sites = parameters["sites"]
    if job["engine"] == "quspin":
        if not quspin_availability()["available"]:
            raise ValueError("QuSpin is unavailable")
        with redirect_stdout(sys.stderr):
            from quspin.basis import spin_basis_1d
            matrix = _quspin_hamiltonian(np, parameters)
            energies, vectors = matrix.eigh() if not isinstance(matrix, np.ndarray) else np.linalg.eigh(matrix)
            basis_states = spin_basis_1d(sites, pauli=1).states
        # QuSpin's bit=1 is Pauli-z up; the public basis uses 0 for up.
        ground = np.zeros(2**sites, dtype=np.complex128)
        for row, bits in enumerate(basis_states):
            ground[((1 << sites)-1) ^ int(bits)] = vectors[row, 0]
        hamiltonian = _native_hamiltonian(np, parameters)
    elif job["engine"] == "native":
        hamiltonian = _native_hamiltonian(np, parameters)
        energies, vectors = np.linalg.eigh(hamiltonian)
        ground = vectors[:, 0]
    else:
        raise ValueError("Unsupported Ising state engine")
    energy = float(energies[0])
    gap = float(max(0, energies[1]-energies[0]))
    threshold = float(1e-8*max(1, abs(energy)))
    norm = float(np.vdot(ground, ground).real)
    residual = float(np.linalg.norm(hamiltonian@ground-energy*ground))
    if not np.isfinite([energy, gap, norm, residual]).all() or abs(norm-1)>1e-7 or residual>1e-6:
        raise ValueError("Ising ground state failed independent basis verification")
    base = {"schema":"quantum-ising-state/v1", "source":source, "engine":job["engine"],
            "sites":sites, "basis":"z-up-is-0-msb-first", "groundEnergy":energy,
            "gap":gap, "degeneracyThreshold":threshold, "norm":norm, "residual":residual}
    if gap <= threshold:
        result = {**base,"status":"degenerate","siteMagnetization":None,
                  "connectedZCorrelation":None,"cutEntropy":None,"dominantBasis":[],"omittedProbability":None}
        validate("quantum-ising-state", result)
        return result
    probability = abs(ground)**2
    states = np.arange(2**sites,dtype=np.int64)
    signs = np.array([1-2*((states >> (sites-1-i)) & 1) for i in range(sites)], dtype=np.float64)
    means = [float(signs[i]@probability) for i in range(sites)]
    connected = [[float((signs[i]*signs[j])@probability-means[i]*means[j])
                  for j in range(sites)] for i in range(sites)]
    cuts = []
    for left in range(1,sites):
        singular = np.linalg.svd(ground.reshape(2**left,-1),compute_uv=False)
        weights = singular**2
        positive = weights[weights>1e-15]
        cuts.append(float(max(0,-np.sum(positive*np.log(positive)))))
    indices = sorted(range(2**sites),key=lambda index:(-probability[index],index))[:16]
    dominant = [{"bits":format(index,f"0{sites}b"),"probability":float(probability[index])} for index in indices]
    omitted = float(max(0,1-sum(item["probability"] for item in dominant)))
    result = {**base,"status":"resolved","siteMagnetization":means,
              "connectedZCorrelation":connected,"cutEntropy":cuts,
              "dominantBasis":dominant,"omittedProbability":omitted}
    validate("quantum-ising-state",result)
    return result
