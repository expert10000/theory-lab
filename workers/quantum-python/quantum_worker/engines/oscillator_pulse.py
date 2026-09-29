"""Declarative bounded Gaussian forcing, reusing the verified drive artifact writer.

QuTiP lab-frame integration versus native SciPy DOP853 lab-frame coefficients.
Full-space displacement is separately integrated by adaptive scalar quadrature.
No rotating constant-H shortcut, output normalization, or arbitrary user code.
"""
import cmath
import math
from quantum_worker.contracts import validate
from quantum_worker.engines.oscillator_drive import oscillator_drive
from quantum_worker.engines.qutip_engine import engine


def oscillator_pulse(job, output_dir, cancelled, progress):
    validate("quantum-job", job)
    if job["operation"] != "oscillator_pulse":
        raise ValueError("Expected Gaussian oscillator pulse")
    p, s = job["model"]["parameters"], job["solver"]
    width, center, omega, nu = p["pulseWidth"], p["pulseCenter"], p["omega"], p["driveFrequency"]
    eps = complex(p["epsilonRe"], p["epsilonIm"])
    duration = s["tStop"]-s["tStart"]

    def gaussian(tau):
        return math.exp(-.5*((tau-center)/width)**2)

    def envelope(tau):
        return eps*gaussian(tau)*cmath.exp(-1j*nu*tau)

    def derivative(tau):
        return envelope(tau)*(-(tau-center)/width**2-1j*nu)

    def states(np, scipy, psi0):
        n = p["cutoff"]
        if job["engine"] == "qutip":
            qt = engine()
            a = qt.destroy(n)
            def coefficient(t):
                return envelope(t-s["tStart"])
            def conjugate_coefficient(t):
                return coefficient(t).conjugate()
            h = qt.QobjEvo([omega*(qt.num(n)+.5*qt.qeye(n)), [a.dag(), coefficient], [a, conjugate_coefficient]])
            solver = qt.SESolver(h, options={"normalize_output": False, "atol": 1e-12, "rtol": 1e-10,
                                           "max_step": s["maxStep"], "nsteps": 100000})
            solver.start(qt.Qobj(psi0), s["tStart"])
            return lambda t: solver.step(t).full().ravel(), qt.__version__
        from scipy.integrate import DOP853
        diagonal = omega*(np.arange(n)+.5)
        roots = np.sqrt(np.arange(1, n))
        def rhs(tau, psi):
            if cancelled.is_set():
                raise InterruptedError("Pulse cancelled")
            e = envelope(tau)
            out = diagonal*psi
            out[1:] += e*roots*psi[:-1]
            out[:-1] += e.conjugate()*roots*psi[1:]
            return -1j*out
        solver = DOP853(rhs, 0., psi0, duration, max_step=s["maxStep"], rtol=1e-10, atol=1e-12)
        dense = None
        def state_at(t):
            nonlocal dense
            tau = t-s["tStart"]
            if tau == 0:
                return psi0.copy()
            while solver.t < tau and solver.status == "running":
                solver.step()
                if solver.status == "failed":
                    raise ValueError("Native pulse integration failed")
                dense = solver.dense_output()
            if dense is None or solver.t < tau-1e-12:
                raise ValueError("Native pulse did not reach observation time")
            return dense(tau)
        return state_at, scipy.__version__

    def displacement(tau):
        from scipy.integrate import quad
        if cancelled.is_set():
            raise InterruptedError("Pulse cancelled")
        if tau == 0 or eps == 0:
            return 0j
        # Explicit breakpoints prevent an adaptive rule overlooking a narrow
        # interior peak when observation samples lie outside the pulse.
        points = [center+k*width for k in (-8, -4, -1, 0, 1, 4, 8) if 0 < center+k*width < tau]
        def integrand(x):
            return gaussian(x)*cmath.exp(1j*(omega-nu)*x)
        re, _ = quad(lambda x: integrand(x).real, 0, tau, points=points, epsabs=1e-12, epsrel=1e-12, limit=120)
        im, _ = quad(lambda x: integrand(x).imag, 0, tau, points=points, epsabs=1e-12, epsrel=1e-12, limit=120)
        return -1j*eps*cmath.exp(-1j*omega*tau)*complex(re, im)

    return oscillator_drive(job, output_dir, cancelled, progress, {
        "states": states, "envelope": envelope, "derivative": derivative, "displacement": displacement,
        "analysis": {"startEnvelope": gaussian(0), "endEnvelope": gaussian(duration)},
    })
