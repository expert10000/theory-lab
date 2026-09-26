"""Cavity results checked against Volume VIII Commit 691 analytic references."""
import copy
import hashlib
import math
import struct
import tempfile
import threading
import unittest
from pathlib import Path

from quantum_worker.contracts import validate
from quantum_worker.engines.cavity import cavity


def job(kind="jaynes_cummings", engine="qutip"):
    return {
        "schema": "quantum-job/v1", "jobId": f"{kind}-{engine}",
        "operation": "cavity", "engine": engine,
        "model": {"type": kind, "parameters": {
            "qubitFrequency": 1, "cavityFrequency": 1, "coupling": 0.35, "cutoff": 8},
            **({"source": {"sourceRepository": "https://github.com/expert10000/theory",
                           "sourceModule": "examples/python/qutip/adapters/jaynes_cummings.py",
                           "volume": "VIII", "exampleId": "Commit 691"}}
               if kind == "jaynes_cummings" else {})},
        "initialState": {"qubit": "excited", "photons": 0},
        "solver": {"type": "schrodinger", "tStart": 0,
                   "tStop": math.pi / (2 * 0.35), "samples": 101},
    }


def calculate(job_value):
    with tempfile.TemporaryDirectory() as directory:
        result = cavity(job_value, directory, threading.Event(), lambda *_: None)
        validate("quantum-result", result)
        data = (Path(directory) / result["data"]["path"]).read_bytes()
        assert len(data) == result["data"]["bytes"]
        assert hashlib.sha256(data).hexdigest() == result["data"]["sha256"]
        return result, list(struct.iter_unpack("<6d", data))


class CavityTests(unittest.TestCase):
    def test_jc_commit691_vacuum_rabi_and_dressed_splitting(self):
        qutip, rows = calculate(job())
        native, reference = calculate(job(engine="native"))
        self.assertEqual(len(qutip["dressedSpectrum"]), 16)
        self.assertAlmostEqual(qutip["dressedSpectrum"][2] - qutip["dressedSpectrum"][1], 0.7, delta=1e-8)
        for row, other in zip(rows, reference):
            t, excited, photons, boundary, norm, parity = row
            self.assertAlmostEqual(excited, math.cos(0.35 * t) ** 2, delta=1e-5)
            self.assertAlmostEqual(photons, math.sin(0.35 * t) ** 2, delta=1e-5)
            self.assertAlmostEqual(norm, 1, delta=1e-9)
            self.assertLess(boundary, 1e-10)
            self.assertAlmostEqual(parity, -1, delta=1e-8)
            self.assertLess(max(abs(a-b) for a,b in zip(row[1:], other[1:])), 2e-5)
        self.assertEqual(qutip["model"]["source"]["exampleId"], "Commit 691")

    def test_quantum_rabi_parity_and_cross_engine(self):
        qutip, rows = calculate(job("quantum_rabi"))
        native, reference = calculate(job("quantum_rabi", "native"))
        self.assertEqual(len(qutip["dressedSpectrum"]), 16)
        self.assertLess(max(abs(a-b) for a,b in zip(qutip["dressedSpectrum"], native["dressedSpectrum"])), 1e-8)
        for row, other in zip(rows, reference):
            self.assertAlmostEqual(row[4], 1, delta=1e-8)
            self.assertAlmostEqual(row[5], -1, delta=1e-8)
            self.assertLess(abs(row[1] - other[1]), 2e-5)
        self.assertLess(max(row[3] for row in rows), 0.02)

    def test_photons_beyond_cutoff_rejected_and_cancellation_cleans_up(self):
        invalid = job()
        invalid["initialState"]["photons"] = invalid["model"]["parameters"]["cutoff"]
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                cavity(invalid, directory, threading.Event(), lambda *_: None)
        with tempfile.TemporaryDirectory() as directory:
            cancelled = threading.Event()
            def progress(done, _total):
                if done >= 20:
                    cancelled.set()
            self.assertIsNone(cavity(job(), directory, cancelled, progress))
            self.assertEqual(list(Path(directory).iterdir()), [])


if __name__ == "__main__":
    unittest.main()
