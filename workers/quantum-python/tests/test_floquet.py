"""Floquet cross-engine and zero-drive reference checks."""
import copy
import math
import tempfile
import threading
import unittest

from quantum_worker.contracts import validate
from quantum_worker.engines.evolution import evolve


class FloquetTests(unittest.TestCase):
    def job(self, engine, amplitude):
        return {
            "schema": "quantum-job/v1", "jobId": f"floquet-{engine}-{amplitude}".replace(".", "-"),
            "operation": "evolve", "engine": engine,
            "model": {"type": "strong_drive", "parameters": {
                "delta": 0.8, "amplitude": amplitude, "frequency": 1.2, "phase": 0}},
            "initialState": {"type": "basis", "index": 0},
            "solver": {"type": "schrodinger", "tStart": 0, "tStop": 2, "samples": 21},
            "observables": ["p0", "p1"],
        }

    def test_zero_drive_quasienergies_and_modes(self):
        with tempfile.TemporaryDirectory() as directory:
            result = evolve(self.job("native", 0), directory, threading.Event(), lambda *_: None)
            validate("quantum-result", result)
            analysis = result["analysis"]
            self.assertAlmostEqual(analysis["period"], 2 * math.pi / 1.2)
            self.assertAlmostEqual(analysis["quasienergies"][0], -0.4, delta=1e-7)
            self.assertAlmostEqual(analysis["quasienergies"][1], 0.4, delta=1e-7)
            self.assertAlmostEqual(analysis["quasienergyGap"], 0.4, delta=1e-7)
            for mode in analysis["modes"]:
                norm = sum(z["re"] ** 2 + z["im"] ** 2 for z in mode)
                self.assertAlmostEqual(norm, 1, delta=1e-8)
            self.assertEqual(len(analysis["map"]["transitionProbabilities"]), 117)
            self.assertTrue(all(0 <= p <= 1 for p in analysis["map"]["transitionProbabilities"]))

    def test_qutip_native_quasienergy_and_map_agree(self):
        with tempfile.TemporaryDirectory() as directory:
            native = evolve(self.job("native", 0.5), directory, threading.Event(), lambda *_: None)
            qutip = evolve(self.job("qutip", 0.5), directory, threading.Event(), lambda *_: None)
        for a, b in zip(native["analysis"]["quasienergies"], qutip["analysis"]["quasienergies"]):
            self.assertAlmostEqual(a, b, delta=2e-5)
        differences = [abs(a-b) for a,b in zip(native["analysis"]["map"]["transitionProbabilities"],
                                             qutip["analysis"]["map"]["transitionProbabilities"])]
        self.assertLess(max(differences), 2e-4)


if __name__ == "__main__":
    unittest.main()
