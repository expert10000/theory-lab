"""Independent Rice–Mele cycle and Wilson-loop acceptance checks."""
import numpy as np

from quantum_worker.engines.rice_mele_pump import pump_mesh, rice_mele_pump_analysis
from quantum_worker.engines.topology import solve


BASE = dict(baseHopping=1.0, modulation=.4, staggerAmplitude=.6,
            staggerOffset=0.0, kSamples=32, phaseSamples=32)


def test_filled_band_pump_and_independent_bloch_gap():
    result = solve({"schema":"quantum-job/v1","jobId":"rice-pump","operation":"topology",
                    "engine":"native","model":{"type":"rice_mele_pump","parameters":BASE}})
    a = result["analysis"]
    assert a["status"] == "defined" and a["chern"] == a["polarizationWinding"] == -1
    assert abs(a["exactGap"] - 1.2) < 1e-12
    for phase_index in (0, 7, 16, 23):
        theta = a["phaseValues"][phase_index]
        t1, t2, delta = a["t1Values"][phase_index], a["t2Values"][phase_index], a["deltaValues"][phase_index]
        assert np.isclose(t1, 1 + .4*np.cos(theta))
        assert np.isclose(t2, 1 - .4*np.cos(theta))
        assert np.isclose(delta, .6*np.sin(theta))
        for k_index in (0, 6, 15):
            k = a["kValues"][k_index]
            h = np.array([[delta, t1+t2*np.exp(-1j*k)],
                          [t1+t2*np.exp(1j*k), -delta]])
            energies = np.linalg.eigvalsh(h)
            flat = phase_index*BASE["kSamples"]+k_index
            assert np.allclose(energies, [a["lowerBand"][flat],a["upperBand"][flat]])
    assert len(a["polarization"]) == BASE["phaseSamples"]+1
    assert np.isclose(a["polarization"][-1]-a["polarization"][0],-1)


def test_orientation_trivial_cycle_and_gap_closure():
    reversed_cycle = rice_mele_pump_analysis({**BASE,"staggerAmplitude":-.6})
    assert reversed_cycle["status"] == "defined"
    assert reversed_cycle["chern"] == reversed_cycle["polarizationWinding"] == 1
    trivial = rice_mele_pump_analysis({**BASE,"staggerOffset":1.0})
    assert trivial["status"] == "defined" and trivial["chern"] == trivial["polarizationWinding"] == 0
    closed = rice_mele_pump_analysis({**BASE,"staggerOffset":.6})
    assert closed["status"] == "gap-closed"
    assert closed["chern"] is None and closed["polarizationWinding"] is None


def test_mesh_convergence_and_periodic_seams():
    coarse = pump_mesh(BASE, 32, 32)
    fine = pump_mesh(BASE, 64, 64)
    assert np.isclose(coarse["chern"],fine["chern"])
    assert np.isclose(coarse["winding"],fine["winding"])
    assert abs(np.sum(coarse["flux"][-1,:])) > 1e-3  # phase seam contributes
    assert coarse["minLink"] > .1
