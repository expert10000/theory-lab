import tempfile
import threading
from pathlib import Path
import unittest
import numpy as np
from quantum_worker.engines.oscillator_drive import oscillator_drive
from test_oscillator_dynamics import job as free_job

def job(backend="native", initial=None, **parameters):
    j=free_job(backend,initial)
    j["operation"]="oscillator_drive"
    j["model"]={"type":"driven_harmonic_oscillator","parameters":{**j["model"]["parameters"],"epsilonRe":.2,"epsilonIm":0.,"driveFrequency":1.,**parameters}}
    return j

def calculate(j):
    with tempfile.TemporaryDirectory() as root:
        r=oscillator_drive(j,root,threading.Event(),lambda *_:None)
        d=np.frombuffer((Path(root)/r["data"]["path"]).read_bytes(),dtype="<f8").reshape((r["data"]["rows"],-1))
        return r,d

class DrivenOscillatorTests(unittest.TestCase):
    def test_resonant_displacement_and_independent_engines(self):
        datasets=[]
        for backend in ("native","qutip"):
            j=job(backend,{"type":"coherent","alphaRe":0.,"alphaIm":0.})
            r,d=calculate(j)
            tau=d[:,0]-7.
            beta=-.2j*tau*np.exp(-1j*tau)
            np.testing.assert_allclose(d[:,1],np.sqrt(2)*beta.real,atol=3e-8)
            np.testing.assert_allclose(d[:,2],np.sqrt(2)*beta.imag,atol=3e-8)
            np.testing.assert_allclose(d[:,5],.04*tau**2,atol=3e-8)
            np.testing.assert_allclose(d[:,3:5],.5,atol=3e-8)
            np.testing.assert_allclose(d[:,11],.5+.04*tau**2,atol=3e-8)
            np.testing.assert_allclose(d[:,12],.08*tau,atol=3e-8)
            self.assertLess(r["analysis"]["maxWorkBalanceError"],3e-8)
            self.assertEqual(r["analysis"]["energyOffset"],.5)
            datasets.append(d)
        np.testing.assert_allclose(datasets[0],datasets[1],atol=3e-8)

    def test_complex_detuned_fock_displacement_and_constant_drive_energy(self):
        for backend in ("native","qutip"):
            j=job(backend,{"type":"fock","index":2},omega=1.3,driveFrequency=.8,epsilonRe=.15,epsilonIm=.1,cutoff=32)
            r,d=calculate(j)
            tau=d[:,0]-7.
            displacement=(.15+.1j)*(np.exp(-1.3j*tau)-np.exp(-.8j*tau))/.5
            np.testing.assert_allclose(d[:,1],np.sqrt(2)*displacement.real,atol=3e-8)
            np.testing.assert_allclose(d[:,2],np.sqrt(2)*displacement.imag,atol=3e-8)
            np.testing.assert_allclose(d[:,5],2+abs(displacement)**2,atol=3e-8)
            np.testing.assert_allclose(d[:,3:5],2.5,atol=3e-8)
            _,constant=calculate(job(backend,driveFrequency=0.,epsilonIm=.1))
            np.testing.assert_allclose(constant[:,11],constant[0,11],atol=3e-8)
            np.testing.assert_allclose(constant[:,12],0.,atol=1e-12)

    def test_zero_drive_preserves_free_phase_and_near_resonance(self):
        from test_oscillator_dynamics import calculate as free_calculate
        for backend in ("native","qutip"):
            _,d=calculate(job(backend,epsilonRe=0.))
            _,free=free_calculate(free_job(backend))
            np.testing.assert_allclose(d[:,:10],free[:,:10],atol=3e-8)
            np.testing.assert_allclose(d[:,13:],free[:,10:],atol=3e-8)
            _,near=calculate(job(backend,driveFrequency=1.+1e-10))
            _,exact=calculate(job(backend))
            np.testing.assert_allclose(near,exact,atol=3e-8)

    def test_cutoff_error_is_reported_and_improves(self):
        low,_=calculate(job(initial={"type":"coherent","alphaRe":0.,"alphaIm":0.},epsilonRe=.4,cutoff=8))
        high,_=calculate(job(initial={"type":"coherent","alphaRe":0.,"alphaIm":0.},epsilonRe=.4,cutoff=48))
        self.assertGreater(low["analysis"]["maxBoundaryOccupation"],.1)
        self.assertGreater(low["analysis"]["maxNumberError"],.5)
        self.assertLess(high["analysis"]["maxNumberError"],1e-8)

    def test_cancel_validation_and_collision(self):
        for backend in ("native","qutip"):
            with tempfile.TemporaryDirectory() as root:
                cancel=threading.Event()
                def progress(c,t):
                    if c>=3: cancel.set()
                self.assertIsNone(oscillator_drive(job(backend),root,cancel,progress))
                self.assertEqual(list(Path(root).iterdir()),[])
                for bad in (job(epsilonRe=.5,epsilonIm=.5),job(driveFrequency=-1),job(omega=.01),job(points=200)):
                    with self.assertRaises(Exception):oscillator_drive(bad,root,threading.Event(),lambda *_:None)
                oscillator_drive(job(backend),root,threading.Event(),lambda *_:None)
                before=(Path(root)/"osc-motion.f64").read_bytes()
                with self.assertRaisesRegex(ValueError,"already exists"):oscillator_drive(job(backend),root,threading.Event(),lambda *_:None)
                self.assertEqual((Path(root)/"osc-motion.f64").read_bytes(),before)
