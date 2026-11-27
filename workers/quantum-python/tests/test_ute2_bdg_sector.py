"""Independent matrix and scope checks for the reduced 2x2 BdG sector."""
import cmath
import json
import math
import unittest

from quantum_worker.engines.bdg_sector import solve


def job(**changes):
    p = {"extent": 1.5, "delta": .8, "phaseRad": .4, "points": 101}
    p.update(changes)
    return {"schema": "quantum-bdg-sector-job/v1", "jobId": "bdg-python-test",
            "model": {"type": "reduced_bdg_2x2", "parameters": p}}


class BdGSectorTests(unittest.TestCase):
    def test_reference_matrix_spectrum_and_weights(self):
        result = solve(job())
        self.assertAlmostEqual(result["minimumPositiveEnergy"], .8)
        self.assertFalse(result["gapClosed"])
        self.assertEqual(result["samples"][50]["xi"], 0)
        self.assertAlmostEqual(result["samples"][70]["xi"], .6)
        self.assertAlmostEqual(result["samples"][70]["ePlus"], 1)
        self.assertAlmostEqual(result["samples"][70]["electronWeight"], .8)
        self.assertAlmostEqual(result["samples"][70]["holeWeight"], .2)
        xi, delta, phase = .6, .8, .4
        upper = delta*cmath.exp(1j*phase)
        lower = upper.conjugate()
        self.assertEqual(upper.conjugate(), lower)
        self.assertAlmostEqual(xi*(-xi)-upper*lower, -1)
        self.assertAlmostEqual(math.sqrt(xi*xi+delta*delta), 1)
        self.assertAlmostEqual((1+xi)/2, .8)
        self.assertAlmostEqual((1-xi)/2, .2)
        for row in result["samples"]:
            self.assertAlmostEqual(row["eMinus"], -row["ePlus"])
            self.assertAlmostEqual(row["ePlus"]**2, row["xi"]**2+delta**2)
            self.assertAlmostEqual(row["electronWeight"]+row["holeWeight"], 1)

    def test_gap_closure_and_invalid_scope(self):
        self.assertLess(len(json.dumps(solve(job(points=201)))), 65536)
        closed = solve(job(delta=0))
        self.assertTrue(closed["gapClosed"])
        self.assertEqual(closed["samples"][50]["ePlus"], 0)
        self.assertIsNone(closed["samples"][50]["electronWeight"])
        self.assertTrue(all(row["pairingPhaseRad"] is None for row in closed["samples"]))
        self.assertEqual([r["ePlus"] for r in solve(job(phaseRad=-1))["samples"]],
                         [r["ePlus"] for r in solve(job(phaseRad=1))["samples"]])
        for changes in ({"points": 100}, {"points": 203}, {"delta": 2.1}, {"extent": .4}, {"phaseRad": 4}):
            with self.assertRaises(Exception):
                solve(job(**changes))


if __name__ == "__main__":
    unittest.main()
