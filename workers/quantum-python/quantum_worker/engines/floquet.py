"""Two-level Floquet analysis from the one-period propagator.

Quasienergies are folded into [-omega/2, omega/2]; eigenvector phases are
fixed for reproducible display. The small fixed map is a laboratory preview,
not the general parameter-sweep protocol reserved for QLAB-014.
"""
import math

from quantum_worker.engines.native_engine import libraries
from quantum_worker.engines.qutip_engine import engine
from quantum_worker.models import build


def _propagator(job, amplitude, frequency):
    np, scipy, _ = libraries()
    p = dict(job["model"]["parameters"])
    p["amplitude"] = amplitude
    p["frequency"] = frequency
    period = 2 * math.pi / frequency
    if job["engine"] == "qutip":
        qt = engine()
        model = {"type": "strong_drive", "parameters": p}
        return np.asarray(qt.propagator(build(qt, model), period).full()), period

    from scipy.integrate import solve_ivp

    def derivative(t, flattened):
        field = amplitude * math.cos(frequency * t + p["phase"])
        h = 0.5 * np.array([[p["delta"], field], [field, -p["delta"]]], dtype=complex)
        return (-1j * h @ flattened.reshape((2, 2))).ravel()

    solution = solve_ivp(derivative, (0, period), np.eye(2, dtype=complex).ravel(),
                         method="DOP853", rtol=1e-9, atol=1e-11)
    if not solution.success:
        raise RuntimeError("Native Floquet propagation failed: " + solution.message)
    return solution.y[:, -1].reshape((2, 2)), period


def analyze(job, cancelled):
    np, _, _ = libraries()
    p = job["model"]["parameters"]
    frequency = p["frequency"]
    if frequency <= 0:
        raise ValueError("Floquet frequency must be positive")
    unitary, period = _propagator(job, p["amplitude"], frequency)
    eigenvalues, vectors = np.linalg.eig(unitary)
    quasienergies = -np.angle(eigenvalues) / period
    order = np.argsort(quasienergies)
    energies = [float(quasienergies[i]) for i in order]
    modes = []
    for i in order:
        vector = vectors[:, i] / np.linalg.norm(vectors[:, i])
        pivot = int(np.argmax(np.abs(vector)))
        vector *= np.exp(-1j * np.angle(vector[pivot]))
        modes.append([{"re": float(z.real), "im": float(z.imag)} for z in vector])

    frequencies = [max(0.05, frequency * (0.6 + 0.8 * i / 12)) for i in range(13)]
    max_amplitude = max(0.2, 2 * abs(p["amplitude"]))
    amplitudes = [max_amplitude * i / 8 for i in range(9)]
    transitions = []
    initial = job["initialState"]["index"]
    for amplitude in amplitudes:
        for map_frequency in frequencies:
            if cancelled.is_set():
                return None
            u, _ = _propagator(job, amplitude, map_frequency)
            after = np.linalg.matrix_power(u, 5)
            probability = abs(after[1 - initial, initial]) ** 2
            transitions.append(float(min(1, max(0, probability))))
    delta = abs(p["delta"])
    return {
        "kind": "floquet", "period": period, "quasienergies": energies,
        "modes": modes, "quasienergyGap": float(max(0, min(abs(energies[1] - energies[0]),
                                                         frequency - abs(energies[1] - energies[0])))),
        "blochSiegertEstimate": float(p["amplitude"] ** 2 / (16 * delta)) if delta else None,
        "map": {"frequencyValues": frequencies, "amplitudeValues": amplitudes,
                "transitionProbabilities": transitions, "cycles": 5},
    }
