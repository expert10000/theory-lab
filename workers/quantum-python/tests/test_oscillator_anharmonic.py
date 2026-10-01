import unittest
from quantum_worker.engines.oscillator_anharmonic import solve


def job(engine="native", coupling=.05, cutoff=20):
    return {"schema":"quantum-job/v1","jobId":"quartic-test","operation":"oscillator_anharmonic",
            "engine":engine,"model":{"type":"anharmonic_oscillator",
            "parameters":{"mass":1,"omega":1,"lambda":coupling,"cutoff":cutoff,"levels":5}}}


class AnharmonicTests(unittest.TestCase):
    def test_harmonic_limit_and_positive_quartic_shift(self):
        for backend in ("native", "qutip"):
            harmonic = solve(job(backend, 0))
            self.assertLess(max(abs(value-(i+.5)) for i,value in enumerate(harmonic["spectrum"]["energies"])),1e-10)
            quartic = solve(job(backend))
            self.assertGreater(quartic["spectrum"]["energies"][0], .5)
            self.assertGreater(quartic["analysis"]["groundX4"], 0)
            self.assertAlmostEqual(quartic["analysis"]["groundParity"], 1, places=8)

    def test_independent_engines_agree_and_cutoff_sensitivity_is_bounded(self):
        native, qutip = solve(job("native")), solve(job("qutip"))
        for a,b in zip(native["spectrum"]["energies"],qutip["spectrum"]["energies"]):
            self.assertAlmostEqual(a,b,places=9)
        refined=solve(job("native",cutoff=28))
        for a,b in zip(native["spectrum"]["energies"],refined["spectrum"]["energies"]):
            self.assertLess(abs(a-b),1e-5)


if __name__ == "__main__":
    unittest.main()
