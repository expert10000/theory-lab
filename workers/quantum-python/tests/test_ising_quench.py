import copy
import unittest

from quantum_worker.contracts import validate
from quantum_worker.engines.ising_quench import solve as quench
from quantum_worker.engines.many_body import solve as stationary


def request():
    job = {"schema":"quantum-job/v1","jobId":"quench-source","operation":"many_body","engine":"native",
           "model":{"type":"ising_chain","parameters":{"sites":3,"interaction":1,
                    "transverse":0.7,"longitudinal":0.2,"boundary":"open"}}}
    result = stationary(job)
    return {"job":job,"sourceResult":result,
            "source":{"runId":result["runId"],"jobSha256":"a"*64,"resultSha256":"b"*64},
            "quench":{"targetTransverse":1.3,"duration":4,"samples":21}}


class IsingQuenchTests(unittest.TestCase):
    def test_saved_ground_state_quench_conserves_target_energy(self):
        payload = request()
        result = quench(payload)
        validate("quantum-ising-quench", result)
        self.assertEqual(len(result["rows"]),21)
        self.assertLess(max(abs(a-b) for a,b in zip(result["rows"][0]["siteMagnetization"],
                         payload["sourceResult"]["groundState"]["siteMagnetization"])),1e-10)
        self.assertLess(result["maximumNormDrift"],1e-10)
        self.assertLess(result["maximumEnergyDrift"],1e-10)
        self.assertGreater(abs(result["rows"][10]["siteMagnetization"][0]-
                               result["rows"][0]["siteMagnetization"][0]),1e-4)

    def test_degenerate_initial_ground_state_and_source_mismatch_are_refused(self):
        payload = request()
        forged = copy.deepcopy(payload)
        forged["sourceResult"]["spectrum"]["gap"] += 0.1
        with self.assertRaisesRegex(ValueError,"Initial spectrum"):
            quench(forged)
        degenerate = copy.deepcopy(payload)
        degenerate["job"]["model"]["parameters"].update({"transverse":0,"longitudinal":0})
        degenerate["sourceResult"] = stationary(degenerate["job"])
        degenerate["source"]["runId"] = degenerate["sourceResult"]["runId"]
        with self.assertRaisesRegex(ValueError,"Degenerate initial"):
            quench(degenerate)

    def test_grid_bounds_and_extra_fields_are_refused(self):
        payload = request()
        for changed in ({"samples":102},{"duration":0},{"targetTransverse":11},
                        {"samples":21,"duration":4,"targetTransverse":1,"python":"exec"}):
            invalid = copy.deepcopy(payload)
            invalid["quench"].update(changed)
            with self.assertRaises(ValueError):
                quench(invalid)
