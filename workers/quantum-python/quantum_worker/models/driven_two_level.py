import math

def hamiltonian(qt, parameters):
    def coefficient(t):
        return 0.5 * parameters["amplitude"] * math.cos(parameters["frequency"] * t + parameters["phase"])
    return qt.QobjEvo([0.5 * parameters["delta"] * qt.sigmaz(), [qt.sigmax(), coefficient]])
