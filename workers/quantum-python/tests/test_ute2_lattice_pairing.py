"""Independent algebra, symmetry, node and protocol checks for lattice pairing toy."""
import json
import math
import unittest

from quantum_worker.engines.lattice_pairing import solve


def job(**changes):
    p={"mu":-2,"amplitudeX":.8,"amplitudeY":.8,"relativePhaseRad":math.pi/2,"gridSize":16}
    p.update(changes)
    return {"schema":"quantum-lattice-pairing-job/v1","jobId":"lattice-python-test",
            "model":{"type":"square_lattice_px_py","parameters":p}}


class LatticePairingTests(unittest.TestCase):
    def test_even_dispersion_odd_gap_particle_hole_and_reference(self):
        n=16
        result=solve(job(relativePhaseRad=.7))
        rows=result["samples"]
        for ix in range(n):
            for iy in range(n):
                row=rows[ix*n+iy]
                inverse=rows[((n-ix)%n)*n+(n-iy)%n]
                self.assertAlmostEqual(row["xi"],inverse["xi"])
                self.assertAlmostEqual(row["deltaRe"],-inverse["deltaRe"])
                self.assertAlmostEqual(row["deltaIm"],-inverse["deltaIm"])
                self.assertAlmostEqual(row["eMinus"],-row["ePlus"])
                self.assertAlmostEqual(row["ePlus"]**2,row["xi"]**2+row["gapMagnitude"]**2)
                self.assertAlmostEqual(row["electronWeight"]+row["holeWeight"],1)
        row=rows[3*n*n//4+n//2]
        self.assertAlmostEqual(row["xi"],0)
        self.assertAlmostEqual(row["ePlus"],.8)
        self.assertAlmostEqual(row["electronWeight"],.5)
        self.assertAlmostEqual(row["holeWeight"],.5)
        sx,sy=math.sin(row["kx"]),math.sin(row["ky"])
        predicted=.8**2*sx**2+.8**2*sy**2+2*.8**2*math.cos(.7)*sx*sy
        self.assertAlmostEqual(row["gapMagnitude"]**2,predicted)

    def test_nodes_phase_masks_and_bounds(self):
        closed=solve(job(mu=0))
        n=16
        node=closed["samples"][n//2]
        self.assertTrue(node["node"])
        self.assertIsNone(node["phaseRad"])
        self.assertIsNone(node["electronWeight"])
        self.assertIsNone(node["holeWeight"])
        self.assertTrue(closed["sampledGapClosed"])
        line=solve(job(mu=0,relativePhaseRad=0))
        self.assertTrue(line["samples"][3*n*n//4+n//4]["node"])
        for changes in ({"mu":5.1},{"amplitudeX":-1},{"amplitudeY":2.1},{"relativePhaseRad":4},{"gridSize":32}):
            with self.assertRaises(Exception):solve(job(**changes))
        maximum=solve(job(gridSize=24))
        self.assertLess(len(json.dumps({"jsonrpc":"2.0","id":"1","result":maximum})),262144)


if __name__=="__main__":unittest.main()
