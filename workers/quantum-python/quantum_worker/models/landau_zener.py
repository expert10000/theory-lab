def hamiltonian(qt, parameters):
    def detuning(t):
        return 0.5 * (parameters["sweepRate"] * t + parameters["bias"])
    return qt.QobjEvo([0.5 * parameters["gap"] * qt.sigmax(), [qt.sigmaz(), detuning]])
