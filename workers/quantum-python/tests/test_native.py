import copy
import json
import math
import struct
import tempfile
import threading
import unittest
from pathlib import Path

from quantum_worker.contracts import SCHEMA_DIR, validate
from quantum_worker.engines.evolution import evolve
from quantum_worker.engines.native_engine import diagonalize


def fixture(name):
    return json.loads((SCHEMA_DIR.parent / "fixtures" / name).read_text())


class NativeEngineTests(unittest.TestCase):
    def test_static_spectrum_matches_analytic_and_qutip(self):
        job = fixture("two-level.job.json")
        job["engine"] = "native"
        result = diagonalize(job)
        validate("quantum-result", result)
        self.assertEqual(result["engine"]["name"], "native")
        exact = math.hypot(1, 0.8) / 2
        self.assertAlmostEqual(result["spectrum"]["eigenvalues"][0], -exact, places=12)
        self.assertAlmostEqual(result["spectrum"]["eigenvalues"][1], exact, places=12)

    def test_rabi_native_artifact_and_qutip_agreement(self):
        job = fixture("rabi-evolution.job.json")
        job["engine"] = "native"
        with tempfile.TemporaryDirectory() as directory:
            native = evolve(job, directory, threading.Event(), lambda *_: None)
            validate("quantum-result", native)
            rows = list(struct.iter_unpack("<10d", (Path(directory) / native["data"]["path"]).read_bytes()))
        self.assertEqual(native["engine"]["name"], "native")
        for index in (0, 25, 50, 75, 100):
            t, p0, p1, sx, sy, sz, c0r, c0i, c1r, c1i = rows[index]
            self.assertAlmostEqual(p1, math.sin(t / 2) ** 2, delta=1e-8)
            self.assertAlmostEqual(p0 + p1, 1, delta=1e-8)
            self.assertAlmostEqual(sz, math.cos(t), delta=1e-8)
        qutip_job = copy.deepcopy(job)
        qutip_job["jobId"] = "rabi-qutip-reference"
        qutip_job["engine"] = "qutip"
        with tempfile.TemporaryDirectory() as directory:
            qutip = evolve(qutip_job, directory, threading.Event(), lambda *_: None)
            qutip_rows = list(struct.iter_unpack("<10d", (Path(directory) / qutip["data"]["path"]).read_bytes()))
        self.assertLess(max(abs(a[1] - b[1]) for a, b in zip(rows, qutip_rows)), 2e-5)

    def test_landau_zener_zero_gap_and_cancellation(self):
        job = fixture("landau-zener.job.json")
        job["engine"] = "native"
        job["model"]["parameters"]["gap"] = 0
        with tempfile.TemporaryDirectory() as directory:
            native = evolve(job, directory, threading.Event(), lambda *_: None)
            rows = list(struct.iter_unpack("<10d", (Path(directory) / native["data"]["path"]).read_bytes()))
            self.assertEqual(rows[0][0], -10)
            self.assertEqual(rows[-1][0], 10)
            self.assertTrue(all(abs(row[2]) < 1e-9 for row in rows))
        cancel = threading.Event()
        with tempfile.TemporaryDirectory() as directory:
            result = evolve(job, directory, cancel,
                            lambda completed, _: cancel.set() if completed >= 20 else None)
            self.assertIsNone(result)
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_stuckelberg_double_passage_and_engine_agreement(self):
        job = fixture("landau-zener.job.json")
        job["jobId"] = "stuckelberg-qutip"
        job["model"]["type"] = "stuckelberg"
        job["model"]["parameters"]["turnTime"] = 4
        job["solver"].update({"tStart": -12, "tStop": 12, "samples": 401})
        with tempfile.TemporaryDirectory() as directory:
            qutip = evolve(job, directory, threading.Event(), lambda *_: None)
            qutip_rows = list(struct.iter_unpack("<10d", (Path(directory) / qutip["data"]["path"]).read_bytes()))
        native_job = copy.deepcopy(job)
        native_job["jobId"] = "stuckelberg-native"
        native_job["engine"] = "native"
        with tempfile.TemporaryDirectory() as directory:
            native = evolve(native_job, directory, threading.Event(), lambda *_: None)
            native_rows = list(struct.iter_unpack("<10d", (Path(directory) / native["data"]["path"]).read_bytes()))
        self.assertEqual(qutip_rows[0][0], -12)
        self.assertEqual(qutip_rows[-1][0], 12)
        self.assertLess(max(abs(a[1] - b[1]) for a, b in zip(qutip_rows, native_rows)), 3e-4)
        self.assertTrue(all(abs(row[1] + row[2] - 1) < 1e-8 for row in qutip_rows))
        biased = copy.deepcopy(job)
        biased["jobId"] = "stuckelberg-biased"
        biased["model"]["parameters"]["bias"] = 0.5
        with tempfile.TemporaryDirectory() as directory:
            shifted = evolve(biased, directory, threading.Event(), lambda *_: None)
            shifted_rows = list(struct.iter_unpack("<10d", (Path(directory) / shifted["data"]["path"]).read_bytes()))
        self.assertGreater(abs(qutip_rows[-1][1] - shifted_rows[-1][1]), 0.001)
        job["jobId"] = "stuckelberg-zero-gap"
        job["model"]["parameters"]["gap"] = 0
        with tempfile.TemporaryDirectory() as directory:
            result = evolve(job, directory, threading.Event(), lambda *_: None)
            rows = list(struct.iter_unpack("<10d", (Path(directory) / result["data"]["path"]).read_bytes()))
        self.assertTrue(all(abs(row[2]) < 1e-9 for row in rows))
