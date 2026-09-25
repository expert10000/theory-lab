def hamiltonian(qt, parameters):
    return 0.5 * parameters["delta"] * qt.sigmaz() + 0.5 * parameters["omega"] * qt.sigmax()
