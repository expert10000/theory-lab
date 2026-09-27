"""Finite transverse-field Ising chain: optional QuSpin and dense native reference."""
from contextlib import redirect_stdout
from datetime import datetime, timezone
from importlib import metadata, util
import platform
import sys
from time import perf_counter
from uuid import uuid4

from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.native_engine import libraries


def quspin_availability():
    if util.find_spec("quspin") is None:
        return {"available": False, "version": None}
    try:
        with redirect_stdout(sys.stderr):
            from quspin.basis import spin_basis_1d  # noqa: F401
            from quspin.operators import hamiltonian  # noqa: F401
        return {"available": True, "version": metadata.version("quspin")}
    except Exception as error:
        print(f"QuSpin unavailable: {error}", file=sys.stderr)
        return {"available": False, "version": None}


def _bonds(sites, boundary):
    pairs = [(i, i + 1) for i in range(sites - 1)]
    if boundary == "periodic" and sites > 2:
        pairs.append((sites - 1, 0))
    return pairs


def _native_hamiltonian(np, parameters):
    sites = parameters["sites"]
    identity = np.eye(2)
    x = np.array([[0, 1], [1, 0]])
    z = np.diag([1, -1])
    def term(operators):
        matrix = np.array([[1.0]])
        for site in range(sites):
            matrix = np.kron(matrix, operators.get(site, identity))
        return matrix
    matrix = np.zeros((2 ** sites, 2 ** sites), dtype=np.float64)
    for i, j in _bonds(sites, parameters["boundary"]):
        matrix -= parameters["interaction"] * term({i: z, j: z})
    for i in range(sites):
        matrix -= parameters["transverse"] * term({i: x})
        matrix -= parameters["longitudinal"] * term({i: z})
    return matrix


def _quspin_hamiltonian(np, parameters):
    with redirect_stdout(sys.stderr):
        from quspin.basis import spin_basis_1d
        from quspin.operators import hamiltonian
        sites = parameters["sites"]
        basis = spin_basis_1d(sites, pauli=1)
        terms = [
            ["zz", [[-parameters["interaction"], i, j]
                    for i, j in _bonds(sites, parameters["boundary"])]],
            ["x", [[-parameters["transverse"], i] for i in range(sites)]],
            ["z", [[-parameters["longitudinal"], i] for i in range(sites)]],
        ]
        static = [[operator, values] for operator, values in terms if values and any(value[0] != 0 for value in values)]
        if not static:
            return np.zeros((2 ** sites, 2 ** sites), dtype=np.float64)
        return hamiltonian(static, [], basis=basis, dtype=np.float64,
                           check_herm=False, check_symm=False, check_pcon=False)


def solve(job):
    validate("quantum-job", job)
    if job["operation"] != "many_body":
        raise ValueError("Expected many-body job")
    started = perf_counter()
    np, scipy, _ = libraries()
    parameters = job["model"]["parameters"]
    if job["engine"] == "quspin":
        info = quspin_availability()
        if not info["available"]:
            raise ValueError("QuSpin is unavailable; install the optional QuSpin stack")
        hamiltonian = _quspin_hamiltonian(np, parameters)
        energies, eigenvectors = (np.linalg.eigh(hamiltonian) if isinstance(hamiltonian, np.ndarray)
                                   else hamiltonian.eigh())
        version = info["version"]
    elif job["engine"] == "native":
        energies, eigenvectors = np.linalg.eigh(_native_hamiltonian(np, parameters))
        version = scipy.__version__
    else:
        raise ValueError("Unsupported many-body engine")
    ground = eigenvectors[:, 0].reshape([2] * parameters["sites"])
    probability = abs(ground) ** 2
    magnetization = []
    for site in range(parameters["sites"]):
        marginal = np.moveaxis(probability, site, 0).reshape(2, -1).sum(axis=1)
        magnetization.append(float(marginal[0] - marginal[1]))
    left = parameters["sites"] // 2
    singular = np.linalg.svd(ground.reshape(2 ** left, -1), compute_uv=False)
    weights = singular ** 2
    positive = weights[weights > 1e-15]
    entropy = float(max(0, -np.sum(positive * np.log(positive))))
    low = [float(value) for value in energies[:min(8, len(energies))]]
    result = {
        "schema": "quantum-result/v1", "jobId": job["jobId"], "runId": "run-" + uuid4().hex,
        "status": "completed", "operation": "many_body", "model": job["model"],
        "engine": {"name": job["engine"], "version": version},
        "spectrum": {"lowEnergies": low, "gap": float(max(0, energies[1] - energies[0])),
                     "units": "normalized", "hbar": 1},
        "groundState": {"siteMagnetization": magnetization, "halfChainEntropy": entropy},
        "provenance": {"pythonVersion": platform.python_version(), "workerVersion": __version__,
                       "computedAt": datetime.now(timezone.utc).isoformat(),
                       "durationMs": (perf_counter() - started) * 1000},
    }
    validate("quantum-result", result)
    return result
