"""R2: preserved Atlas coefficients independently checked against real engine matrices.

Uses the R1 legacy binding fixture that TS tests compare exactly to atlasBinding.
This does not execute source runner paths or enable any new models.
"""
import json
import math
from pathlib import Path
import unittest

import numpy as np
from quantum_worker.models import build
from quantum_worker.engines.qutip_engine import engine
from quantum_worker.engines.cavity import _matrices, _qutip_hamiltonian
from quantum_worker.engines.many_body import _native_hamiltonian
from quantum_worker.engines.topology import solve

ROOT = Path(__file__).resolve().parents[3]
ATLAS = {e["id"]: e for e in json.loads((ROOT / "packages/atlas/atlas.v1.json").read_text(encoding="utf-8"))["entries"]}
BINDINGS = json.loads((ROOT / "packages/atlas/fixtures/legacy-48.v1.json").read_text(encoding="utf-8"))["bindings"]


def default(atlas_id, symbol):
    return next(p["default"] for p in ATLAS[atlas_id]["parameters"] if p["symbol"] == symbol)


class AtlasMappingTests(unittest.TestCase):
    def test_two_level_and_time_dependent_atlas_coefficients(self):
        qt = engine()
        for atlas_id in ("two_level_pauli", "semiclassical_rabi_drive", "landau_zener", "floquet_two_level"):
            binding = BINDINGS[atlas_id]
            model = {"type": binding["modelId"], "parameters": binding["parameters"]}
            h = qt.QobjEvo(build(qt, model))
            for t in (-0.7, 0, 1.3):
                with self.subTest(atlas_id=atlas_id, t=t):
                    if atlas_id == "two_level_pauli":
                        z, x = default(atlas_id, "d_z"), default(atlas_id, "d_x")
                    elif atlas_id == "landau_zener":
                        z, x = default(atlas_id, "v") * t / 2, default(atlas_id, "Delta") / 2
                    elif atlas_id == "floquet_two_level":
                        z, x = default(atlas_id, "Delta") / 2, default(atlas_id, "A") * math.cos(default(atlas_id, "omega") * t)
                    else:
                        z = default(atlas_id, "omega_0") / 2
                        x = default(atlas_id, "Omega") * math.cos(default(atlas_id, "omega_d") * t + default(atlas_id, "phi"))
                    np.testing.assert_allclose(h(t).full(), [[z, x], [x, -z]], atol=1e-13)

    def test_cavity_tensor_permutation_and_global_energy_shift(self):
        qt = engine()
        for atlas_id in ("jaynes_cummings", "rabi"):
            with self.subTest(atlas_id=atlas_id):
                binding = BINDINGS[atlas_id]
                p, kind = binding["parameters"], binding["modelId"]
                n = p["cutoff"]
                # Independent Atlas matrix in Fock x qubit, sigma_z=diag(-1,+1).
                a = np.diag(np.sqrt(np.arange(1, n)), 1)
                sp = np.array([[0, 0], [1, 0]])
                atlas = (default(atlas_id, "omega_c") * np.kron(np.diag(np.arange(n)), np.eye(2))
                         + default(atlas_id, "omega_q") / 2 * np.kron(np.eye(n), np.diag([-1, 1])))
                interaction = (np.kron(a, sp) + np.kron(a.T, sp.T)) if atlas_id == "jaynes_cummings" else np.kron(a + a.T, sp + sp.T)
                atlas = atlas + default(atlas_id, "g") * interaction
                perm = [2 * fock + qubit for qubit in range(2) for fock in range(n)]
                expected = atlas[np.ix_(perm, perm)] + default(atlas_id, "omega_q") / 2 * np.eye(2 * n)
                np.testing.assert_allclose(_matrices(np, p, kind), expected, atol=1e-13)
                np.testing.assert_allclose(_qutip_hamiltonian(qt, p, kind).full(), expected, atol=1e-13)

    def test_ising_pauli_signs_and_open_boundary(self):
        p = BINDINGS["ising_chain"]["parameters"]
        sites = p["sites"]
        x, z, eye = np.array([[0, 1], [1, 0]]), np.diag([1, -1]), np.eye(2)
        def tensor(ops):
            result = np.array([[1.]])
            for i in range(sites):
                result = np.kron(result, ops.get(i, eye))
            return result
        expected = sum((-default("ising_chain", "J") * tensor({i: z, i + 1: z}) for i in range(sites - 1)), np.zeros((2**sites, 2**sites)))
        expected -= default("ising_chain", "h") * sum((tensor({i: x}) for i in range(sites)), np.zeros_like(expected))
        np.testing.assert_allclose(_native_hamiltonian(np, p), expected, atol=1e-13)

    def test_topology_atlas_defaults_and_independent_band_energies(self):
        for atlas_id in ("ssh", "qwz"):
            p = BINDINGS[atlas_id]["parameters"]
            job = {"schema": "quantum-job/v1", "jobId": "atlas-map", "operation": "topology", "engine": "native", "model": {"type": atlas_id, "parameters": p}}
            a = solve(job)["analysis"]
            if atlas_id == "ssh":
                t1, t2 = default(atlas_id, "t_1"), default(atlas_id, "t_2")
                energies = [math.hypot(t1 + t2 * math.cos(k), t2 * math.sin(k)) for k in a["kValues"]]
                np.testing.assert_allclose(a["upperBand"], energies, atol=1e-13)
                self.assertAlmostEqual(a["bulkGap"], 2 * abs(abs(t1) - abs(t2)))
            else:
                mass, ks = default(atlas_id, "m"), a["bandKValues"]
                energies = [math.sqrt(math.sin(kx)**2 + math.sin(ky)**2 + (mass + math.cos(kx) + math.cos(ky))**2) for kx in ks for ky in ks]
                np.testing.assert_allclose(a["upperBand"], energies, atol=1e-13)
                self.assertTrue(a["meshResolved"])
                self.assertFalse(a["gapClosed"])


if __name__ == "__main__":
    unittest.main()
