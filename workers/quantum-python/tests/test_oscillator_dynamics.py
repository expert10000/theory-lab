import hashlib
import tempfile
from pathlib import Path
import threading
import unittest
import numpy as np

from quantum_worker.engines.oscillator_dynamics import oscillator_evolve


def job(backend="native", initial=None, **parameters):
    return {"schema":"quantum-job/v1", "jobId":"osc-motion", "operation":"oscillator_evolve", "engine":backend,
            "model":{"type":"harmonic_oscillator", "parameters":{"omega":1.,"cutoff":24,"extent":8.,"points":201,**parameters}},
            "initialState":initial or {"type":"coherent","alphaRe":1.,"alphaIm":0.},
            "solver":{"type":"schrodinger","tStart":7.,"tStop":7.+2*np.pi,"samples":101}}


def calculate(j):
    with tempfile.TemporaryDirectory() as root:
        progress=[]
        result=oscillator_evolve(j,root,threading.Event(),lambda c,t:progress.append((c,t)))
        binary=(Path(root)/result["data"]["path"]).read_bytes()
        assert hashlib.sha256(binary).hexdigest()==result["data"]["sha256"]
        assert len(binary)==result["data"]["bytes"]
        assert progress[0]==(0,j["solver"]["samples"]) and progress[-1]==(j["solver"]["samples"],)*2
        return result,np.frombuffer(binary,dtype="<f8").reshape((result["data"]["rows"],-1))


class OscillatorDynamicsTests(unittest.TestCase):
    def test_complex_displacement_and_nonzero_origin(self):
        alpha = .7 + 1.1j
        outputs = []
        for backend in ("native", "qutip"):
            j = job(backend, {"type": "coherent", "alphaRe": alpha.real, "alphaIm": alpha.imag}, omega=1.3, cutoff=32)
            j["solver"].update(tStart=-4., tStop=1., samples=51)
            _, d = calculate(j)
            reference = alpha*np.exp(-1.3j*(d[:, 0]+4.))
            np.testing.assert_allclose(d[:, 1], np.sqrt(2)*reference.real, atol=3e-8)
            np.testing.assert_allclose(d[:, 2], np.sqrt(2)*reference.imag, atol=3e-8)
            np.testing.assert_allclose(d[:, 3:5], .5, atol=3e-8)
            np.testing.assert_allclose(d[:, 5], abs(alpha)**2, atol=3e-8)
            outputs.append(d)
        np.testing.assert_allclose(outputs[0], outputs[1], atol=3e-8)

    def test_coherent_motion_signs_period_and_independent_engines(self):
        results=[]
        for backend in ("native","qutip"):
            r,d=calculate(job(backend))
            tau=d[:,0]-7.
            np.testing.assert_allclose(d[:,1],np.sqrt(2)*np.cos(tau),atol=2e-8)
            np.testing.assert_allclose(d[:,2],-np.sqrt(2)*np.sin(tau),atol=2e-8)
            np.testing.assert_allclose(d[:,3:5],.5,atol=2e-8)
            np.testing.assert_allclose(d[:,5],1.,atol=2e-8)
            np.testing.assert_allclose(d[:,7],1.,atol=2e-8)
            self.assertLess(r["analysis"]["maxEnergyDrift"],1e-8)
            # Full wavefunction includes zero-point global phase: one period flips sign.
            np.testing.assert_allclose(d[-1,10:],-d[0,10:],atol=2e-8)
            results.append(d)
        np.testing.assert_allclose(results[0],results[1],atol=2e-8)

    def test_fock_density_stationary_but_complex_phase_evolves(self):
        for backend in ("native","qutip"):
            r,d=calculate(job(backend,{"type":"fock","index":2},cutoff=8))
            np.testing.assert_allclose(d[:,1:3],0.,atol=1e-10)
            np.testing.assert_allclose(d[:,3:5],2.5,atol=1e-10)
            np.testing.assert_allclose(d[:,5],2.,atol=1e-10)
            np.testing.assert_allclose(d[:,14]**2+d[:,15]**2,1.,atol=2e-8)
            self.assertEqual(r["analysis"]["omittedProbability"],0.)

    def test_projection_tail_and_cutoff_improvement_are_not_hidden(self):
        low,_=calculate(job(initial={"type":"coherent","alphaRe":2.,"alphaIm":0.},cutoff=8))
        high,_=calculate(job(initial={"type":"coherent","alphaRe":2.,"alphaIm":0.},cutoff=32))
        # Independent Poisson retained probability for mean occupation=4.
        import math
        retained=math.exp(-4)*sum(4**k/math.factorial(k) for k in range(8))
        self.assertAlmostEqual(low["analysis"]["projectionProbability"],retained,places=14)
        self.assertGreater(low["analysis"]["maxQError"],.1)
        self.assertGreater(low["analysis"]["omittedProbability"],.05)
        self.assertLess(high["analysis"]["maxQError"],1e-12)
        self.assertLess(high["analysis"]["maxNormDrift"],1e-14)

    def test_cancelled_work_never_publishes_partial_artifact(self):
        for backend in ("native","qutip"):
            with tempfile.TemporaryDirectory() as root:
                cancel=threading.Event()
                def progress(completed,total):
                    if completed>=3:
                        cancel.set()
                self.assertIsNone(oscillator_evolve(job(backend),root,cancel,progress))
                self.assertEqual(list(Path(root).iterdir()),[])

    def test_invalid_semantics_and_artifact_collision(self):
        with tempfile.TemporaryDirectory() as root:
            for bad in (job(initial={"type":"fock","index":7},cutoff=8),job(points=200),job(initial={"type":"coherent","alphaRe":2.,"alphaIm":2.})):
                with self.assertRaises(Exception):
                    oscillator_evolve(bad,root,threading.Event(),lambda *_:None)
            j=job()
            j["solver"]["tStop"]=j["solver"]["tStart"]
            with self.assertRaises(Exception):
                oscillator_evolve(j,root,threading.Event(),lambda *_:None)
            good=job()
            oscillator_evolve(good,root,threading.Event(),lambda *_:None)
            before=(Path(root)/"osc-motion.f64").read_bytes()
            with self.assertRaisesRegex(ValueError,"already exists"):
                oscillator_evolve(good,root,threading.Event(),lambda *_:None)
            self.assertEqual((Path(root)/"osc-motion.f64").read_bytes(),before)
