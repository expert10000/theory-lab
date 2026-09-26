"""Smooth double passage with crossings at ±turnTime for zero bias."""


def hamiltonian(qt, parameters):
    rate = parameters["sweepRate"]
    turn = parameters["turnTime"]
    bias = parameters["bias"]

    def detuning(t):
        return 0.5 * (rate * (t * t - turn * turn) / (2 * turn) + bias)

    return qt.QobjEvo([0.5 * parameters["gap"] * qt.sigmax(), [qt.sigmaz(), detuning]])
