"""Continuous gap, class-D Chern and withholding tests for the spinless toy."""
import math
import unittest

from quantum_worker.engines.ute2_topology import exact_minimum_energy, solve


def job(**changes):
    p={"mu":-2,"delta":.8,"mesh":12}
    p.update(changes)
    return {"schema":"quantum-ute2-topology-job/v1","jobId":"classd-python-test",
            "model":{"type":"square_lattice_class_d","parameters":p}}


class Ute2TopologyTests(unittest.TestCase):
    def test_continuous_minimum_against_dense_grid(self):
        for mu,delta in ((-5,.8),(-2,.8),(-.3,1.2),(.4,.3),(3,2),(0,0)):
            minimum=exact_minimum_energy(mu,delta)
            for ix in range(101):
                for iy in range(101):
                    kx,ky=-math.pi+2*math.pi*ix/100,-math.pi+2*math.pi*iy/100
                    energy=math.hypot(delta*math.sin(kx),delta*math.sin(ky),
                                      -2*(math.cos(kx)+math.cos(ky))-mu)
                    self.assertGreaterEqual(energy+1e-10,minimum)
        for mu in (-4,0,4):self.assertAlmostEqual(exact_minimum_energy(mu,.8),0)
        self.assertAlmostEqual(exact_minimum_energy(-2,.8),.8)

    def test_phases_and_transition_withholding(self):
        for mu,status,chern in ((-5,"defined",0),(-2,"defined",-1),(0,"gap_closed",None),
                                 (.001,"mesh_unresolved",None),(2,"defined",1),(4,"gap_closed",None),(5,"defined",0)):
            result=solve(job(mu=mu))
            self.assertEqual(result["invariantStatus"],status)
            self.assertEqual(result["chern"],chern)
            if status=="gap_closed":
                self.assertIsNone(result["curvatureIntegralFine"])
                self.assertEqual(result["bulkGap"],0)
            if status=="defined":
                self.assertEqual(result["coarseLinkChern"],result["fineLinkChern"])
                self.assertAlmostEqual(result["curvatureIntegralFine"],chern,delta=.03)
        for changes in ({"mu":5.1},{"delta":-1},{"delta":2.1},{"mesh":14}):
            with self.assertRaises(Exception):solve(job(**changes))
        self.assertEqual(solve(job(mu=2,delta=0))["invariantStatus"],"gap_closed")
        self.assertEqual(solve(job(mu=5,delta=0))["chern"],0)


if __name__=="__main__":unittest.main()
