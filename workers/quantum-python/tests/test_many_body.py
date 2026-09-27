import copy
import unittest

from quantum_worker.contracts import validate
from quantum_worker.engines.many_body import quspin_availability, solve
from quantum_worker.main import handle


def job(engine="native", sites=4):
    return {"schema": "quantum-job/v1", "jobId": "ising-test", "operation": "many_body",
            "engine": engine, "model": {"type": "ising_chain", "parameters": {
                "sites": sites, "interaction": 1, "transverse": 0.8,
                "longitudinal": 0.15, "boundary": "open"}}}


class ManyBodyTests(unittest.TestCase):
    def test_native_exact_limit_and_contract(self):
        simple = job(sites=2)
        simple["model"]["parameters"].update({"transverse": 0, "longitudinal": 0})
        result = solve(simple)
        validate("quantum-result", result)
        self.assertEqual(result["spectrum"]["lowEnergies"], [-1, -1, 1, 1])
        self.assertEqual(result["spectrum"]["gap"], 0)
        self.assertEqual(len(result["groundState"]["siteMagnetization"]), 2)
        invalid = job(sites=9)
        with self.assertRaises(Exception):
            solve(invalid)

    def test_native_periodic_chain_and_rpc(self):
        open_job = job(sites=5)
        periodic = copy.deepcopy(open_job)
        periodic["model"]["parameters"]["boundary"] = "periodic"
        a, b = solve(open_job), solve(periodic)
        self.assertLess(b["spectrum"]["lowEnergies"][0], a["spectrum"]["lowEnergies"][0])
        self.assertGreater(a["spectrum"]["gap"], 0)
        self.assertGreaterEqual(a["groundState"]["halfChainEntropy"], 0)
        response, _ = handle(__import__("json").dumps({"jsonrpc": "2.0", "id": "ising", "method": "quantum.run", "params": open_job}))
        self.assertEqual(response["result"]["operation"], "many_body")

    @unittest.skipUnless(quspin_availability()["available"], "optional QuSpin unavailable")
    def test_quspin_matches_independent_native_basis(self):
        for sites in (2, 4, 6):
            for boundary in ("open", "periodic"):
                native_job = job(sites=sites)
                native_job["model"]["parameters"]["boundary"] = boundary
                reference = solve(native_job)
                quspin_job = copy.deepcopy(native_job)
                quspin_job["engine"] = "quspin"
                result = solve(quspin_job)
                validate("quantum-result", result)
                self.assertLess(max(abs(a-b) for a,b in zip(result["spectrum"]["lowEnergies"],
                                                       reference["spectrum"]["lowEnergies"])), 1e-9)
                self.assertAlmostEqual(result["spectrum"]["gap"], reference["spectrum"]["gap"], delta=1e-9)
                self.assertLess(max(abs(a-b) for a,b in zip(result["groundState"]["siteMagnetization"],
                                                       reference["groundState"]["siteMagnetization"])), 1e-8)
                self.assertAlmostEqual(result["groundState"]["halfChainEntropy"],
                                       reference["groundState"]["halfChainEntropy"], delta=1e-8)
