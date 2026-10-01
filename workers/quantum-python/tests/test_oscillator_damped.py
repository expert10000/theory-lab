import tempfile
import threading
from pathlib import Path
import unittest

import numpy as np
from quantum_worker.contracts import validate
from quantum_worker.engines.oscillator_damped import oscillator_damped


def job(engine="native", initial=None, **parameters):
    return {"schema":"quantum-job/v1","jobId":"damped-test","operation":"oscillator_damped","engine":engine,
            "model":{"type":"damped_harmonic_oscillator","parameters":{"omega":1.,"cutoff":8,"loss":.3,"thermalOccupation":0.,**parameters}},
            "initialState":initial or {"type":"fock","index":3},
            "solver":{"type":"master","tStart":2.,"tStop":10.,"samples":41}}


def calculate(j):
    with tempfile.TemporaryDirectory() as root:
        result = oscillator_damped(j, root, threading.Event(), lambda *_: None)
        data = np.frombuffer((Path(root)/result["data"]["path"]).read_bytes(), dtype="<f8").reshape((result["data"]["rows"],-1))
        return result, data


class DampedOscillatorTests(unittest.TestCase):
    def test_fock_loss_matches_exact_number_and_engines(self):
        outputs=[]
        for backend in ("native","qutip"):
            result, data=calculate(job(backend))
            np.testing.assert_allclose(data[:,1], 3*np.exp(-.3*(data[:,0]-2)), atol=2e-7)
            np.testing.assert_allclose(data[:,3], 1, atol=2e-8)
            self.assertLess(result["analysis"]["maxNumberReferenceError"], 2e-7)
            outputs.append(data)
        np.testing.assert_allclose(*outputs, atol=2e-7)

    def test_thermal_relaxation_and_coherent_zero_loss(self):
        for backend in ("native","qutip"):
            _, thermal=calculate(job(backend, thermalOccupation=.7))
            self.assertLess(thermal[-1,1], 3)
            self.assertGreater(thermal[-1,1], .7)
            self.assertLess(thermal[-1,2], 1)
            _, closed=calculate(job(backend,{"type":"coherent","alphaRe":.7,"alphaIm":.2},loss=0))
            np.testing.assert_allclose(closed[:,1],closed[0,1],atol=2e-8)
            np.testing.assert_allclose(closed[:,2],1,atol=2e-8)
            self.assertGreater(closed[-1,5], .1)

    def test_bounds_and_cancellation_cleanup(self):
        invalid=job(loss=2)
        invalid["solver"]["tStop"]=22
        with self.assertRaises(ValueError): validate("quantum-job",invalid)
        for backend in ("native","qutip"):
            with tempfile.TemporaryDirectory() as root:
                cancelled=threading.Event();cancelled.set()
                self.assertIsNone(oscillator_damped(job(backend),root,cancelled,lambda *_:None))
                self.assertEqual(list(Path(root).iterdir()),[])
