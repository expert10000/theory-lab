import copy
import hashlib
import json
import math
import struct
import tempfile
import threading
import unittest
from pathlib import Path
from jsonschema import ValidationError
from quantum_worker.contracts import SCHEMA_DIR, validate
from quantum_worker.engines.evolution import evolve

class EvolutionTests(unittest.TestCase):
    def setUp(self):
        self.job = json.loads((SCHEMA_DIR.parent / "fixtures" / "rabi-evolution.job.json").read_text())

    def test_rabi_reference_norm_and_binary_integrity(self):
        with tempfile.TemporaryDirectory() as directory:
            updates = []
            result = evolve(self.job, directory, threading.Event(), lambda done, total: updates.append((done, total)))
            validate("quantum-result", result)
            self.assertEqual(updates[0], (0, 101))
            self.assertEqual(updates[-1], (101, 101))
            data = (Path(directory) / result["data"]["path"]).read_bytes()
            self.assertEqual(len(data), 101 * 80)
            self.assertEqual(hashlib.sha256(data).hexdigest(), result["data"]["sha256"])
            rows = list(struct.iter_unpack("<10d", data))
            for index in [0, 25, 50, 75, 100]:
                t, p0, p1, sx, sy, sz, c0r, c0i, c1r, c1i = rows[index]
                self.assertAlmostEqual(p0 + p1, 1, places=10)
                self.assertAlmostEqual(p1, math.sin(t / 2) ** 2, delta=1e-5)
                self.assertAlmostEqual(sz, math.cos(t), delta=2e-5)
                self.assertAlmostEqual(sx*sx + sy*sy + sz*sz, 1, delta=2e-5)
                self.assertAlmostEqual(p0, c0r*c0r + c0i*c0i, delta=1e-10)
                self.assertAlmostEqual(p1, c1r*c1r + c1i*c1i, delta=1e-10)

    def test_real_cancellation_removes_partial_artifact(self):
        with tempfile.TemporaryDirectory() as directory:
            cancel = threading.Event()
            def progress(done, total):
                if done >= 20:
                    cancel.set()
            self.assertIsNone(evolve(self.job, directory, cancel, progress))
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_invalid_time_range_and_unsupported_model(self):
        with tempfile.TemporaryDirectory() as directory:
            job = copy.deepcopy(self.job)
            job["solver"]["tStart"] = 1
            job["solver"]["tStop"] = 0.5
            with self.assertRaises(ValueError):
                evolve(job, directory, threading.Event(), lambda *_: None)
            job = copy.deepcopy(self.job)
            job["model"]["type"] = "molecule"
            with self.assertRaises(ValidationError):
                evolve(job, directory, threading.Event(), lambda *_: None)

    def test_landau_zener_sweep_and_zero_gap_reference(self):
        job = json.loads((SCHEMA_DIR.parent / "fixtures" / "landau-zener.job.json").read_text())
        with tempfile.TemporaryDirectory() as directory:
            result = evolve(job, directory, threading.Event(), lambda *_: None)
            validate("quantum-result", result)
            rows = list(struct.iter_unpack("<10d", (Path(directory) / result["data"]["path"]).read_bytes()))
            self.assertEqual(rows[0][0], -10)
            self.assertEqual(rows[-1][0], 10)
            self.assertTrue(0 < rows[-1][2] < 1)
            self.assertTrue(all(abs(row[1] + row[2] - 1) < 1e-9 for row in rows))
        job["jobId"] = "lz-zero-gap"
        job["model"]["parameters"]["gap"] = 0
        with tempfile.TemporaryDirectory() as directory:
            result = evolve(job, directory, threading.Event(), lambda *_: None)
            rows = list(struct.iter_unpack("<10d", (Path(directory) / result["data"]["path"]).read_bytes()))
            self.assertTrue(all(abs(row[2]) < 1e-10 and abs(row[5] - 1) < 1e-10 for row in rows))

if __name__ == "__main__":
    unittest.main()
