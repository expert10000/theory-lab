"""Hermiticity, PHS, localization and width checks for the finite class-D toy strip."""
import numpy as np
import unittest

from quantum_worker.engines.ute2_edge import solve,strip_matrix


def job(mu=-2,chern=-1,width=12):
    return {"schema":"quantum-ute2-edge-job/v1","jobId":"edge-python-test",
            "source":{"runId":"run-source","resultSha256":"a"*64},
            "model":{"type":"square_lattice_class_d","parameters":{"mu":mu,"delta":.8,"mesh":12}},
            "bulkChern":chern,"width":width}


class Ute2EdgeTests(unittest.TestCase):
    def test_strip_matrix_hermiticity_and_particle_hole(self):
        for mu,ky in ((-2,0),(2,-np.pi)):
            matrix=strip_matrix(np,mu,.8,12,ky)
            self.assertLess(np.linalg.norm(matrix-matrix.conj().T),1e-12)
            swap=np.kron(np.eye(12),np.array([[0,1],[1,0]]))
            self.assertLess(np.linalg.norm(swap@matrix.conj()@swap+matrix),1e-12)
            energies=np.linalg.eigvalsh(matrix)
            self.assertLess(max(abs(energies+energies[::-1])),1e-12)

    def test_localization_width_and_trivial_reference(self):
        for mu,chern,expected in ((-2,-1,"localized_in_gap"),(2,1,"localized_in_gap"),(5,0,"not_resolved")):
            result=solve(job(mu,chern))
            self.assertEqual(result["edgeStatus"],expected)
            coarse,fine=result["widths"]
            for row in (coarse,fine):
                self.assertAlmostEqual(sum(row["pairDensity"]),1)
                self.assertLess(row["maxResidual"],1e-10)
                self.assertGreater(row["particleHoleOverlap"],.999)
            if chern:
                self.assertGreater(coarse["boundaryWeight"],.8)
                self.assertLess(abs(fine["energies"][fine["width"]]),abs(coarse["energies"][coarse["width"]]))
            else:self.assertLess(fine["boundaryWeight"],.1)
        for width in (10,21):
            with self.assertRaises(Exception):solve(job(width=width))


if __name__=="__main__":unittest.main()
