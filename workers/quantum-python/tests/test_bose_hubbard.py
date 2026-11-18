"""Dimer checks use a full two-site Fock construction independent of the engine matrix."""
import copy
import json
import unittest

import numpy as np

from quantum_worker.contracts import validate
from quantum_worker.engines.bose_hubbard import hamiltonian, solve
from quantum_worker.main import capabilities, handle


def job(particles=2, interaction=0):
    return {"schema": "quantum-bose-hubbard-job/v1", "jobId": "bh-dimer-test",
            "engine": "native",
            "model": {"type": "bose_hubbard_dimer", "parameters": {
                "particles": particles, "interactionRatio": interaction,
                "hopping": 1, "boundary": "open"}}}


def independent_fock_matrix(particles, interaction):
    """Build operators on the full tensor Fock space, then select total N."""
    one_site = np.zeros((particles + 1, particles + 1))
    for n in range(1, particles + 1):
        one_site[n - 1, n] = np.sqrt(n)
    identity = np.eye(particles + 1)
    a_left = np.kron(one_site, identity)
    a_right = np.kron(identity, one_site)
    n_left = a_left.T @ a_left
    n_right = a_right.T @ a_right
    full = -(a_left.T @ a_right + a_right.T @ a_left) + interaction / 2 * (
        n_left @ (n_left - np.eye(len(n_left))) +
        n_right @ (n_right - np.eye(len(n_right))))
    selected = [n * (particles + 1) + particles - n for n in range(particles + 1)]
    return full[np.ix_(selected, selected)], a_left.T @ a_right, selected


class BoseHubbardTests(unittest.TestCase):
    def test_hand_matrix_and_noninteracting_limit(self):
        expected = np.array([[0, -np.sqrt(2), 0],
                             [-np.sqrt(2), 0, -np.sqrt(2)],
                             [0, -np.sqrt(2), 0]])
        np.testing.assert_allclose(hamiltonian(np, 2, 0), expected)
        for particles in (2, 3, 8):
            result = solve(job(particles))
            validate("quantum-bose-hubbard-result", result)
            np.testing.assert_allclose(result["spectrum"]["energies"],
                                       np.arange(-particles, particles + 1, 2), atol=1e-12)
            self.assertAlmostEqual(result["spectrum"]["gap"], 2, places=11)
            ground = result["states"][0]
            np.testing.assert_allclose(ground["occupation"], [particles / 2] * 2, atol=1e-12)
            self.assertAlmostEqual(ground["oneBodyCoherence"], particles / 2, places=11)

    def test_independent_fock_basis_and_observables(self):
        for particles, interaction in ((2, 3.25), (3, 1.75), (6, 20)):
            result = solve(job(particles, interaction))
            reference, coherence_operator, selected = independent_fock_matrix(particles, interaction)
            np.testing.assert_allclose(hamiltonian(np, particles, interaction), reference, atol=1e-12)
            energies, vectors = np.linalg.eigh(reference)
            np.testing.assert_allclose(result["spectrum"]["energies"], energies, atol=1e-11)
            for i, state in enumerate(result["states"]):
                amplitudes = np.asarray(state["amplitudes"])
                # Nearly degenerate excited pairs at large U may rotate within
                # their subspace; compare vectors only for isolated eigenvalues.
                nearest = min((abs(energies[i] - energies[j]) for j in range(len(energies)) if j != i))
                if nearest > 1e-4:
                    np.testing.assert_allclose(abs(amplitudes), abs(vectors[:, i]), atol=1e-10)
                self.assertLess(state["residual"], 1e-10)
                self.assertLess(state["normalizationError"], 1e-10)
                self.assertAlmostEqual(sum(state["occupation"]), particles, places=11)
                full_state = np.zeros((particles + 1) ** 2)
                full_state[selected] = amplitudes
                self.assertAlmostEqual(state["oneBodyCoherence"],
                                       float(full_state @ coherence_operator @ full_state), places=11)

    def test_contract_bounds_and_rpc(self):
        for changes in ({"particles": 1}, {"particles": 9}, {"interactionRatio": -0.01},
                        {"interactionRatio": 21}, {"hopping": 2}, {"boundary": "periodic"}):
            invalid = copy.deepcopy(job())
            invalid["model"]["parameters"].update(changes)
            with self.assertRaises(Exception):
                solve(invalid)
        self.assertNotIn("bose_hubbard", capabilities()["operations"])
        response, _ = handle(json.dumps({"jsonrpc": "2.0", "id": "bh", "method": "quantum.boseHubbard",
                                         "params": job(3, 2)}))
        self.assertEqual(response["result"]["schema"], "quantum-bose-hubbard-result/v1")


if __name__ == "__main__":
    unittest.main()
