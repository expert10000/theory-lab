"""Independent read-only checks of the supplied Chapter VIII numerical tables."""
from __future__ import annotations

import csv
from pathlib import Path

import numpy as np
from scipy.integrate import solve_ivp

ROOT = Path(__file__).resolve().parents[1] / "docs/source-material/rb87-companion/Chapter_VIII"
H = np.array([[4, -np.sqrt(2), 0], [-np.sqrt(2), 0, -np.sqrt(2)], [0, -np.sqrt(2), 4]], dtype=complex)
LEFT = np.diag([2, 1, 0]).astype(complex)
RIGHT = np.diag([0, 1, 2]).astype(complex)
INITIAL = np.array([.5, 1 / np.sqrt(2), .5], dtype=complex)


def master_rhs(_time: float, flat: np.ndarray, gamma: float) -> np.ndarray:
    rho = flat.reshape(3, 3)
    change = -1j * (H @ rho - rho @ H)
    for number in (LEFT, RIGHT):
        square = number @ number
        change += gamma * (number @ rho @ number - .5 * (square @ rho + rho @ square))
    return change.reshape(9)


def verify_trajectories() -> None:
    with (ROOT / "trajectory_results.csv").open(newline="", encoding="utf-8") as source:
        rows = list(csv.DictReader(source))
    assert len(rows) == 15
    assert {float(row["gamma"]) for row in rows} == {0., .5, 2.}
    assert {float(row["t"]) for row in rows} == {0., .5, 1., 2., 3.}
    rho0 = np.outer(INITIAL, INITIAL.conj()).reshape(9)
    max_exact_error = 0.
    max_mc_error = 0.
    for gamma in (0., .5, 2.):
        selected = sorted((row for row in rows if float(row["gamma"]) == gamma), key=lambda row: float(row["t"]))
        times = [float(row["t"]) for row in selected]
        solution = solve_ivp(master_rhs, (0., 3.), rho0, args=(gamma,), t_eval=times,
                             method="DOP853", rtol=1e-12, atol=1e-13)
        assert solution.success
        for row, flat in zip(selected, solution.y.T):
            rho = flat.reshape(3, 3)
            p11 = float(rho[1, 1].real)
            purity = float(np.trace(rho @ rho).real)
            exact_error = max(abs(p11 - float(row["p11_exact"])),
                              abs(purity - float(row["master_purity"])))
            max_exact_error = max(max_exact_error, exact_error)
            assert exact_error < 2e-9, (gamma, row["t"], exact_error)
            assert abs(float(np.trace(rho).real) - 1) < 1e-10
            assert abs(float(row["mc_trace"]) - 1) < 1e-9
            assert 0 <= float(row["mean_trajectory_entropy"]) <= np.log(3) + 1e-10
            mc_error = abs(float(row["p11_mc"]) - p11)
            max_mc_error = max(max_mc_error, mc_error)
            assert mc_error < .06, (gamma, row["t"], mc_error)
            assert float(row["frobenius_error"]) < .08
            if gamma == 0.:
                probabilities = np.real(np.diag(rho))
                entropy = -float(np.sum(probabilities * np.log(np.maximum(probabilities, 1e-300))))
                assert abs(entropy - float(row["mean_trajectory_entropy"])) < 2e-9
    print(f"Chapter VIII master rows: 15 independently reproduced; max exact error {max_exact_error:.2g}; max MC P11 deviation {max_mc_error:.3f}")


def verify_preparation() -> None:
    with (ROOT / "dissipative_preparation.csv").open(newline="", encoding="utf-8") as source:
        rows = list(csv.DictReader(source))
    assert len(rows) == 21
    for row in rows:
        time = float(row["kappa_t"])
        exact = 1 - .75 * np.exp(-time)
        assert abs(float(row["exact_target_fidelity"]) - exact) < 1e-12
        assert abs(float(row["3000_trajectory_fidelity"]) - exact) < .06
    print("Chapter VIII preparation: 21 exact rows reproduced; trajectory estimates within 0.06")


def verify_recovery() -> None:
    identity = np.eye(2, dtype=complex)
    bit_flip = np.array([[0, 1], [1, 0]], dtype=complex)
    phase = np.diag([1, -1]).astype(complex)
    kron = lambda a, b, c: np.kron(np.kron(a, b), c)
    checks = (kron(phase, phase, identity), kron(identity, phase, phase))
    flips = (kron(bit_flip, identity, identity), kron(identity, bit_flip, identity),
             kron(identity, identity, bit_flip))
    state = np.zeros(8, dtype=complex)
    state[0] = np.sqrt(.37)
    state[7] = np.exp(.63j) * np.sqrt(.63)
    for flip, syndrome in zip(flips, ((-1, 1), (-1, -1), (1, -1))):
        damaged = flip @ state
        observed = tuple(round(float(np.vdot(damaged, check @ damaged).real)) for check in checks)
        assert observed == syndrome
        assert abs(abs(np.vdot(state, flip @ damaged)) ** 2 - 1) < 1e-12
    print("Chapter VIII code example: all three single-bit-flip syndromes and recoveries verified")


if __name__ == "__main__":
    verify_trajectories()
    verify_preparation()
    verify_recovery()
