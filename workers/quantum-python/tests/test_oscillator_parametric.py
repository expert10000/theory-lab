import tempfile
import threading
from pathlib import Path
import unittest

import numpy as np
from quantum_worker.contracts import validate
from quantum_worker.engines.oscillator_parametric import oscillator_parametric, reference


def job(backend="native", **parameters):
    return {"schema":"quantum-job/v1","jobId":"parametric-test","operation":"oscillator_parametric","engine":backend,
            "model":{"type":"parametric_oscillator","parameters":{"omega":1.,"lambdaRe":.3,"lambdaIm":.2,"cutoff":24,**parameters}},
            "initialState":{"type":"vacuum"},"solver":{"type":"schrodinger","tStart":3.,"tStop":11.,"samples":81}}


def calculate(j):
    with tempfile.TemporaryDirectory() as root:
        result=oscillator_parametric(j,root,threading.Event(),lambda *_:None)
        data=np.frombuffer((Path(root)/result["data"]["path"]).read_bytes(),dtype="<f8").reshape((result["data"]["rows"],-1))
        return result,data


class ParametricOscillatorTests(unittest.TestCase):
    def test_complex_stable_squeezing_matches_reference_and_engines(self):
        outputs=[]
        for backend in ("native","qutip"):
            result,data=calculate(job(backend))
            expected=np.array([reference(np,1.,.3+.2j,t-3.) for t in data[:,0]])
            np.testing.assert_allclose(data[:,5],expected[:,0],atol=2e-7)
            np.testing.assert_allclose(data[:,3],expected[:,1],atol=2e-7)
            np.testing.assert_allclose(data[:,4],expected[:,2],atol=2e-7)
            np.testing.assert_allclose(data[:,8],1,atol=2e-8)
            self.assertLess(result["analysis"]["maxBoundaryOccupation"],1e-7)
            outputs.append(data)
        np.testing.assert_allclose(*outputs,atol=3e-7)

    def test_zero_coupling_and_bounds(self):
        for backend in ("native","qutip"):
            _,data=calculate(job(backend,lambdaRe=0,lambdaIm=0))
            np.testing.assert_allclose(data[:,5],0,atol=1e-9)
            np.testing.assert_allclose(data[:,3:5],.5,atol=1e-9)
        invalid=job(lambdaRe=.9)
        with self.assertRaises(ValueError):validate("quantum-job",invalid)

    def test_cancellation_publishes_no_partial_file(self):
        for backend in ("native","qutip"):
            with tempfile.TemporaryDirectory() as root:
                flag=threading.Event();flag.set()
                self.assertIsNone(oscillator_parametric(job(backend),root,flag,lambda *_:None))
                self.assertEqual(list(Path(root).iterdir()),[])
