"""Bounded filled-band Rice–Mele cycle; no finite-speed transport is solved."""

import numpy as np


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
            "method": "occupied-band FHS torus and independent k-Wilson-loop polarization winding; periodic seams included",
            "units": {"momentum": "rad / cell", "phase": "rad", "energy": "hopping energy", "polarization": "electron charge / cell"}}
