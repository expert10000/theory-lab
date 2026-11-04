import copy
import json
from pathlib import Path
import unittest

from quantum_worker.result_v2 import qwz_result_v2, validate_qwz_result_v2


ROOT = Path(__file__).resolve().parents[3] / "packages/contracts/fixtures"
RUN = ROOT / "run-05ce1036d70c466eb4f900944a85c474" / "result.json"


class ResultV2Tests(unittest.TestCase):
    def test_saved_qwz_run_matches_shared_fixture(self):
        source = RUN.read_bytes()
        descriptor = qwz_result_v2(source)
        self.assertEqual(descriptor, json.loads((ROOT / "qwz-result.v2.json").read_text()))
        validate_qwz_result_v2(descriptor, source)
        self.assertEqual(descriptor["facts"]["chern"], -1)
        self.assertEqual(descriptor["facts"]["bulkGap"], 2)
        self.assertEqual([d["shape"] for d in descriptor["datasets"]],
                         [[21], [21, 21], [21, 21], [21, 21]])

    def test_changed_source_or_descriptor_is_rejected(self):
        source = RUN.read_bytes()
        descriptor = qwz_result_v2(source)
        altered = copy.deepcopy(descriptor)
        altered["datasets"][0]["storage"]["sha256"] = "0" * 64
        with self.assertRaises(ValueError):
            validate_qwz_result_v2(altered, source)
        with self.assertRaises(ValueError):
            validate_qwz_result_v2(descriptor, source.replace(b"2.0002494853248947", b"3.0002494853248947"))
        changed = json.loads(source)
        changed["analysis"]["berryCurvature"][0] = float("nan")
        with self.assertRaises(Exception):
            qwz_result_v2(json.dumps(changed).encode())


if __name__ == "__main__":
    unittest.main()
