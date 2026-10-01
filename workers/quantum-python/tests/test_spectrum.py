import copy
import json
import math
import unittest
from jsonschema import ValidationError
from quantum_worker.contracts import SCHEMA_DIR, validate
from quantum_worker.engines.qutip_engine import diagonalize
from quantum_worker.main import handle

class SpectrumTests(unittest.TestCase):
    def setUp(self):
        self.job = json.loads((SCHEMA_DIR.parent / "fixtures" / "two-level.job.json").read_text())

    def test_analytic_reference_and_degeneracy(self):
        for delta, omega in [(1, 0.8), (0, 0), (-3, 4), (1, 0), (0, -2), (1e6, -1e6), (1e-10, 1e-10)]:
            with self.subTest(delta=delta, omega=omega):
                self.job["model"]["parameters"] = {"delta": delta, "omega": omega}
                result = diagonalize(self.job)
                validate("quantum-result", result)
                expected = math.hypot(delta, omega) / 2
                for actual, reference in zip(result["spectrum"]["eigenvalues"], [-expected, expected]):
                    self.assertTrue(math.isclose(actual, reference, rel_tol=1e-12, abs_tol=1e-14))
                analysis = result["stateAnalysis"]
                if math.hypot(delta, omega) <= analysis["threshold"]:
                    self.assertEqual(analysis["status"], "degenerate")
                    self.assertNotIn("states", analysis)
                else:
                    self.assertEqual(analysis["status"], "resolved")
                    for index, state in enumerate(analysis["states"]):
                        a, b = state["amplitudes"]
                        self.assertAlmostEqual(a*a+b*b, 1, places=12)
                        self.assertAlmostEqual(state["populations"][0], a*a, places=12)
                        self.assertAlmostEqual(state["bloch"]["x"], 2*a*b, places=12)
                        self.assertAlmostEqual(state["bloch"]["z"], a*a-b*b, places=12)
                        self.assertLess(state["residualNorm"], 1e-8*max(1, abs(delta), abs(omega)))
                        sign = -1 if index == 0 else 1
                        self.assertAlmostEqual(state["bloch"]["x"], sign*omega/math.hypot(delta, omega), places=9)
                self.assertEqual(result["jobId"], self.job["jobId"])

    def test_invalid_contracts(self):
        for value in [float("nan"), float("inf"), True, "1", 1e7]:
            job = copy.deepcopy(self.job)
            job["model"]["parameters"]["delta"] = value
            with self.assertRaises(ValidationError):
                diagonalize(job)
        for change in [{"schema":"quantum-job/v2"}, {"operation":"evolve"}, {"extra":True}]:
            with self.assertRaises(ValidationError):
                diagonalize({**self.job, **change})

    def test_protocol_returns_spectrum_and_rejects_bad_jobs(self):
        response, stop = handle(json.dumps({"jsonrpc":"2.0","id":"a","method":"quantum.run","params":self.job}))
        self.assertFalse(stop)
        validate("quantum-result", response["result"])
        response, _ = handle('{"jsonrpc":"2.0","id":"b","method":"quantum.run","params":{}}')
        self.assertEqual(response["error"]["code"], -32602)

if __name__ == "__main__":
    unittest.main()
