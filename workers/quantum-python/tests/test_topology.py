"""Independent SSH limiting cases and finite-size edge diagnostics."""
import unittest

from quantum_worker.engines.topology import solve


def job(t1, t2, cells=16):
    return {"schema": "quantum-job/v1", "jobId": "topology-test", "operation": "topology",
            "engine": "native", "model": {"type": "ssh", "parameters":
            {"t1": t1, "t2": t2, "cells": cells, "kPoints": 101}}}


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


if __name__ == "__main__":
    unittest.main()
