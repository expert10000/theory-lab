"""Independent boundaries and grid checks for the dimensionless GL example."""
import copy
import unittest

from quantum_worker.engines.landau import solve


def job(**changes):
    parameters = {"a1": -0.7, "a2": -0.5, "b1": 1, "b2": 1, "g": 0.4}
    parameters.update(changes)
    return {"schema": "quantum-landau-job/v1", "jobId": "gl-python-test",
            "model": {"type": "two_order_landau", "parameters": parameters}}


class LandauTests(unittest.TestCase):
    def test_chapter_reference_against_independent_grid(self):
        result = solve(job())
        self.assertEqual(result["globalMinima"], ["mixed"])
        mixed = result["candidates"][-1]
        self.assertAlmostEqual(mixed["x"], 25/42, places=12)
        self.assertAlmostEqual(mixed["y"], 11/42, places=12)
        self.assertAlmostEqual(result["quarticDeterminant"], 0.84)
        for i in range(101):
            for j in range(101):
                x, y = i/100, j/100
                independent = -0.7*x - 0.5*y + 0.5*x*x + 0.5*y*y + 0.4*x*y
                self.assertGreaterEqual(independent + 1e-12, mixed["freeEnergy"])

    def test_normal_pure_first_order_and_marginal(self):
        self.assertEqual(solve(job(a1=0.5, a2=0.3))["globalMinima"], ["normal"])
        self.assertEqual(solve(job(a1=-1, a2=0.5))["globalMinima"], ["sc1"])
        self.assertEqual(solve(job(a1=0.5, a2=-1))["globalMinima"], ["sc2"])
        strong = solve(job(a1=-0.5, a2=-0.5, g=1.2))
        self.assertEqual(strong["globalMinima"], ["sc1", "sc2"])
        self.assertFalse(any(row["phase"] == "mixed" for row in strong["candidates"]))
        marginal = solve(job(a1=-0.5, a2=-0.5, g=1))
        self.assertTrue(marginal["marginalQuartic"])
        self.assertEqual(marginal["globalMinima"], ["sc1", "sc2"])

    def test_rejects_out_of_scope_coefficients(self):
        for changes in ({"a1": -2.1}, {"b1": 0}, {"g": -0.1}, {"g": 4.1}):
            with self.assertRaises(Exception):
                solve(job(**changes))
        malformed = copy.deepcopy(job())
        malformed["model"]["type"] = "ute2_fitted"
        with self.assertRaises(Exception):
            solve(malformed)


if __name__ == "__main__":
    unittest.main()
