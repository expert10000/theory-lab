import unittest

from quantum_worker.engines.qec_repetition import solve


class QecRepetitionTests(unittest.TestCase):
    def test_each_single_error_is_corrected_and_defects_are_temporal(self):
        for bit, syndrome in ((0, [1, 0]), (1, [1, 1]), (2, [0, 1])):
            with self.subTest(bit=bit):
                result = solve({"flips": [-1, bit, -1]})
                self.assertEqual(result["rounds"][1]["defects"], syndrome)
                self.assertEqual(result["rounds"][2]["defects"], [0, 0])
                self.assertEqual(result["decoder"]["correctionBit"], bit)
                self.assertEqual(result["decoder"]["correctedBits"], [0, 0, 0])


    def test_two_errors_are_explicitly_ambiguous(self):
        result = solve({"flips": [0, 1]})
        self.assertTrue(result["decoder"]["ambiguousMultipleErrors"])
        self.assertEqual(result["decoder"]["logicalResult"], 1)


    def test_invalid_schedule_refused(self):
        for flips in ([], [3], [True], [0] * 33, "0", [0.0]):
            with self.subTest(flips=flips), self.assertRaises(ValueError):
                solve({"flips": flips})
