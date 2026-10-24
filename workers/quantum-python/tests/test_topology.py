"""Independent SSH limiting cases and finite-size edge diagnostics."""
import unittest

from quantum_worker.engines.topology import solve


def job(t1, t2, cells=16):
    return {"schema": "quantum-job/v1", "jobId": "topology-test", "operation": "topology",
            "engine": "native", "model": {"type": "ssh", "parameters":
            {"t1": t1, "t2": t2, "cells": cells, "kPoints": 101}}}


def qwz_job(mass, grid=21):
    return {"schema": "quantum-job/v1", "jobId": "qwz-test", "operation": "topology",
            "engine": "native", "model": {"type": "qwz", "parameters":
            {"mass": mass, "grid": grid}}}


def bhz_job(mass, grid=21):
    return {"schema": "quantum-job/v1", "jobId": "bhz-test", "operation": "topology",
            "engine": "native", "model": {"type": "bhz", "parameters":
            {"mass": mass, "grid": grid}}}


class SSHTests(unittest.TestCase):
    def test_topological_and_trivial_phases(self):
        top = solve(job(0.6, 1))["analysis"]
        trivial = solve(job(1, 0.6))["analysis"]
        self.assertEqual(top["winding"], 1)
        self.assertEqual(trivial["winding"], 0)
        self.assertAlmostEqual(top["bulkGap"], 0.8)
        self.assertAlmostEqual(trivial["bulkGap"], 0.8)
        self.assertGreater(top["edgeWeight"], 0.5)
        self.assertLess(trivial["edgeWeight"], 0.2)
        self.assertAlmostEqual(sum(top["edgeDensity"]), 1)

    def test_exact_dimer_and_critical_point(self):
        top = solve(job(0, 1))["analysis"]
        self.assertEqual(top["edgeEnergies"], [0, 0])
        self.assertEqual(top["winding"], 1)
        self.assertAlmostEqual(top["edgeWeight"], 1)
        critical = solve(job(1, 1))["analysis"]
        self.assertIsNone(critical["winding"])
        self.assertEqual(critical["bulkGap"], 0)

    def test_edge_splitting_shrinks_with_chain_length(self):
        short = solve(job(0.6, 1, 8))["analysis"]
        long = solve(job(0.6, 1, 20))["analysis"]
        self.assertLess(abs(long["edgeEnergies"][1]), abs(short["edgeEnergies"][1]))


class QWZTests(unittest.TestCase):
    def test_chern_phases_and_reversal(self):
        expected = [(-3, 0), (-1, -1), (1, 1), (3, 0)]
        for mass, chern in expected:
            with self.subTest(mass=mass):
                a = solve(qwz_job(mass))["analysis"]
                self.assertEqual(a["chern"], chern)
                self.assertEqual(a["latticeChern"], chern)
                self.assertTrue(a["meshResolved"])
                self.assertAlmostEqual(a["chernIntegral"], chern, places=4)
                self.assertEqual(len(a["berryCurvature"]), 21 ** 2)
                self.assertAlmostEqual(a["bulkGap"], 2)

    def test_gap_closures_are_undefined(self):
        for mass in (-2, 0, 2):
            with self.subTest(mass=mass):
                a = solve(qwz_job(mass))["analysis"]
                self.assertTrue(a["gapClosed"])
                self.assertEqual(a["bulkGap"], 0)
                self.assertIsNone(a["chern"])
                self.assertIsNone(a["latticeChern"])
                self.assertIsNone(a["chernIntegral"])
                self.assertEqual(a["berryCurvature"], [])

    def test_independent_curvature_quadrature_converges(self):
        coarse = solve(qwz_job(1.6, 11))["analysis"]
        fine = solve(qwz_job(1.6, 31))["analysis"]
        self.assertEqual(coarse["chern"], fine["chern"])
        self.assertLess(abs(fine["chernIntegral"] - fine["chern"]),
                        abs(coarse["chernIntegral"] - coarse["chern"]) / 100)
        self.assertLess(abs(fine["chernIntegral"] - fine["chern"]), 1e-5)

    def test_coarse_mesh_near_transition_is_not_mislabelled(self):
        coarse = solve(qwz_job(0.01, 11))["analysis"]
        fine = solve(qwz_job(0.01, 31))["analysis"]
        self.assertEqual(coarse["latticeChern"], -1)
        self.assertEqual(coarse["analyticChern"], 1)
        self.assertIsNone(coarse["chern"])
        self.assertFalse(coarse["meshResolved"])
        self.assertEqual(fine["chern"], 1)
        self.assertTrue(fine["meshResolved"])

    def test_protocol_result_stays_below_worker_line_limit(self):
        import json
        for mass in (-6, -2, -1.99, -1, 0, 0.01, 1, 1.99, 2, 6):
            result = solve(qwz_job(mass, 31))
            self.assertLess(len(json.dumps(result).encode("utf-8")), 65536)
            a = result["analysis"]
            self.assertEqual(len(a["bandKValues"]), 31)
            self.assertEqual(len(a["upperBand"]), 31**2)
            self.assertEqual(a["lowerBand"], [-v for v in a["upperBand"]])


class BHZTests(unittest.TestCase):
    def test_independent_four_by_four_eigenspectrum_and_time_reversal(self):
        import numpy as np
        from quantum_worker.engines.topology import bhz_analysis
        mass, grid = 2.0, 15
        a = bhz_analysis(np, {"mass": mass, "grid": grid})
        for x, y in ((0, 0), (3, 9), (7, 7), (14, 12)):
            kx, ky = a["bandKValues"][x], a["bandKValues"][y]
            dx, dy = np.sin(kx), -np.sin(ky)
            dz = mass - 2 * (2 - np.cos(kx) - np.cos(ky))
            h = np.array([[dz, dx - 1j * dy], [dx + 1j * dy, -dz]])
            partner = np.array([[dz, -dx - 1j * dy], [-dx + 1j * dy, -dz]])
            full = np.block([[h, np.zeros((2, 2))], [np.zeros((2, 2)), partner]])
            actual = np.linalg.eigvalsh(full)
            stored = [band[x * grid + y] for band in a["bandEnergies"]]
            np.testing.assert_allclose(stored, actual, atol=1e-12)
            np.testing.assert_allclose(partner, np.conj(np.array([[dz, -dx + 1j * dy], [-dx - 1j * dy, -dz]])))

    def test_mass_phases_partner_cancellation_and_gap_closures(self):
        for mass, block, z2 in ((-1, 0, 0), (2, 1, 1), (6, -1, 1), (9, 0, 0)):
            with self.subTest(mass=mass):
                a = solve(bhz_job(mass, 15))["analysis"]
                self.assertEqual((a["blockChern"], a["partnerChern"], a["z2"]), (block, -block, z2))
                self.assertTrue(a["meshResolved"])
        for mass in (0, 4, 8):
            with self.subTest(closure=mass):
                a = solve(bhz_job(mass, 15))["analysis"]
                self.assertTrue(a["gapClosed"])
                self.assertEqual(a["bulkGap"], 0)
                self.assertIsNone(a["z2"])
        for mass in (0.01, 3.99):
            a = solve(bhz_job(mass, 11))["analysis"]
            if not a["meshResolved"]:
                self.assertIsNone(a["z2"])

    def test_bounded_worker_line_and_contract_refusals(self):
        import json
        from quantum_worker.contracts import validate
        result = solve(bhz_job(2, 21))
        self.assertLess(len(json.dumps(result).encode()), 65536)
        bad = bhz_job(2, 22)
        with self.assertRaises(Exception):
            validate("quantum-job", bad)
        result["analysis"]["z2"] = 2
        with self.assertRaises(Exception):
            validate("quantum-result", result)


if __name__ == "__main__":
    unittest.main()
