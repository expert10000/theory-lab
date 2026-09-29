import json
import unittest
import numpy as np

from quantum_worker.engines.oscillator import solve
from quantum_worker.main import capabilities, handle


def job(engine="native", **parameters):
    return {"schema": "quantum-job/v1", "jobId": "oscillator-test", "operation": "oscillator",
            "engine": engine, "model": {"type": "harmonic_oscillator", "parameters": {
                "omega": 1., "cutoff": 16, "levels": 6, "state": 0,
                "extent": 8., "points": 201, **parameters}}}


class OscillatorTests(unittest.TestCase):
    def test_zero_point_ladder_quadratures_and_cutoff(self):
        for backend in ("native", "qutip"):
            for omega, n in ((.01, 0), (1.7, 1), (20., 10)):
                result = solve(job(backend, omega=omega, state=n))
                np.testing.assert_allclose(result["spectrum"]["energies"], omega * (np.arange(6) + .5), atol=1e-12)
                for key in ("qVariance", "pVariance"):
                    self.assertAlmostEqual(result["analysis"][key], n+.5, places=12)
                self.assertLess(result["analysis"]["cutoffDrift"], 1e-12)
                self.assertEqual(result["analysis"]["boundaryOccupation"], 0)

    def test_independent_low_state_densities_and_parity(self):
        for n in (0, 1, 2):
            r = solve(job(state=n))
            q = np.array(r["state"]["q"])
            ground = np.pi**(-.25) * np.exp(-q*q/2)
            expected = [ground, np.sqrt(2)*q*ground, (2*q*q-1)/np.sqrt(2)*ground][n]
            np.testing.assert_allclose(r["state"]["amplitude"], expected, atol=1e-14)
            np.testing.assert_allclose(r["state"]["density"], expected**2, atol=1e-14)
            np.testing.assert_allclose(r["state"]["amplitude"][::-1], (-1)**n*expected, atol=1e-14)
            self.assertAlmostEqual(r["analysis"]["gridProbability"], 1, places=10)
        self.assertLess(solve(job(state=10, extent=2))["analysis"]["gridProbability"], .5)

    def test_rpc_validation_and_bounded_wire_size(self):
        self.assertIn("oscillator", capabilities()["operations"])
        request = {"jsonrpc": "2.0", "id": "1", "method": "quantum.run", "params": job(points=401, levels=12, cutoff=64, state=10, extent=12, omega=20)}
        response, stop = handle(json.dumps(request).encode())
        self.assertFalse(stop)
        self.assertEqual(response["result"]["operation"], "oscillator")
        self.assertLess(len(json.dumps(response, allow_nan=False).encode()), 65536)
        for change in ({"state":15}, {"points":200}, {"levels":12,"cutoff":8}):
            request["params"] = job(**change)
            response, _ = handle(json.dumps(request).encode())
            self.assertEqual(response["error"]["code"], -32602)
