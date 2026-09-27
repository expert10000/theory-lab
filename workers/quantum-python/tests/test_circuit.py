import unittest

from quantum_worker.engines.circuit import solve, scqubits_availability
from quantum_worker.main import handle


def job(engine="native", **parameters):
    return {"schema": "quantum-job/v1", "jobId": "transmon-test", "operation": "circuit",
            "engine": engine, "model": {"type": "transmon", "parameters": {
                "EJ": 20.0, "EC": 0.25, "ng": 0.2, "ncut": 12, "levels": 5, **parameters}}}


class CircuitTests(unittest.TestCase):
    def test_native_spectrum_and_rpc(self):
        result = solve(job())
        spectrum = result["spectrum"]
        self.assertEqual(len(spectrum["energies"]), 5)
        self.assertGreater(spectrum["e01"], 0)
        self.assertLess(spectrum["anharmonicity"], 0)
        self.assertAlmostEqual(spectrum["e12"] - spectrum["e01"], spectrum["anharmonicity"])
        self.assertLess(spectrum["cutoffDriftE01"], 1e-4)
        response, _ = handle(__import__("json").dumps({"jsonrpc": "2.0", "id": "1",
                                                    "method": "quantum.run", "params": job()}).encode())
        self.assertEqual(response["result"]["operation"], "circuit")

    def test_charge_parabola_and_invalid_cutoff(self):
        no_junction = solve(job(EJ=0.0, ng=0.0))
        self.assertAlmostEqual(no_junction["spectrum"]["e01"], 1.0)
        self.assertAlmostEqual(no_junction["spectrum"]["chargeMatrixElement01"], 0.0)
        with self.assertRaises(Exception):
            solve(job(ncut=2))

    @unittest.skipUnless(scqubits_availability()["available"], "optional scqubits unavailable")
    def test_scqubits_matches_independent_charge_basis(self):
        for ng in (0.0, 0.2, 0.5):
            native = solve(job("native", ng=ng))["spectrum"]
            package = solve(job("scqubits", ng=ng))["spectrum"]
            for left, right in zip(native["energies"], package["energies"]):
                self.assertAlmostEqual(left, right, places=8)
            self.assertAlmostEqual(native["chargeMatrixElement01"], package["chargeMatrixElement01"], places=8)


if __name__ == "__main__":
    unittest.main()
