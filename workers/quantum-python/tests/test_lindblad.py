"""Lindblad limiting cases and independent-engine agreement."""
import copy
import hashlib
import math
import struct
import tempfile
import threading
import unittest
from pathlib import Path

from quantum_worker.contracts import validate
from quantum_worker.engines.lindblad import lindblad


def job(engine="qutip"):
    return {
        "schema": "quantum-job/v1", "jobId": "open-" + engine, "operation": "lindblad",
        "engine": engine,
        "model": {"type": "open_jaynes_cummings", "parameters": {
            "qubitDetuning": 0.4, "cavityDetuning": 0.25, "coupling": 0,
            "driveAmplitude": 0, "relaxation": 0.3, "dephasing": 0,
            "cavityLoss": 0.2, "cutoff": 4}},
        "initialState": {"qubit": "excited", "photons": 0},
        "solver": {"type": "master", "tStart": 0, "tStop": 8, "samples": 81},
    }


def calculate(value):
    with tempfile.TemporaryDirectory() as directory:
        result = lindblad(value, directory, threading.Event(), lambda *_: None)
        validate("quantum-result", result)
        data = (Path(directory) / result["data"]["path"]).read_bytes()
        assert len(data) == result["data"]["bytes"]
        assert hashlib.sha256(data).hexdigest() == result["data"]["sha256"]
        return result, list(struct.iter_unpack("<7d", data))


class LindbladTests(unittest.TestCase):
    def test_relaxation_population_and_steady_state(self):
        for engine in ("qutip", "native"):
            result, rows = calculate(job(engine))
            self.assertAlmostEqual(result["steadyState"]["pExcited"], 0, delta=1e-9)
            for t, excited, photons, purity, coherence, boundary, trace in rows[::10]:
                self.assertAlmostEqual(excited, math.exp(-0.3 * t), delta=2e-5)
                self.assertAlmostEqual(photons, 0, delta=1e-8)
                self.assertAlmostEqual(trace, 1, delta=1e-8)
                self.assertLess(boundary, 1e-8)

    def test_pure_dephasing_and_cavity_loss_references(self):
        dephase = job("qutip")
        dephase["model"]["parameters"].update(relaxation=0, dephasing=0.25)
        dephase["initialState"]["qubit"] = "plus_x"
        result, rows = calculate(dephase)
        self.assertIsNone(result["steadyState"])
        for t, _, _, purity, coherence, _, trace in rows[::10]:
            self.assertAlmostEqual(coherence, 0.5 * math.exp(-0.25*t), delta=2e-5)
            self.assertAlmostEqual(purity, (1 + math.exp(-0.5*t))/2, delta=2e-5)
            self.assertAlmostEqual(trace, 1, delta=1e-9)
        loss = job("native")
        loss["initialState"] = {"qubit": "ground", "photons": 2}
        for t, _, photons, *_ in calculate(loss)[1][::10]:
            self.assertAlmostEqual(photons, 2 * math.exp(-0.2*t), delta=2e-5)

    def test_coupled_driven_engines_agree(self):
        qutip_job = job("qutip")
        qutip_job["model"]["parameters"].update(coupling=0.2, driveAmplitude=0.1, dephasing=0.07)
        native_job = copy.deepcopy(qutip_job)
        native_job["engine"] = "native"
        native_job["jobId"] = "open-native-coupled"
        qutip, rows = calculate(qutip_job)
        native, other = calculate(native_job)
        self.assertLess(max(abs(a-b) for a,b in zip(qutip["steadyState"].values(), native["steadyState"].values())), 2e-5)
        self.assertLess(max(abs(a-b) for row, row2 in zip(rows, other) for a,b in zip(row, row2)), 2e-4)
        self.assertTrue(all(0 <= row[3] <= 1.00001 for row in rows))


if __name__ == "__main__":
    unittest.main()
