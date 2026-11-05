"""The accelerated path must agree numerically before reporting speed."""
import unittest
import math

from quantum_worker.acceleration import assess_samples, benchmark_evolution, TOLERANCE


class AccelerationTests(unittest.TestCase):
    def test_accuracy_gate_rejects_wrong_or_unnormalized_samples(self):
        reference = [(1 + 0j, 0j), (0j, 1 + 0j)]
        self.assertTrue(assess_samples(reference, reference)["passed"])
        self.assertFalse(assess_samples(reference, [(1 + 0j, 0j), (1 + 0j, 0j)])["passed"])
        self.assertFalse(assess_samples(reference, [(2 + 0j, 0j), (0j, 1 + 0j)])["passed"])
        self.assertFalse(assess_samples(reference, [(1 + 0j, 0j)])["passed"])
        self.assertFalse(assess_samples(reference, [(float("nan") + 0j, 0j), (0j, 1 + 0j)])["passed"])
        balanced = [(1 / math.sqrt(2), 1 / math.sqrt(2))]
        wrong_relative_phase = [(1 / math.sqrt(2), -1 / math.sqrt(2))]
        self.assertEqual(assess_samples(balanced, wrong_relative_phase)["maxPopulationError"], 0)
        self.assertFalse(assess_samples(balanced, wrong_relative_phase)["passed"])
        global_phase = [(1j / math.sqrt(2), 1j / math.sqrt(2))]
        self.assertTrue(assess_samples(balanced, global_phase)["passed"])

    def test_benchmark_never_reports_speed_for_unchecked_results(self):
        report = benchmark_evolution()
        self.assertEqual(report["schema"], "quantum-acceleration-benchmark/v1")
        self.assertEqual(report["tolerance"], TOLERANCE)
        if report["available"]:
            self.assertTrue(report["passed"])
            self.assertTrue(report["deterministic"])
            self.assertLessEqual(report["maxPopulationError"], TOLERANCE)
            self.assertLessEqual(report["maxStateError"], TOLERANCE)
            self.assertIsNotNone(report["speedup"])
        else:
            self.assertFalse(report["passed"])
            self.assertIsNone(report["speedup"])


if __name__ == "__main__":
    unittest.main()
