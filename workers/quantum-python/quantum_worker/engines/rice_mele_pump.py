"""Bounded filled-band Rice–Mele cycle and optional finite-speed bulk evolution."""

import numpy as np


def finite_speed_trace(parameters, k_count, phase_count, duration, steps_per_phase):
    """Unitary midpoint propagation at every periodic Bloch momentum (hbar=1)."""
    k = -np.pi + 2 * np.pi * np.arange(k_count) / k_count
    # The lower band at theta=0 is filled, one normalized spinor per k.
    t1 = parameters["baseHopping"] + parameters["modulation"]
    t2 = parameters["baseHopping"] - parameters["modulation"]
    delta = parameters["staggerOffset"]
    q = t1 + t2 * np.exp(-1j * k)
    h0 = np.zeros((k_count, 2, 2), dtype=np.complex128)
    h0[:, 0, 0], h0[:, 1, 1] = delta, -delta
    h0[:, 0, 1], h0[:, 1, 0] = q, q.conj()
    _, vec = np.linalg.eigh(h0)
    psi = vec[:, :, 0].copy()
    dt = duration / (phase_count * steps_per_phase)
    currents, charges, populations, by_k = [], [], [], []
    max_norm_drift = 0.0

    def observe(theta):
        nonlocal max_norm_drift
        t1_now = parameters["baseHopping"] + parameters["modulation"] * np.cos(theta)
        t2_now = parameters["baseHopping"] - parameters["modulation"] * np.cos(theta)
        d_now = parameters["staggerOffset"] + parameters["staggerAmplitude"] * np.sin(theta)
        off = t1_now + t2_now * np.exp(-1j * k)
        velocity_off = -1j * t2_now * np.exp(-1j * k)
        # Electron charge is -1; current is minus the group-velocity expectation.
        local = -2 * np.real(np.conj(psi[:, 0]) * velocity_off * psi[:, 1])
        energy = np.sqrt(d_now * d_now + abs(off)**2)
        hpsi0, hpsi1 = d_now * psi[:, 0] + off * psi[:, 1], off.conj() * psi[:, 0] - d_now * psi[:, 1]
        ground_population = (1 - np.real(np.conj(psi[:, 0]) * hpsi0 + np.conj(psi[:, 1]) * hpsi1) / energy) / 2
        max_norm_drift = max(max_norm_drift, float(np.max(abs(np.sum(abs(psi)**2, axis=1) - 1))))
        currents.append(float(np.mean(local)))
        populations.append(float(np.clip(np.mean(1 - ground_population),0,1)))
        by_k.extend(local.tolist())

    observe(0.0)
    charges.append(0.0)
    integrated_charge = 0.0
    for step in range(phase_count * steps_per_phase):
        theta = 2 * np.pi * (step + .5) / (phase_count * steps_per_phase)
        t1_now = parameters["baseHopping"] + parameters["modulation"] * np.cos(theta)
        t2_now = parameters["baseHopping"] - parameters["modulation"] * np.cos(theta)
        d_now = parameters["staggerOffset"] + parameters["staggerAmplitude"] * np.sin(theta)
        off = t1_now + t2_now * np.exp(-1j * k)
        energy = np.sqrt(d_now*d_now + abs(off)**2)
        ch, sh = np.cos(energy*dt/2), np.sin(energy*dt/2)/energy
        mid0 = ch*psi[:, 0] - 1j*sh*(d_now*psi[:, 0] + off*psi[:, 1])
        mid1 = ch*psi[:, 1] - 1j*sh*(off.conj()*psi[:, 0] - d_now*psi[:, 1])
        velocity_off = -1j*t2_now*np.exp(-1j*k)
        integrated_charge -= dt*float(np.mean(2*np.real(np.conj(mid0)*velocity_off*mid1)))
        c, s = np.cos(energy*dt), np.sin(energy*dt)/energy
        psi0 = c*psi[:, 0] - 1j*s*(d_now*psi[:, 0] + off*psi[:, 1])
        psi1 = c*psi[:, 1] - 1j*s*(off.conj()*psi[:, 0] - d_now*psi[:, 1])
        psi = np.stack((psi0, psi1), axis=1)
        if (step + 1) % steps_per_phase == 0:
            observe(2*np.pi*(step+1)/(phase_count*steps_per_phase))
            charges.append(integrated_charge)
    return {"timeValues": np.linspace(0, duration, phase_count+1).tolist(),
            "phaseValues": np.linspace(0, 2*np.pi, phase_count+1).tolist(),
            "kValues": k.tolist(), "current": currents, "charge": charges,
            "excitedPopulation": populations, "currentByK": by_k,
            "maxNormDrift": max_norm_drift}


def pump_mesh(parameters, k_count, phase_count, gauge_phase=None):
    base = parameters["baseHopping"]
    modulation = parameters["modulation"]
    stagger = parameters["staggerAmplitude"]
    offset = parameters["staggerOffset"]
    k = -np.pi + 2 * np.pi * np.arange(k_count) / k_count
    phase = 2 * np.pi * np.arange(phase_count) / phase_count
    t1 = base + modulation * np.cos(phase)
    t2 = base - modulation * np.cos(phase)
    delta = offset + stagger * np.sin(phase)
    q = t1[:, None] + t2[:, None] * np.exp(-1j * k[None, :])
    h = np.zeros((phase_count, k_count, 2, 2), dtype=np.complex128)
    h[..., 0, 0] = delta[:, None]
    h[..., 1, 1] = -delta[:, None]
    h[..., 0, 1] = q
    h[..., 1, 0] = q.conj()
    energies, eigenvectors = np.linalg.eigh(h)
    occupied = eigenvectors[..., :, 0]
    if gauge_phase is not None:
        if gauge_phase.shape != (phase_count, k_count):
            raise ValueError("Gauge phase shape must match the sampled torus")
        occupied = occupied * np.exp(1j * gauge_phase[..., None])
    uk = np.sum(occupied.conj() * np.roll(occupied, -1, axis=1), axis=-1)
    up = np.sum(occupied.conj() * np.roll(occupied, -1, axis=0), axis=-1)
    min_link = float(min(np.min(abs(uk)), np.min(abs(up))))
    if min_link < 1e-12:
        return {"k": k, "phase": phase, "t1": t1, "t2": t2, "delta": delta,
                "energies": energies, "gap": float(np.min(energies[..., 1] - energies[..., 0])),
                "minLink": min_link, "chern": None, "winding": None,
                "polarization": np.zeros(phase_count + 1), "flux": np.zeros((phase_count, k_count))}
    uk /= abs(uk)
    up /= abs(up)
    # FHS plaquettes in (phase,k) order, including both periodic seams.
    flux = np.angle(up * np.roll(uk, -1, axis=0) *
                    np.conj(np.roll(up, -1, axis=1)) * np.conj(uk))
    chern = float(np.sum(flux) / (2 * np.pi))
    wilson = np.angle(np.prod(uk, axis=1))
    # Unwrap the closed Wilson loop including its last-to-first seam.
    steps = np.angle(np.exp(1j * (np.roll(wilson, -1) - wilson)))
    winding = float(np.sum(steps) / (2 * np.pi))
    polarization = np.r_[wilson[0], wilson[0] + np.cumsum(steps)] / (2 * np.pi)
    return {"k": k, "phase": phase, "t1": t1, "t2": t2, "delta": delta,
            "energies": energies, "gap": float(np.min(energies[..., 1] - energies[..., 0])),
            "minLink": min_link, "chern": chern, "winding": winding,
            "polarization": polarization, "flux": flux}


def rice_mele_pump_analysis(parameters):
    k_count, phase_count = parameters["kSamples"], parameters["phaseSamples"]
    if k_count % 2 != 0 or phase_count % 4 != 0:
        raise ValueError("Pump mesh requires even k samples and a multiple of four phase samples")
    if parameters["baseHopping"] <= abs(parameters["modulation"]):
        raise ValueError("Both cycle hoppings must remain positive")
    coarse = pump_mesh(parameters, k_count, phase_count)
    fine = pump_mesh(parameters, 2 * k_count, 2 * phase_count)
    # For positive hoppings the Bloch minimum is at k=pi. Squared half-gap
    # is a quadratic in x=sin(phase), minimized on the closed interval [-1,1].
    m, a, d0 = (parameters[key] for key in ("modulation", "staggerAmplitude", "staggerOffset"))
    candidates = [-1.0, 1.0]
    curvature = a * a - 4 * m * m
    if curvature > 0:
        candidates.append(float(np.clip(-d0 * a / curvature, -1, 1)))
    exact_gap = float(2 * min(np.hypot(2 * m * np.sqrt(max(0.0, 1 - x * x)), d0 + a * x)
                              for x in candidates))
    closed = exact_gap < 1e-8
    integer_chern = None if coarse["chern"] is None else int(round(coarse["chern"]))
    integer_winding = None if coarse["winding"] is None else int(round(coarse["winding"]))
    resolved = (not closed and min(coarse["minLink"], fine["minLink"]) > 0.1 and
                coarse["chern"] is not None and fine["chern"] is not None and
                abs(coarse["chern"] - integer_chern) < 1e-6 and
                abs(coarse["winding"] - integer_winding) < 1e-6 and
                integer_chern == integer_winding and
                abs(fine["chern"] - coarse["chern"]) < 1e-6 and
                abs(fine["winding"] - coarse["winding"]) < 1e-6 and
                abs(coarse["gap"] - fine["gap"]) < 0.05 * exact_gap and
                abs(fine["gap"] - exact_gap) < 0.03 * exact_gap)
    status = "gap-closed" if closed else "defined" if resolved else "mesh-unresolved"
    if ("duration" in parameters) != ("stepsPerPhase" in parameters):
        raise ValueError("Finite-speed duration and step count must be supplied together")
    dynamics = None
    if "duration" in parameters:
        duration, steps = parameters["duration"], parameters["stepsPerPhase"]
        if not (10 <= duration <= 400 and 4 <= steps <= 64 and phase_count*steps <= 4096):
            raise ValueError("Finite-speed cycle exceeds bounded duration or step limits")
        primary = finite_speed_trace(parameters,k_count,phase_count,duration,steps)
        time_refined = finite_speed_trace(parameters,k_count,phase_count,duration,steps*2)
        k_refined = finite_speed_trace(parameters,2*k_count,phase_count,duration,steps)
        time_drift = abs(primary["charge"][-1]-time_refined["charge"][-1])
        k_drift = abs(primary["charge"][-1]-k_refined["charge"][-1])
        dynamic_status = "gap-closed" if closed else "resolved" if (
            primary["maxNormDrift"] < 1e-8 and time_drift < .02 and k_drift < .02) else "unresolved"
        dynamics = {"status": dynamic_status, "duration": duration, "stepsPerPhase": steps,
                    "timeValues": primary["timeValues"], "phaseValues": primary["phaseValues"],
                    "kValues": primary["kValues"], "current": primary["current"],
                    "charge": primary["charge"], "currentByK": primary["currentByK"],
                    "excitedPopulation": primary["excitedPopulation"],
                    "transportedCharge": primary["charge"][-1],
                    "maxNormDrift": primary["maxNormDrift"],
                    "timeStepChargeDrift": time_drift, "momentumChargeDrift": k_drift,
                    "adiabaticChern": integer_chern if resolved else None,
                    "method": "filled lower Bloch band at theta=0; hbar=1; unitary midpoint SU(2) propagation; electron current -dH/dk; midpoint time integral and periodic k average",
                    "units": {"time": "inverse hopping energy", "current": "electron charge / inverse hopping time", "charge": "electron charge / cell"}}
    return {"kind": "rice_mele_pump", "status": status,
            "chern": integer_chern if resolved else None,
            "polarizationWinding": integer_winding if resolved else None,
            "exactGap": float(exact_gap), "coarseGap": coarse["gap"], "fineGap": fine["gap"],
            "coarseChern": coarse["chern"], "fineChern": fine["chern"],
            "coarseWinding": coarse["winding"], "fineWinding": fine["winding"],
            "minimumLink": coarse["minLink"], "fineMinimumLink": fine["minLink"],
            "kValues": coarse["k"].tolist(), "phaseValues": coarse["phase"].tolist(),
            "t1Values": coarse["t1"].tolist(), "t2Values": coarse["t2"].tolist(),
            "deltaValues": coarse["delta"].tolist(),
            "lowerBand": coarse["energies"][..., 0].ravel().tolist(),
            "upperBand": coarse["energies"][..., 1].ravel().tolist(),
            "berryFlux": coarse["flux"].ravel().tolist(),
            "polarization": coarse["polarization"].tolist(),
            **({"dynamics": dynamics} if dynamics is not None else {}),
            "method": "occupied-band FHS torus and independent k-Wilson-loop polarization winding; periodic seams included",
            "units": {"momentum": "rad / cell", "phase": "rad", "energy": "hopping energy", "polarization": "electron charge / cell"}}
