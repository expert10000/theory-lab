import copy
import unittest

from quantum_worker.contracts import validate
from quantum_worker.engines.ising_state import solve
from quantum_worker.engines.many_body import quspin_availability
from test_many_body import job


def request(engine="native", sites=4):
    return {"job":job(engine,sites),"source":{"runId":"run-source",
            "jobSha256":"a"*64,"resultSha256":"b"*64}}


class IsingStateTests(unittest.TestCase):
    def test_bounded_resolved_state_and_independent_invariants(self):
        result=solve(request())
        validate("quantum-ising-state",result)
        self.assertEqual(result["status"],"resolved")
        self.assertEqual(result["basis"],"z-up-is-0-msb-first")
        self.assertEqual(len(result["cutEntropy"]),3)
        self.assertEqual(len(result["connectedZCorrelation"]),4)
        self.assertLess(result["residual"],1e-8)
        for i in range(4):
            self.assertAlmostEqual(result["connectedZCorrelation"][i][i],
                                   1-result["siteMagnetization"][i]**2,delta=1e-10)
            for j in range(4):
                self.assertAlmostEqual(result["connectedZCorrelation"][i][j],
                                       result["connectedZCorrelation"][j][i],delta=1e-10)
        self.assertAlmostEqual(sum(entry["probability"] for entry in result["dominantBasis"])+
                               result["omittedProbability"],1,delta=1e-10)
        self.assertLessEqual(len(result["dominantBasis"]),16)

    def test_degenerate_state_withheld_and_bad_binding_refused(self):
        source=request(sites=2)
        source["job"]["model"]["parameters"].update({"transverse":0,"longitudinal":0})
        state=solve(source)
        self.assertEqual(state["status"],"degenerate")
        self.assertIsNone(state["connectedZCorrelation"])
        self.assertEqual(state["dominantBasis"],[])
        broken=copy.deepcopy(source)
        broken["source"]["resultSha256"]="not-a-hash"
        with self.assertRaises(ValueError):
            solve(broken)

    @unittest.skipUnless(quspin_availability()["available"],"optional QuSpin unavailable")
    def test_quspin_native_same_basis_and_observables(self):
        for sites in (2,4,6):
            native=solve(request(sites=sites))
            spin=solve(request("quspin",sites))
            self.assertEqual(native["status"],spin["status"])
            self.assertAlmostEqual(native["groundEnergy"],spin["groundEnergy"],delta=1e-9)
            if spin["status"]=="resolved":
                for a,b in zip(native["siteMagnetization"],spin["siteMagnetization"]):
                    self.assertAlmostEqual(a,b,delta=1e-8)
                for row_a,row_b in zip(native["connectedZCorrelation"],spin["connectedZCorrelation"]):
                    for a,b in zip(row_a,row_b):
                        self.assertAlmostEqual(a,b,delta=1e-8)
