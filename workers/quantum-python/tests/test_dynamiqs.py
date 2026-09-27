"""Optional GPU adapter checks; the CPU-only release suite still runs."""
import copy
import json
import struct
import tempfile
import threading
import unittest
from pathlib import Path

from quantum_worker.contracts import SCHEMA_DIR, validate
from quantum_worker.engines.dynamiqs_engine import availability
from quantum_worker.engines.evolution import evolve


class DynamiqsTests(unittest.TestCase):
    def test_capability_has_honest_gpu_state(self):
        info = availability()
        self.assertEqual(set(info), {"available", "version", "device"})
        if info["available"]:
            self.assertIsNotNone(info["device"])
        else:
            self.assertIsNone(info["device"])

    @unittest.skipUnless(availability()["available"], "optional Dynamiqs CUDA GPU unavailable")
    def test_gpu_evolution_matches_qutip_and_cancels(self):
        for name, model_type in (("rabi-evolution.job.json", "driven_two_level"),
                                 ("rabi-evolution.job.json", "strong_drive"),
                                 ("landau-zener.job.json", "landau_zener"),
                                 ("landau-zener.job.json", "stuckelberg")):
            source = json.loads((SCHEMA_DIR.parent / "fixtures" / name).read_text())
            source["model"]["type"] = model_type
            if model_type == "strong_drive":
                source["model"]["parameters"].update({"delta": 1, "frequency": 1})
            if model_type == "stuckelberg":
                source["model"]["parameters"]["turnTime"] = 4
            source["solver"]["samples"] = 129
            gpu_job = copy.deepcopy(source)
            gpu_job["jobId"] += "-gpu"
            gpu_job["engine"] = "dynamiqs"
            with tempfile.TemporaryDirectory() as directory:
                gpu = evolve(gpu_job, directory, threading.Event(), lambda *_: None)
                validate("quantum-result", gpu)
                self.assertEqual(gpu["engine"]["device"], availability()["device"])
                gpu_rows = list(struct.iter_unpack("<10d", (Path(directory) / gpu["data"]["path"]).read_bytes()))
            with tempfile.TemporaryDirectory() as directory:
                reference = evolve(source, directory, threading.Event(), lambda *_: None)
                qutip_rows = list(struct.iter_unpack("<10d", (Path(directory) / reference["data"]["path"]).read_bytes()))
            self.assertEqual(len(gpu_rows), 129)
            self.assertLess(max(abs(a[2] - b[2]) for a, b in zip(gpu_rows, qutip_rows)), 5e-4)
            self.assertLess(max(abs(row[1] + row[2] - 1) for row in gpu_rows), 1e-5)

        cancel = threading.Event()
        with tempfile.TemporaryDirectory() as directory:
            result = evolve(gpu_job, directory, cancel,
                            lambda completed, _: cancel.set() if completed >= 20 else None)
            self.assertIsNone(result)
            self.assertEqual(list(Path(directory).iterdir()), [])
