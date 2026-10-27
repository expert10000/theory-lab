"""Independent Rice–Mele cycle and Wilson-loop acceptance checks."""
import numpy as np
import unittest

from quantum_worker.engines.rice_mele_pump import pump_mesh, rice_mele_pump_analysis
from scipy.integrate import solve_ivp
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
    phases = np.random.default_rng(47).uniform(-np.pi, np.pi, (32, 32))
    regauged = pump_mesh(BASE, 32, 32, phases)
    assert np.allclose(regauged["flux"], coarse["flux"])
    assert np.isclose(regauged["chern"], coarse["chern"])
    assert np.isclose(regauged["winding"], coarse["winding"])


def test_finite_speed_current_against_independent_ivp_and_slow_limit():
    p={**BASE,"kSamples":16,"phaseSamples":16,"duration":20.,"stepsPerPhase":16}
    analysis=rice_mele_pump_analysis(p)
    d=analysis["dynamics"]
    assert d["status"]=="resolved" and d["maxNormDrift"]<1e-10
    assert d["adiabaticChern"]==analysis["chern"]==-1
    assert len(d["currentByK"])==16*17
    assert np.isclose(d["charge"][-1],d["transportedCharge"])
    k=np.asarray(d["kValues"])
    q0=p["baseHopping"]+p["modulation"]+(p["baseHopping"]-p["modulation"])*np.exp(-1j*k)
    h0=np.zeros((len(k),2,2),complex)
    h0[:,0,1],h0[:,1,0]=q0,q0.conj()
    _,vectors=np.linalg.eigh(h0)
    initial=vectors[:,:,0]
    def rhs(time,state):
        theta=2*np.pi*time/20
        t1=1+.4*np.cos(theta);t2=1-.4*np.cos(theta);delta=.6*np.sin(theta)
        off=t1+t2*np.exp(-1j*k)
        psi=state.reshape(len(k),2)
        return (-1j*np.stack((delta*psi[:,0]+off*psi[:,1],
                              off.conj()*psi[:,0]-delta*psi[:,1]),axis=1)).ravel()
    time=np.linspace(0,20,2001)
    reference=solve_ivp(rhs,(0,20),initial.ravel(),t_eval=time,rtol=2e-10,atol=2e-11)
    assert reference.success
    psi=reference.y.T.reshape(len(time),len(k),2)
    theta=2*np.pi*time/20
    t2=1-.4*np.cos(theta)
    velocity_off=-1j*t2[:,None]*np.exp(-1j*k[None,:])
    current=np.mean(-2*np.real(np.conj(psi[:,:,0])*velocity_off*psi[:,:,1]),axis=1)
    reference_charge=float(np.sum((current[1:]+current[:-1])*np.diff(time)/2))
    assert abs(d["transportedCharge"]-reference_charge)<.005
    assert np.max(abs(np.sum(abs(psi)**2,axis=-1)-1))<1e-8
    slow=rice_mele_pump_analysis({**BASE,"duration":80.,"stepsPerPhase":16})["dynamics"]
    assert slow["status"]=="resolved"
    assert abs(slow["transportedCharge"]-analysis["chern"])<.03
    reversed_cycle=rice_mele_pump_analysis({**BASE,"staggerAmplitude":-.6,
                                            "duration":80.,"stepsPerPhase":16})
    assert reversed_cycle["chern"]==1
    assert abs(reversed_cycle["dynamics"]["transportedCharge"]-1)<.03
    closed=rice_mele_pump_analysis({**BASE,"staggerOffset":.6,
                                    "duration":20.,"stepsPerPhase":8})
    assert closed["dynamics"]["status"]=="gap-closed"
    assert closed["dynamics"]["adiabaticChern"] is None


def test_open_chain_motion_against_independent_ivp_and_continuity():
    p={**BASE,"kSamples":16,"phaseSamples":16,"duration":20.,"stepsPerPhase":8,"chainCells":4}
    analysis=rice_mele_pump_analysis(p)
    chain=analysis["finiteChain"]
    assert chain["sites"]==8 and chain["occupiedOrbitals"]==4 and chain["centralBond"]==3
    assert len(chain["siteDensity"])==17*8 and len(chain["bondElectronCurrent"])==17*7
    assert chain["maxNormDrift"]<1e-10 and chain["maxParticleDrift"]<1e-10
    assert chain["maxContinuityResidual"]<.02 and chain["timeStepChargeDrift"]<.02
    assert len(chain["leftEdgePopulation"])==len(chain["rightEdgePopulation"])==17
    for row in np.asarray(chain["siteDensity"]).reshape(17,8):
        assert abs(sum(row)-4)<1e-10

    def independent_h(theta):
        t1=1+.4*np.cos(theta); t2=1-.4*np.cos(theta); delta=.6*np.sin(theta)
        h=np.diag([delta if i%2==0 else -delta for i in range(8)]).astype(complex)
        for i in range(7):
            h[i,i+1]=h[i+1,i]=t1 if i%2==0 else t2
        return h
    assert independent_h(0)[0,-1]==0  # no periodic edge wrap
    _, basis=np.linalg.eigh(independent_h(0))
    initial=basis[:,:4]
    def rhs(time,flat):
        return (-1j*independent_h(2*np.pi*time/20)@flat.reshape(8,4)).ravel()
    times=np.linspace(0,20,4001)
    ref=solve_ivp(rhs,(0,20),initial.ravel(),t_eval=times,rtol=2e-10,atol=2e-11)
    assert ref.success
    states=ref.y.T.reshape(len(times),8,4)
    ref_final=np.sum(abs(states[-1])**2,axis=1)
    assert np.allclose(ref_final,np.asarray(chain["siteDensity"])[-8:],atol=.005)
    theta=2*np.pi*times/20
    central_t=1-.4*np.cos(theta)
    ref_current=2*central_t*np.imag(np.sum(np.conj(states[:,3])*states[:,4],axis=1))
    ref_charge=float(np.sum((ref_current[1:]+ref_current[:-1])*np.diff(times)/2))
    assert abs(ref_charge-chain["centralBondCharge"][-1])<.01
    assert abs(chain["centralBondCharge"][0])<1e-12

    # The two widths can differ even when the midpoint solver has converged.
    slower=rice_mele_pump_analysis({**BASE,"duration":80.,"stepsPerPhase":16,"chainCells":6})
    assert slower["finiteChain"]["status"]=="size-sensitive"
    assert slower["finiteChain"]["widthChargeDrift"]>.1
    assert slower["status"]=="defined"  # periodic bulk claim remains separate


class RiceMelePumpTests(unittest.TestCase):
    """Also run these independent checks in the repository's unittest gate."""

    def test_filled_band_pump_and_independent_bloch_gap(self):
        test_filled_band_pump_and_independent_bloch_gap()

    def test_orientation_trivial_cycle_and_gap_closure(self):
        test_orientation_trivial_cycle_and_gap_closure()

    def test_mesh_convergence_and_periodic_seams(self):
        test_mesh_convergence_and_periodic_seams()

    def test_finite_speed_current_against_independent_ivp_and_slow_limit(self):
        test_finite_speed_current_against_independent_ivp_and_slow_limit()

    def test_open_chain_motion_against_independent_ivp_and_continuity(self):
        test_open_chain_motion_against_independent_ivp_and_continuity()
