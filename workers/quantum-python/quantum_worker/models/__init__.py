"""QuTiP model builders keyed by versioned contract model IDs."""
from quantum_worker.models.two_level import hamiltonian as two_level
from quantum_worker.models.driven_two_level import hamiltonian as driven_two_level
from quantum_worker.models.landau_zener import hamiltonian as landau_zener
from quantum_worker.models.stuckelberg import hamiltonian as stuckelberg

BUILDERS = {"two_level": two_level, "driven_two_level": driven_two_level,
            "landau_zener": landau_zener, "strong_drive": driven_two_level,
            "stuckelberg": stuckelberg}

def build(qt, model):
    try:
        return BUILDERS[model["type"]](qt, model["parameters"])
    except KeyError as error:
        raise ValueError("Unsupported quantum model") from error
