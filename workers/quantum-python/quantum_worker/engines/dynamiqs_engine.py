"""Optional GPU-only Dynamiqs adapter for two-level Schrödinger evolution.

Importing this module never imports JAX. A machine without the optional stack
continues to use QuTiP and SciPy without a GPU initialization side effect.
"""
from importlib import metadata, util
import os


def availability():
    if util.find_spec("dynamiqs") is None or util.find_spec("jax") is None:
        return {"available": False, "version": None, "device": None}
    try:
        os.environ.setdefault("XLA_PYTHON_CLIENT_PREALLOCATE", "false")
        import dynamiqs  # verify import, not just wheel metadata
        import jax
        devices = jax.devices("gpu")
        if not devices:
            return {"available": False, "version": metadata.version("dynamiqs"), "device": None}
        return {"available": True, "version": metadata.version("dynamiqs"),
                "device": str(devices[0])}
    except Exception:
        return {"available": False, "version": None, "device": None}


def states(job, cancelled, chunk_size=128):
    """Yield indexed amplitudes, solving bounded chunks so cancellation is real."""
    if not availability()["available"]:
        raise ValueError("Dynamiqs GPU is unavailable; install the optional CUDA stack on Linux/WSL2")
    import dynamiqs as dq
    import jax
    import jax.numpy as jnp

    jax.config.update("jax_enable_x64", True)
    dq.set_device("gpu")
    params = job["model"]["parameters"]
    model = job["model"]["type"]
    if model in ("driven_two_level", "strong_drive"):
        hamiltonian = dq.timecallable(lambda t: 0.5 * params["delta"] * dq.sigmaz()
            + 0.5 * params["amplitude"] * jnp.cos(params["frequency"] * t + params["phase"]) * dq.sigmax())
    elif model == "landau_zener":
        hamiltonian = dq.timecallable(lambda t: 0.5 * (params["sweepRate"] * t + params["bias"]) * dq.sigmaz()
            + 0.5 * params["gap"] * dq.sigmax())
    elif model == "stuckelberg":
        hamiltonian = dq.timecallable(lambda t: 0.5 * (params["sweepRate"] *
            (t * t - params["turnTime"] ** 2) / (2 * params["turnTime"]) + params["bias"]) * dq.sigmaz()
            + 0.5 * params["gap"] * dq.sigmax())
    else:
        raise ValueError("Dynamiqs supports two-level evolution models only")

    settings = job["solver"]
    rows = settings["samples"]
    start, stop = settings["tStart"], settings["tStop"]
    step = (stop - start) / (rows - 1)
    state = dq.basis(2, job["initialState"]["index"])
    yield 0, tuple(complex(value) for value in dq.to_numpy(state).ravel())
    last = 0
    while last < rows - 1:
        if cancelled.is_set():
            return
        end = min(rows - 1, last + chunk_size)
        times = jnp.asarray([stop if i == rows - 1 else start + i * step
                             for i in range(last, end + 1)], dtype=jnp.float64)
        result = dq.sesolve(hamiltonian, state, times, progress_meter=False)
        values = dq.to_numpy(result.states).reshape(end - last + 1, 2)
        for offset, vector in enumerate(values[1:], start=1):
            if cancelled.is_set():
                return
            yield last + offset, tuple(complex(value) for value in vector)
        state = result.final_state
        last = end


def batched_final_populations(models, initial_index, t_start, t_stop, cancelled):
    """Evolve independent two-level Hamiltonians in one GPU solver call."""
    if not availability()["available"]:
        raise ValueError("Dynamiqs GPU is unavailable")
    if cancelled.is_set():
        return None
    import dynamiqs as dq
    import jax
    import jax.numpy as jnp

    jax.config.update("jax_enable_x64", True)
    dq.set_device("gpu")
    if not models:
        raise ValueError("GPU batch must contain models")
    kind = models[0]["type"]
    if any(model["type"] != kind for model in models):
        raise ValueError("GPU batch requires one model type")
    parameters = {name: jnp.asarray([model["parameters"][name] for model in models], dtype=jnp.float64)
                  for name in models[0]["parameters"]}

    def matrix(t):
        if kind in ("driven_two_level", "strong_drive"):
            z = 0.5 * parameters["delta"]
            x = 0.5 * parameters["amplitude"] * jnp.cos(parameters["frequency"] * t + parameters["phase"])
        elif kind == "landau_zener":
            z = 0.5 * (parameters["sweepRate"] * t + parameters["bias"])
            x = 0.5 * parameters["gap"]
        elif kind == "stuckelberg":
            z = 0.5 * (parameters["sweepRate"] * (t * t - parameters["turnTime"] ** 2)
                       / (2 * parameters["turnTime"]) + parameters["bias"])
            x = 0.5 * parameters["gap"]
        else:
            raise ValueError("Unsupported GPU batch model")
        return dq.asqarray(jnp.stack((jnp.stack((z, x), axis=-1),
                                      jnp.stack((x, -z), axis=-1)), axis=-2))

    result = dq.sesolve(dq.timecallable(matrix), dq.basis(2, initial_index),
                        jnp.asarray([t_start, t_stop], dtype=jnp.float64),
                        progress_meter=False, save_states=False)
    if cancelled.is_set():
        return None
    vectors = dq.to_numpy(result.final_state).reshape(len(models), 2)
    return [float(min(1, max(0, abs(vector[1]) ** 2))) for vector in vectors]
