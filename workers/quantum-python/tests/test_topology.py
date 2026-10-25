"""Independent SSH limiting cases and finite-size edge diagnostics."""
import unittest

from quantum_worker.engines.topology import solve, bbh_bulk_matrix, bbh_open_matrix, bbh_wilson_diagnostics, kitaev_bulk_matrix, kitaev_open_matrix


class KitaevChainTests(unittest.TestCase):
    def test_independent_bulk_spectrum_and_particle_hole(self):
        import numpy as np
        p = {"mu": .7, "hopping": 1., "pairing": .6, "cells": 16, "kPoints": 101}
        tau_x = np.array([[0, 1], [1, 0]])
        for k in (-np.pi, -.6, 0, .83, np.pi):
            h = kitaev_bulk_matrix(np, p, k)
            expected = np.hypot(-p["mu"] - 2*p["hopping"]*np.cos(k),
                                2*p["pairing"]*np.sin(k))
            np.testing.assert_allclose(np.linalg.eigvalsh(h), [-expected, expected])
            np.testing.assert_allclose(tau_x @ h.conj() @ tau_x,
                                       -kitaev_bulk_matrix(np, p, -k))
        self.assertTrue(np.allclose(h, h.conj().T))

    def test_open_boundary_particle_hole_and_finite_density(self):
        import numpy as np
        p = {"mu": 0., "hopping": 1., "pairing": 1., "cells": 12, "kPoints": 101}
        h = kitaev_open_matrix(np, p)
        n = p["cells"]
        swap = np.block([[np.zeros((n,n)), np.eye(n)], [np.eye(n), np.zeros((n,n))]])
        np.testing.assert_allclose(h, h.conj().T)
        np.testing.assert_allclose(swap @ h.conj() @ swap, -h)
        self.assertEqual(h[0,n-1], 0)
        self.assertEqual(h[0,2*n-1], 0)
        self.assertEqual(h[n-1,n], 0)
        job = {"schema":"quantum-job/v1","jobId":"kitaev-test","operation":"topology",
               "engine":"native","model":{"type":"kitaev_chain","parameters":p}}
        a = solve(job)["analysis"]
        self.assertEqual(a["kind"], "kitaev_chain")
        self.assertAlmostEqual(sum(a["finite"]["siteDensity"]), 1)
        self.assertGreater(a["finite"]["endWeight"], .9)
        self.assertEqual(len(a["kValues"]), 101)

    def test_bulk_closing_is_separate_from_finite_observation(self):
        p = {"mu": 2., "hopping": 1., "pairing": .8, "cells": 12, "kPoints": 101}
        job = {"schema":"quantum-job/v1","jobId":"kitaev-critical","operation":"topology",
               "engine":"native","model":{"type":"kitaev_chain","parameters":p}}
        critical = solve(job)["analysis"]
        self.assertTrue(critical["gapClosed"])
        self.assertAlmostEqual(critical["bulkGap"], 0)
        self.assertEqual(len(critical["finite"]["nearZeroEnergies"]), 2)
        job["model"]["parameters"]["mu"] = 0.
        gapped = solve(job)["analysis"]
        self.assertFalse(gapped["gapClosed"])
        self.assertGreater(gapped["bulkGap"], 1)


class BBHTests(unittest.TestCase):
    def test_nested_wilson_known_phases_and_grid_convergence(self):
        import numpy as np
        p = {"lambdaX": 1., "lambdaY": 1., "cells": 4, "grid": 11}
        for gamma, expected in ((0., .5), (.5, .5), (1.5, 0.)):
            values = []
            for grid in (11, 21):
                a = bbh_wilson_diagnostics(np, dict(p, gammaX=gamma, gammaY=gamma, grid=grid))
                self.assertTrue(a["defined"])
                self.assertGreater(a["bulkGapExact"], .1)
                self.assertGreater(a["wannierGapX"], .01)
                self.assertGreater(a["wannierGapY"], .01)
                self.assertEqual(len(a["wannierX"][0]), grid)
                for direction in ("nestedX", "nestedY"):
                    np.testing.assert_allclose(a[direction], [expected, expected], atol=1e-8)
                values.append(a["nestedX"][0])
            self.assertAlmostEqual(values[0], values[1], places=7)

    def test_local_occupied_u2_gauge_does_not_change_wilson_or_nested_values(self):
        import numpy as np
        p = {"gammaX": .5, "lambdaX": 1., "gammaY": .5, "lambdaY": 1.,
             "cells": 4, "grid": 11}
        def gauge(ix, iy):
            angle = .19 * ix + .23 * iy
            c, s = np.cos(angle), np.sin(angle)
            rotation = np.array([[c, s], [-s, c]], dtype=complex)
            return rotation @ np.diag(np.exp(1j * np.array([.31 * ix + .13 * iy,
                                                             -.17 * ix + .29 * iy])))
        reference = bbh_wilson_diagnostics(np, p)
        changed = bbh_wilson_diagnostics(np, p, gauge)
        for key in ("wannierX", "wannierY", "nestedX", "nestedY"):
            np.testing.assert_allclose(changed[key], reference[key], atol=1e-10)
        self.assertAlmostEqual(changed["wannierGapX"], reference["wannierGapX"], places=10)
        self.assertAlmostEqual(changed["wannierGapY"], reference["wannierGapY"], places=10)

    def test_closed_bulk_or_wannier_gap_has_no_sector_polarization(self):
        import numpy as np
        p = {"gammaX": 1., "lambdaX": 1., "gammaY": 1., "lambdaY": 1.,
             "cells": 4, "grid": 11}
        bulk = bbh_wilson_diagnostics(np, p)
        self.assertAlmostEqual(bulk["bulkGapExact"], 0)
        self.assertFalse(bulk["defined"])
        self.assertEqual(bulk["nestedX"], [None, None])
        p["gammaY"] = .5
        wannier = bbh_wilson_diagnostics(np, p)
        self.assertGreater(wannier["bulkGapExact"], .1)
        self.assertLess(wannier["wannierGapY"], 1e-8)
        self.assertFalse(wannier["defined"])
        self.assertEqual(wannier["nestedY"], [None, None])

    def test_saved_invariant_status_is_separate_from_finite_corner_weight(self):
        base = {"lambdaX": 1., "lambdaY": 1., "cells": 4, "grid": 11}
        job = {"schema": "quantum-job/v1", "jobId": "bbh-wilson",
               "operation": "topology", "engine": "native",
               "model": {"type": "bbh", "parameters": base}}
        for gx, gy, invariant, status in ((.5, .5, .5, "defined"),
                                           (1.5, 1.5, 0., "defined"),
                                           (1., 1., None, "bulk-gap-closed"),
                                           (1., .5, None, "wannier-gap-closed")):
            job["model"]["parameters"] = dict(base, gammaX=gx, gammaY=gy)
            a = solve(job)["analysis"]
            self.assertEqual(a["wilson"]["quadrupole"], invariant)
            self.assertEqual(a["wilson"]["status"], status)
            self.assertEqual(len(a["finite"]["midgapDensity"]), 16)

    def test_bulk_clifford_spectrum_and_open_boundary(self):
        import numpy as np
        p = {"gammaX": .5, "lambdaX": 1, "gammaY": .5, "lambdaY": 1,
             "grid": 11, "cells": 4}
        for kx, ky in ((0, 0), (.37, -1.1), (np.pi, np.pi)):
            h = bbh_bulk_matrix(np, p, kx, ky)
            e = np.sqrt(abs(p["gammaX"] + np.exp(1j*kx))**2 +
                        abs(p["gammaY"] + np.exp(1j*ky))**2)
            self.assertTrue(np.allclose(h, h.conj().T))
            self.assertTrue(np.allclose(np.linalg.eigvalsh(h), [-e, -e, e, e]))
        finite = bbh_open_matrix(np, p)
        self.assertEqual(finite.shape, (64, 64))
        self.assertTrue(np.allclose(finite, finite.conj().T))
        # No wrap hopping across either open boundary.
        self.assertTrue(np.allclose(finite[:4, 4*12:4*13], 0))
        self.assertTrue(np.allclose(finite[:4, 4*3:4*4], 0))
        job = {"schema":"quantum-job/v1","jobId":"bbh-test","operation":"topology",
               "engine":"native","model":{"type":"bbh","parameters":p}}
        a = solve(job)["analysis"]
        self.assertEqual(a["kind"], "bbh")
        self.assertEqual(len(a["bandEnergies"]), 4)
        self.assertEqual(len(a["bandEnergies"][0]), 121)
        self.assertAlmostEqual(sum(a["finite"]["midgapDensity"]), 1)
        self.assertGreater(a["finite"]["cornerWeight"], .5)

    def test_finite_localization_is_parameter_dependent(self):
        import numpy as np
        base = {"gammaX":0,"lambdaX":1,"gammaY":0,"lambdaY":1,"grid":11,"cells":4}
        corner = bbh_open_matrix(np, base)
        energies = np.linalg.eigvalsh(corner)
        self.assertTrue(np.allclose(energies[30:34], 0, atol=1e-10))
        trivial = dict(base, gammaX=1.5, gammaY=1.5)
        t = np.linalg.eigvalsh(bbh_open_matrix(np, trivial))
        self.assertGreater(np.min(np.abs(t)), .1)


def job(t1, t2, cells=16):
    return {"schema": "quantum-job/v1", "jobId": "topology-test", "operation": "topology",
            "engine": "native", "model": {"type": "ssh", "parameters":
            {"t1": t1, "t2": t2, "cells": cells, "kPoints": 101}}}


def qwz_job(mass, grid=21):
    return {"schema": "quantum-job/v1", "jobId": "qwz-test", "operation": "topology",
            "engine": "native", "model": {"type": "qwz", "parameters":
            {"mass": mass, "grid": grid}}}


def bhz_job(mass, grid=21):
    return {"schema": "quantum-job/v1", "jobId": "bhz-test", "operation": "topology",
            "engine": "native", "model": {"type": "bhz", "parameters":
            {"mass": mass, "grid": grid}}}


def general_bhz_job(mass=2, mixing=0, grid=11, **changes):
    parameters = {"A": 1, "B": 1, "C": 0, "D": 0, "M": mass, "R": mixing,
                  "grid": grid, "edgeCells": 8, "edgeSamples": 11, "continuumExtent": 1}
    parameters.update(changes)
    return {"schema": "quantum-job/v1", "jobId": "bhz-general-test", "operation": "topology",
            "engine": "native", "model": {"type": "bhz_general", "parameters": parameters}}


class SSHTests(unittest.TestCase):
    def test_topological_and_trivial_phases(self):
        top = solve(job(0.6, 1))["analysis"]
        trivial = solve(job(1, 0.6))["analysis"]
        self.assertEqual(top["winding"], 1)
        self.assertEqual(trivial["winding"], 0)
        self.assertAlmostEqual(top["bulkGap"], 0.8)
        self.assertAlmostEqual(trivial["bulkGap"], 0.8)
        self.assertGreater(top["edgeWeight"], 0.5)
        self.assertLess(trivial["edgeWeight"], 0.2)
        self.assertAlmostEqual(sum(top["edgeDensity"]), 1)

    def test_exact_dimer_and_critical_point(self):
        top = solve(job(0, 1))["analysis"]
        self.assertEqual(top["edgeEnergies"], [0, 0])
        self.assertEqual(top["winding"], 1)
        self.assertAlmostEqual(top["edgeWeight"], 1)
        critical = solve(job(1, 1))["analysis"]
        self.assertIsNone(critical["winding"])
        self.assertEqual(critical["bulkGap"], 0)

    def test_edge_splitting_shrinks_with_chain_length(self):
        short = solve(job(0.6, 1, 8))["analysis"]
        long = solve(job(0.6, 1, 20))["analysis"]
        self.assertLess(abs(long["edgeEnergies"][1]), abs(short["edgeEnergies"][1]))


class QWZTests(unittest.TestCase):
    def test_chern_phases_and_reversal(self):
        expected = [(-3, 0), (-1, -1), (1, 1), (3, 0)]
        for mass, chern in expected:
            with self.subTest(mass=mass):
                a = solve(qwz_job(mass))["analysis"]
                self.assertEqual(a["chern"], chern)
                self.assertEqual(a["latticeChern"], chern)
                self.assertTrue(a["meshResolved"])
                self.assertAlmostEqual(a["chernIntegral"], chern, places=4)
                self.assertEqual(len(a["berryCurvature"]), 21 ** 2)
                self.assertAlmostEqual(a["bulkGap"], 2)

    def test_gap_closures_are_undefined(self):
        for mass in (-2, 0, 2):
            with self.subTest(mass=mass):
                a = solve(qwz_job(mass))["analysis"]
                self.assertTrue(a["gapClosed"])
                self.assertEqual(a["bulkGap"], 0)
                self.assertIsNone(a["chern"])
                self.assertIsNone(a["latticeChern"])
                self.assertIsNone(a["chernIntegral"])
                self.assertEqual(a["berryCurvature"], [])

    def test_independent_curvature_quadrature_converges(self):
        coarse = solve(qwz_job(1.6, 11))["analysis"]
        fine = solve(qwz_job(1.6, 31))["analysis"]
        self.assertEqual(coarse["chern"], fine["chern"])
        self.assertLess(abs(fine["chernIntegral"] - fine["chern"]),
                        abs(coarse["chernIntegral"] - coarse["chern"]) / 100)
        self.assertLess(abs(fine["chernIntegral"] - fine["chern"]), 1e-5)

    def test_coarse_mesh_near_transition_is_not_mislabelled(self):
        coarse = solve(qwz_job(0.01, 11))["analysis"]
        fine = solve(qwz_job(0.01, 31))["analysis"]
        self.assertEqual(coarse["latticeChern"], -1)
        self.assertEqual(coarse["analyticChern"], 1)
        self.assertIsNone(coarse["chern"])
        self.assertFalse(coarse["meshResolved"])
        self.assertEqual(fine["chern"], 1)
        self.assertTrue(fine["meshResolved"])

    def test_protocol_result_stays_below_worker_line_limit(self):
        import json
        for mass in (-6, -2, -1.99, -1, 0, 0.01, 1, 1.99, 2, 6):
            result = solve(qwz_job(mass, 31))
            self.assertLess(len(json.dumps(result).encode("utf-8")), 65536)
            a = result["analysis"]
            self.assertEqual(len(a["bandKValues"]), 31)
            self.assertEqual(len(a["upperBand"]), 31**2)
            self.assertEqual(a["lowerBand"], [-v for v in a["upperBand"]])


class BHZTests(unittest.TestCase):
    def test_independent_four_by_four_eigenspectrum_and_time_reversal(self):
        import numpy as np
        from quantum_worker.engines.topology import bhz_analysis
        mass, grid = 2.0, 15
        a = bhz_analysis(np, {"mass": mass, "grid": grid})
        for x, y in ((0, 0), (3, 9), (7, 7), (14, 12)):
            kx, ky = a["bandKValues"][x], a["bandKValues"][y]
            dx, dy = np.sin(kx), -np.sin(ky)
            dz = mass - 2 * (2 - np.cos(kx) - np.cos(ky))
            h = np.array([[dz, dx - 1j * dy], [dx + 1j * dy, -dz]])
            partner = np.array([[dz, -dx - 1j * dy], [-dx + 1j * dy, -dz]])
            full = np.block([[h, np.zeros((2, 2))], [np.zeros((2, 2)), partner]])
            actual = np.linalg.eigvalsh(full)
            stored = [band[x * grid + y] for band in a["bandEnergies"]]
            np.testing.assert_allclose(stored, actual, atol=1e-12)
            np.testing.assert_allclose(partner, np.conj(np.array([[dz, -dx + 1j * dy], [-dx - 1j * dy, -dz]])))

    def test_mass_phases_partner_cancellation_and_gap_closures(self):
        for mass, block, z2 in ((-1, 0, 0), (2, 1, 1), (6, -1, 1), (9, 0, 0)):
            with self.subTest(mass=mass):
                a = solve(bhz_job(mass, 15))["analysis"]
                self.assertEqual((a["blockChern"], a["partnerChern"], a["z2"]), (block, -block, z2))
                self.assertTrue(a["meshResolved"])
        for mass in (0, 4, 8):
            with self.subTest(closure=mass):
                a = solve(bhz_job(mass, 15))["analysis"]
                self.assertTrue(a["gapClosed"])
                self.assertEqual(a["bulkGap"], 0)
                self.assertIsNone(a["z2"])
        for mass in (0.01, 3.99):
            a = solve(bhz_job(mass, 11))["analysis"]
            if not a["meshResolved"]:
                self.assertIsNone(a["z2"])

    def test_bounded_worker_line_and_contract_refusals(self):
        import json
        from quantum_worker.contracts import validate
        result = solve(bhz_job(2, 21))
        self.assertLess(len(json.dumps(result).encode()), 65536)
        bad = bhz_job(2, 22)
        with self.assertRaises(Exception):
            validate("quantum-job", bad)
        result["analysis"]["z2"] = 2
        with self.assertRaises(Exception):
            validate("quantum-result", result)


class GeneralBHZTests(unittest.TestCase):
    @staticmethod
    def independent_matrix(kx, ky, p, continuum=False):
        import numpy as np
        sx = np.array([[0, 1], [1, 0]], complex)
        sy = np.array([[0, -1j], [1j, 0]], complex)
        sz = np.diag([1, -1]).astype(complex)
        identity = np.eye(2, dtype=complex)
        x, y = (kx, ky) if continuum else (np.sin(kx), np.sin(ky))
        q2 = kx*kx+ky*ky if continuum else 2*(2-np.cos(kx)-np.cos(ky))
        up = (p["C"]-p["D"]*q2)*identity+p["A"]*x*sx-p["A"]*y*sy+(p["M"]-p["B"]*q2)*sz
        down = (p["C"]-p["D"]*q2)*identity-p["A"]*x*sx-p["A"]*y*sy+(p["M"]-p["B"]*q2)*sz
        mix = p["R"]*(x-1j*y)*sx
        return np.block([[up, mix], [mix.conj().T, down]])

    def test_bulk_spectrum_eigenvectors_symmetries_and_ribbon_residual(self):
        import numpy as np
        p = general_bhz_job(mixing=.2, A=1.3, B=.8, C=.3, D=.2)["model"]["parameters"]
        a = solve(general_bhz_job(mixing=.2, A=1.3, B=.8, C=.3, D=.2))["analysis"]
        for domain in ("lattice", "continuum"):
            ks = a[domain + "KValues"]
            bands = a[domain + "BandEnergies"]
            for i, j in ((0, 1), (3, 7), (10, 10)):
                expected = np.linalg.eigvalsh(self.independent_matrix(ks[i], ks[j], p, domain=="continuum"))
                np.testing.assert_allclose([band[i*len(ks)+j] for band in bands], expected, atol=1e-10)
        time_reversal = np.kron(np.array([[0, 1], [-1, 0]], complex), np.eye(2))
        inversion = np.kron(np.eye(2), np.diag([1, -1]))
        for kx, ky in ((.4, .7), (1.2, -.8)):
            h = self.independent_matrix(kx, ky, p)
            np.testing.assert_allclose(h, h.conj().T, atol=1e-12)
            np.testing.assert_allclose(time_reversal @ h.conj() @ time_reversal.conj().T,
                                       self.independent_matrix(-kx, -ky, p), atol=1e-12)
            np.testing.assert_allclose(inversion @ h @ inversion,
                                       self.independent_matrix(-kx, -ky, p), atol=1e-12)
        kx = a["edge"]["kValues"][a["edge"]["selectedKIndex"]]
        h0 = self.independent_matrix(kx, 0, p)
        hpi = self.independent_matrix(kx, np.pi, p)
        hp = self.independent_matrix(kx, np.pi/2, p)
        hm = self.independent_matrix(kx, -np.pi/2, p)
        onsite = (h0+hpi)/2
        hopping = (h0-hpi-1j*(hp-hm))/4
        n = p["edgeCells"]
        ribbon = np.kron(np.eye(n), onsite)+np.kron(np.diag(np.ones(n-1), 1), hopping)+np.kron(np.diag(np.ones(n-1), -1), hopping.conj().T)
        for state in a["edge"]["states"]:
            vector = np.array([complex(*pair) for pair in state["amplitudes"]])
            self.assertLess(np.linalg.norm(ribbon@vector-state["energy"]*vector), 1e-10)
            self.assertAlmostEqual(np.linalg.norm(vector), 1, places=10)

    def test_phase_and_closure_and_protocol_limits(self):
        import json
        from quantum_worker.contracts import validate
        for mass, expected in ((-1, 0), (2, 1), (6, 1), (9, 0)):
            for mixing in (0, .2):
                with self.subTest(mass=mass, mixing=mixing):
                    a = solve(general_bhz_job(mass, mixing, 21))["analysis"]
                    self.assertEqual(a["z2"], expected)
                    self.assertTrue(a["meshResolved"])
        for mass in (0, 4, 8):
            a = solve(general_bhz_job(mass))["analysis"]
            self.assertTrue(a["gapClosed"])
            self.assertIsNone(a["z2"])
        result = solve(general_bhz_job(2, .2, 21, edgeCells=16, edgeSamples=21))
        self.assertLess(len(json.dumps({"jsonrpc":"2.0","id":"probe","result":result}).encode()), 262144)
        validate("quantum-result", result)
        with self.assertRaises(Exception):
            validate("quantum-job", general_bhz_job(2, .9))


if __name__ == "__main__":
    unittest.main()
