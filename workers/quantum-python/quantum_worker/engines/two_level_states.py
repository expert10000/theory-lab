"""Bounded diagnostics for the real two-level Hamiltonian, in basis |0>, |1>."""

import math


def analyze(parameters, energies, vectors):
    delta, omega = parameters["delta"], parameters["omega"]
    gap = float(energies[1] - energies[0])
    threshold = 1e-10 * max(1.0, abs(delta), abs(omega))
    if gap <= threshold:
        return {"status": "degenerate", "gap": gap, "threshold": threshold}

    states = []
    for energy, vector in zip(energies, vectors):
        first, second = (complex(vector[0]), complex(vector[1]))
        pivot = first if abs(first) > 1e-12 else second
        phase = pivot.conjugate() / abs(pivot)
        first, second = first * phase, second * phase
        if abs(first.imag) > 1e-10 or abs(second.imag) > 1e-10:
            raise ValueError("Static real Hamiltonian returned a complex relative phase")
        a, b = first.real, second.real
        norm = math.hypot(a, b)
        a, b = a / norm, b / norm
        p0, p1 = a * a, b * b
        residual = math.hypot(delta * a / 2 + omega * b / 2 - energy * a,
                              omega * a / 2 - delta * b / 2 - energy * b)
        states.append({"amplitudes": [a, b], "populations": [p0, p1],
                       "bloch": {"x": 2 * a * b, "y": 0.0, "z": p0 - p1},
                       "residualNorm": residual})
    return {"status": "resolved", "gap": gap, "threshold": threshold, "states": states}
