import copy
import math
import tempfile
import threading
from pathlib import Path
import unittest
from unittest.mock import patch
import numpy as np
from quantum_worker.contracts import validate
from quantum_worker.engines.oscillator_pulse import oscillator_pulse
from test_oscillator_drive import job as driven_job


def job(backend="native", initial=None, **parameters):
    j = driven_job(backend, initial or {"type":"coherent", "alphaRe":0., "alphaIm":0.})
    j["operation"] = "oscillator_pulse"
    j["model"]["parameters"].update({"envelope":"gaussian", "pulseWidth":1., "pulseCenter":5., **parameters})
    j["solver"].update({"tStart":7., "tStop":17., "samples":201, "maxStep":.02})
    return j


def calculate(j):
    with tempfile.TemporaryDirectory() as root:
        r = oscillator_pulse(j, root, threading.Event(), lambda *_:None)
        return r, np.frombuffer((Path(root)/r["data"]["path"]).read_bytes(), dtype="<f8").reshape((r["data"]["rows"],-1))


class PulsedOscillatorTests(unittest.TestCase):
    def test_integration_budget_failure_leaves_no_partial_artifact(self):
        for backend in ("native", "qutip"):
            with tempfile.TemporaryDirectory() as root:
                with patch("quantum_worker.engines.oscillator_pulse.MAX_PULSE_EVALUATIONS", 10):
                    with self.assertRaisesRegex(ValueError, "evaluation budget"):
                        oscillator_pulse(job(backend), root, threading.Event(), lambda *_:None)
                self.assertEqual(list(Path(root).iterdir()), [])

    def test_resonant_gaussian_integral_and_independent_engines(self):
        datasets = []
        for backend in ("native", "qutip"):
            r, d = calculate(job(backend))
            tau = d[:,0]-7
            area = math.sqrt(math.pi/2)*(np.vectorize(math.erf)((tau-5)/math.sqrt(2))+math.erf(5/math.sqrt(2)))
            beta = -.2j*area*np.exp(-1j*tau)
            np.testing.assert_allclose(d[:,1], math.sqrt(2)*beta.real, atol=3e-8)
            np.testing.assert_allclose(d[:,2], math.sqrt(2)*beta.imag, atol=3e-8)
            np.testing.assert_allclose(d[:,5], abs(beta)**2, atol=3e-8)
            np.testing.assert_allclose(d[:,3:5], .5, atol=3e-8)
            self.assertAlmostEqual(r["analysis"]["startEnvelope"], math.exp(-12.5))
            self.assertAlmostEqual(r["analysis"]["endEnvelope"], math.exp(-12.5))
            datasets.append(d)
        np.testing.assert_allclose(*datasets, atol=3e-8)

    def test_complex_detuned_fock_and_narrow_pulse_between_output_samples(self):
        for parameters in ({"omega":1.3,"driveFrequency":.7,"epsilonRe":.15,"epsilonIm":.2},
                           {"pulseWidth":.05,"pulseCenter":4.73,"epsilonRe":.5}):
            outputs = []
            for backend in ("native", "qutip"):
                j = job(backend, {"type":"fock","index":2}, **parameters)
                if parameters.get("pulseWidth") == .05:
                    j["solver"].update({"samples":3,"maxStep":.005})
                r, d = calculate(j)
                self.assertLess(r["analysis"]["maxQError"], 3e-8)
                self.assertLess(r["analysis"]["maxNumberError"], 3e-8)
                outputs.append(d)
            np.testing.assert_allclose(*outputs, atol=3e-8)
            if parameters.get("pulseWidth") == .05:
                self.assertGreater(outputs[0][-1,5]-2, .003)

    def test_zero_drive_free_phase_and_time_origin(self):
        from test_oscillator_dynamics import calculate as free_calculate
        for backend in ("native", "qutip"):
            j = job(backend, {"type":"coherent","alphaRe":.7,"alphaIm":.3}, epsilonRe=0.)
            _, pulse = calculate(j)
            free = copy.deepcopy(j)
            free["operation"] = "oscillator_evolve"
            free["model"] = {"type":"harmonic_oscillator", "parameters":{k:v for k,v in j["model"]["parameters"].items() if k in ("omega","cutoff","extent","points")}}
            del free["solver"]["maxStep"]
            _, data = free_calculate(free)
            np.testing.assert_allclose(pulse[:,:10], data[:,:10], atol=3e-8)
            np.testing.assert_allclose(pulse[:,13:], data[:,10:], atol=3e-8)
            shifted = job(backend, epsilonRe=.2, epsilonIm=.1)
            _, a = calculate(shifted)
            shifted["solver"].update({"tStart":-3.,"tStop":7.})
            _, b = calculate(shifted)
            np.testing.assert_allclose(a[:,1:], b[:,1:], atol=3e-8)

    def test_envelope_derivative_power_work_sampling_and_step_refinement(self):
        j = job(initial={"type":"coherent","alphaRe":.7,"alphaIm":.4}, epsilonIm=.1, driveFrequency=.7)
        r, data = calculate(j)
        tau = data[:,0]-7
        eps = (.2+.1j)*np.exp(-.5*(tau-5)**2)*np.exp(-.7j*tau)
        derivative = eps*(-(tau-5)-.7j)
        np.testing.assert_allclose(data[:,12], math.sqrt(2)*(derivative.real*data[:,1]+derivative.imag*data[:,2]), atol=1e-10)
        j["solver"]["samples"] = 801
        fine, _ = calculate(j)
        self.assertLess(fine["analysis"]["maxWorkBalanceError"], r["analysis"]["maxWorkBalanceError"]/8)
        j["solver"].update({"samples":201,"maxStep":.01})
        _, refined = calculate(j)
        np.testing.assert_allclose(data, refined, atol=3e-8)

    def test_cutoff_error_and_coherent_initial_projection_are_distinct(self):
        low, _ = calculate(job(initial={"type":"coherent","alphaRe":1.8,"alphaIm":0.}, cutoff=8, pulseWidth=1.5, epsilonRe=.5))
        high, _ = calculate(job(initial={"type":"coherent","alphaRe":1.8,"alphaIm":0.}, cutoff=48, pulseWidth=1.5, epsilonRe=.5))
        self.assertGreater(low["analysis"]["omittedProbability"], .01)
        self.assertGreater(low["analysis"]["maxBoundaryOccupation"], .01)
        self.assertLess(high["analysis"]["maxNumberError"], 1e-7)

    def test_bounds_cancel_and_collision(self):
        for backend in ("native", "qutip"):
            with tempfile.TemporaryDirectory() as root:
                cancel = threading.Event()
                def progress(c, total):
                    if c >= 3: cancel.set()
                self.assertIsNone(oscillator_pulse(job(backend), root, cancel, progress))
                self.assertEqual(list(Path(root).iterdir()), [])
                for field, value in (("pulseWidth",.001),("pulseCenter",11),("envelope","code")):
                    bad = job(**{field:value})
                    with self.assertRaises(Exception):validate("quantum-job",bad)
                bad = job(pulseWidth=.05)
                with self.assertRaises(ValueError):validate("quantum-job",bad)
                oscillator_pulse(job(backend), root, threading.Event(), lambda *_:None)
                before = (Path(root)/"osc-motion.f64").read_bytes()
                with self.assertRaisesRegex(ValueError,"already exists"):
                    oscillator_pulse(job(backend), root, threading.Event(), lambda *_:None)
                self.assertEqual((Path(root)/"osc-motion.f64").read_bytes(), before)
