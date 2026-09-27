"""General sweep shape, engine agreement, cancellation and disk resume."""
import copy
import hashlib
import math
import struct
import tempfile
import threading
import unittest
from pathlib import Path

from quantum_worker.contracts import validate
from quantum_worker.engines.sweep import sweep
from quantum_worker.engines.dynamiqs_engine import availability as gpu_availability


def job(engine="native", two_dimensional=False):
    return {
        "schema": "quantum-job/v1", "jobId": "sweep-" + engine,
        "operation": "sweep", "engine": engine,
        "model": {"type": "driven_two_level", "parameters": {
            "delta": 1, "amplitude": 0.5, "frequency": 1, "phase": 0}},
        "sweep": {"x": {"parameter": "amplitude", "start": 0, "stop": 1.2, "points": 7},
                  "y": {"parameter": "frequency", "start": 0.7, "stop": 1.3, "points": 5} if two_dimensional else None,
                  "metric": "final_p1", "tStart": 0, "tStop": 6, "initialIndex": 0},
    }


class SweepTests(unittest.TestCase):
    @unittest.skipUnless(gpu_availability()["available"], "optional Dynamiqs CUDA GPU unavailable")
    def test_gpu_batch_agreement_and_checkpoint_resume(self):
        with tempfile.TemporaryDirectory() as directory:
            gpu_job = job("dynamiqs", True)
            cancel = threading.Event()
            progress = []
            def stop_after_batch(done, total):
                progress.append((done, total))
                if done >= 14:
                    cancel.set()
            self.assertIsNone(sweep(gpu_job, directory, cancel, stop_after_batch))
            self.assertFalse((Path(directory) / (gpu_job["jobId"] + ".f64")).exists())
            resumed_job = copy.deepcopy(gpu_job)
            resumed_job["jobId"] = "sweep-gpu-resumed"
            gpu = sweep(resumed_job, directory, threading.Event(), lambda *_: None)
            reference = sweep(job("qutip", True), directory, threading.Event(), lambda *_: None)
            validate("quantum-result", gpu)
            self.assertEqual(gpu["cache"]["reusedPoints"], 14)
            self.assertEqual(gpu["cache"]["computedPoints"], 21)
            self.assertEqual(gpu["engine"]["device"], gpu_availability()["device"])
            def cells(result):
                raw = (Path(directory) / result["data"]["path"]).read_bytes()
                self.assertEqual(hashlib.sha256(raw).hexdigest(), result["data"]["sha256"])
                return struct.unpack("<35d", raw)
            self.assertLess(max(abs(a-b) for a,b in zip(cells(gpu), cells(reference))), 5e-4)

    def test_1d_and_2d_engines_agree(self):
        with tempfile.TemporaryDirectory() as directory:
            native_job = job("native", True)
            qutip_job = job("qutip", True)
            native = sweep(native_job, directory, threading.Event(), lambda *_: None)
            qutip = sweep(qutip_job, directory, threading.Event(), lambda *_: None)
            validate("quantum-result", native)
            validate("quantum-result", qutip)
            self.assertEqual(native["data"]["shape"], {"x": 7, "y": 5})
            self.assertEqual(native["cache"]["computedPoints"], 35)
            def values(result):
                raw = (Path(directory) / result["data"]["path"]).read_bytes()
                self.assertEqual(hashlib.sha256(raw).hexdigest(), result["data"]["sha256"])
                return struct.unpack("<35d", raw)
            a, b = values(native), values(qutip)
            self.assertTrue(all(0 <= value <= 1 for value in a))
            self.assertTrue(all(abs(a[row * 7]) < 1e-9 for row in range(5)))
            self.assertLess(max(abs(x-y) for x,y in zip(a,b)), 2e-5)
        with tempfile.TemporaryDirectory() as directory:
            one = sweep(job(), directory, threading.Event(), lambda *_: None)
            self.assertEqual(one["data"]["shape"], {"x": 7, "y": 1})

    def test_cancel_resume_and_completed_cache_reuse(self):
        with tempfile.TemporaryDirectory() as directory:
            first = job()
            cancelled = threading.Event()
            def progress(done, _total):
                if done >= 3:
                    cancelled.set()
            self.assertIsNone(sweep(first, directory, cancelled, progress))
            self.assertFalse((Path(directory) / (first["jobId"] + ".f64")).exists())
            next_job = copy.deepcopy(first)
            next_job["jobId"] = "sweep-resumed"
            resumed = sweep(next_job, directory, threading.Event(), lambda *_: None)
            self.assertGreaterEqual(resumed["cache"]["reusedPoints"], 3)
            self.assertEqual(resumed["cache"]["reusedPoints"] + resumed["cache"]["computedPoints"], 7)
            final_job = copy.deepcopy(first)
            final_job["jobId"] = "sweep-all-cached"
            all_cached = sweep(final_job, directory, threading.Event(), lambda *_: None)
            self.assertEqual(all_cached["cache"]["reusedPoints"], 7)
            self.assertEqual(all_cached["cache"]["computedPoints"], 0)
            self.assertEqual(all_cached["cache"]["key"], resumed["cache"]["key"])

    def test_axes_require_distinct_registered_parameters(self):
        invalid = job()
        invalid["sweep"]["x"]["parameter"] = "gap"
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                sweep(invalid, directory, threading.Event(), lambda *_: None)


if __name__ == "__main__":
    unittest.main()
