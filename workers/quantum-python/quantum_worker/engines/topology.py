"""Finite SSH chain and two-band topology. Native NumPy solver, ħ = 1."""
from datetime import datetime, timezone
import platform
from time import perf_counter
from uuid import uuid4

from quantum_worker import __version__
from quantum_worker.contracts import validate
from quantum_worker.engines.native_engine import libraries


def ssh_analysis(np, parameters):
    t1, t2 = parameters["t1"], parameters["t2"]
    cells, points = parameters["cells"], parameters["kPoints"]
    k = np.linspace(-np.pi, np.pi, points)
    q = t1 + t2 * np.exp(1j * k)
    band = np.abs(q)
    gap = 2.0 * abs(abs(t1) - abs(t2))
    # Winding is undefined at a bulk gap closure, including the zero Hamiltonian.
    winding = None if gap < 1e-10 else int(abs(t2) > abs(t1))
    matrix = np.zeros((2 * cells, 2 * cells), dtype=np.float64)
    for cell in range(cells):
        a, b = 2 * cell, 2 * cell + 1
        matrix[a, b] = matrix[b, a] = t1
        if cell + 1 < cells:
            matrix[b, a + 2] = matrix[a + 2, b] = t2
    energies, vectors = np.linalg.eigh(matrix)
    pair = slice(cells - 1, cells + 1)
    density = np.mean(abs(vectors[:, pair]) ** 2, axis=1)
    # Probability in the two exposed orbitals, averaged over both midgap states.
    edge_weight = float(density[0] + density[-1])
    return {"kind": "ssh", "bulkGap": float(gap), "winding": winding,
            "kValues": k.tolist(), "lowerBand": (-band).tolist(), "upperBand": band.tolist(),
            "edgeEnergies": energies[pair].tolist(), "edgeDensity": density.tolist(),
            "edgeWeight": edge_weight}


def qwz_analysis(np, parameters):
    mass, grid = parameters["mass"], parameters["grid"]
    # All possible closings are at high-symmetry points: m = -2, 0, +2.
    gap = 2.0 * min(abs(mass + 2), abs(mass), abs(mass - 2))
    k = -np.pi + 2 * np.pi * np.arange(grid) / grid
    kx, ky = np.meshgrid(k, k, indexing="ij")
    dx, dy = np.sin(kx), np.sin(ky)
    dz = mass + np.cos(kx) + np.cos(ky)
    band = np.sqrt(dx * dx + dy * dy + dz * dz)
    sampled_gap = float(2 * np.min(band))
    # Exact two-band eigenvalues at the FHS vertices, NOT curvature cell centers.
    bands = {"bandKValues": k.tolist(), "lowerBand": (-band).ravel().tolist(),
             "upperBand": band.ravel().tolist()}
    if gap < 1e-10:
        return {"kind": "qwz", "bulkGap": 0.0, "sampledGap": 0.0,
                "gapClosed": True, "chern": None, "latticeChern": None,
                "analyticChern": None, "meshResolved": False, "chernIntegral": None,
                "berryCurvature": [], **bands}
    matrix = np.empty((grid, grid, 2, 2), dtype=np.complex128)
    matrix[..., 0, 0] = dz
    matrix[..., 1, 1] = -dz
    matrix[..., 0, 1] = dx - 1j * dy
    matrix[..., 1, 0] = dx + 1j * dy
    _, eigenvectors = np.linalg.eigh(matrix)
    occupied = eigenvectors[..., :, 0]
    ux = np.sum(np.conj(occupied) * np.roll(occupied, -1, axis=0), axis=-1)
    uy = np.sum(np.conj(occupied) * np.roll(occupied, -1, axis=1), axis=-1)
    if min(float(np.min(abs(ux))), float(np.min(abs(uy)))) < 1e-10:
        raise ValueError("QWZ momentum mesh crosses a singular link; refine the grid")
    ux, uy = ux / abs(ux), uy / abs(uy)
    plaquette = ux * np.roll(uy, -1, axis=0) * np.conj(np.roll(ux, -1, axis=1)) * np.conj(uy)
    chern_raw = float(np.sum(np.angle(plaquette)) / (2 * np.pi))
    chern = int(round(chern_raw))
    if abs(chern_raw - chern) > 1e-6:
        raise ValueError("Nonintegral lattice Chern number")
    # The mass-sign (Dirac-point) phase diagram is an independent check on a
    # mesh that may be too coarse near m = -2, 0, +2.
    analytic_chern = -1 if -2 < mass < 0 else 1 if 0 < mass < 2 else 0
    resolved = chern == analytic_chern
    # Independent continuous two-band curvature at cell centers, integrated by
    # a midpoint quadrature. This converges with mesh refinement; FHS is integer.
    halfstep = np.pi / grid
    cx, cy = np.meshgrid(k + halfstep, k + halfstep, indexing="ij")
    sx, sy = np.sin(cx), np.sin(cy)
    cosx, cosy = np.cos(cx), np.cos(cy)
    z = mass + cosx + cosy
    norm = np.sqrt(sx * sx + sy * sy + z * z)
    curvature = -0.5 * (sx * sx * cosy + sy * sy * cosx + z * cosx * cosy) / norm ** 3
    integral = float(np.sum(curvature) * (2 * np.pi / grid) ** 2 / (2 * np.pi))
    return {"kind": "qwz", "bulkGap": float(gap), "sampledGap": sampled_gap,
            "gapClosed": False, "chern": chern if resolved else None,
            "latticeChern": chern, "analyticChern": analytic_chern,
            "meshResolved": resolved, "chernIntegral": integral,
            "berryCurvature": curvature.ravel().tolist(), **bands}


def bhz_analysis(np, parameters):
    """Spin-conserving square-lattice BHZ regularization, A=B=1, epsilon=0.

    h(k)=sin(kx) sigma_x - sin(ky) sigma_y +
         [M-2(2-cos(kx)-cos(ky))] sigma_z; H=diag(h(k),h*(-k)).
    This bounded slice does not model edges, spin mixing, or continuum k outside
    the Brillouin zone. The Z2 parity is valid only for separated occupied bands.
    """
    mass, grid = parameters["mass"], parameters["grid"]
    k = -np.pi + 2 * np.pi * np.arange(grid) / grid
    kx, ky = np.meshgrid(k, k, indexing="ij")
    dx, dy = np.sin(kx), -np.sin(ky)
    dz = mass - 2 * (2 - np.cos(kx) - np.cos(ky))
    energy = np.sqrt(dx * dx + dy * dy + dz * dz)
    sampled_gap = float(2 * np.min(energy))
    closed = min(abs(mass), abs(mass - 4), abs(mass - 8)) < 1e-10
    bands = {"bandKValues": k.tolist(),
             "bandEnergies": [(-energy).ravel().tolist(), (-energy).ravel().tolist(),
                              energy.ravel().tolist(), energy.ravel().tolist()]}
    if closed:
        return {"kind": "bhz", "bulkGap": 0.0, "sampledGap": sampled_gap,
                "gapClosed": True, "blockChern": None, "partnerChern": None,
                "expectedBlockChern": None, "z2": None, "meshResolved": False, **bands}
    block = np.empty((grid, grid, 2, 2), dtype=np.complex128)
    block[..., 0, 0], block[..., 1, 1] = dz, -dz
    block[..., 0, 1], block[..., 1, 0] = dx - 1j * dy, dx + 1j * dy
    partner = np.empty_like(block)
    partner[..., 0, 0], partner[..., 1, 1] = dz, -dz
    # h*(-k) evaluated on the same mesh (do not infer the partner Chern by sign).
    partner[..., 0, 1] = -dx - 1j * dy
    partner[..., 1, 0] = -dx + 1j * dy
    for matrix in (block, partner):
        if not np.allclose(matrix, np.swapaxes(np.conj(matrix), -1, -2)):
            raise ValueError("BHZ block is not Hermitian")

    def lattice_chern(matrix):
        _, vectors = np.linalg.eigh(matrix)
        occupied = vectors[..., :, 0]
        ux = np.sum(np.conj(occupied) * np.roll(occupied, -1, axis=0), axis=-1)
        uy = np.sum(np.conj(occupied) * np.roll(occupied, -1, axis=1), axis=-1)
        if min(float(np.min(abs(ux))), float(np.min(abs(uy)))) < 1e-10:
            raise ValueError("BHZ momentum mesh crosses a singular link; refine the grid")
        ux, uy = ux / abs(ux), uy / abs(uy)
        plaquette = ux * np.roll(uy, -1, axis=0) * np.conj(np.roll(ux, -1, axis=1)) * np.conj(uy)
        raw = float(np.sum(np.angle(plaquette)) / (2 * np.pi))
        integer = int(round(raw))
        if abs(raw - integer) > 1e-6:
            raise ValueError("Nonintegral BHZ block Chern number")
        return integer

    first, second = lattice_chern(block), lattice_chern(partner)
    # Independent Dirac-mass phase check: signs at Gamma, X/Y, and M.
    expected = 1 if 0 < mass < 4 else -1 if 4 < mass < 8 else 0
    resolved = first == expected and second == -first
    return {"kind": "bhz", "bulkGap": sampled_gap, "sampledGap": sampled_gap,
            "gapClosed": False, "blockChern": first, "partnerChern": second,
            "expectedBlockChern": expected, "z2": abs(first) % 2 if resolved else None,
            "meshResolved": resolved, **bands}


def bhz_general_analysis(np, parameters):
    """Atlas BHZ continuum plus a declared a=1 lattice/ribbon regularization.

    The optional R term is an inversion- and time-reversal-symmetric extension:
    R tau_x (sin(kx) s_x + sin(ky) s_y), with spin-major basis
    (E+, H+, E-, H-). It is zero for the exact block-diagonal Atlas model.
    """
    a, b, c, d, mass, mixing = (parameters[key] for key in ("A", "B", "C", "D", "M", "R"))
    grid, cells, edge_samples = (parameters[key] for key in ("grid", "edgeCells", "edgeSamples"))
    extent = parameters["continuumExtent"]
    if abs(mixing) > a / 2:
        raise ValueError("BHZ spin mixing exceeds the bounded gap-preserving range")
    tau_x = np.array([[0., 1.], [1., 0.]])
    spin_z = np.diag([1., 1., -1., -1.])
    spin_x = np.kron(np.array([[0., 1.], [1., 0.]]), np.eye(2))
    spin_y = np.kron(np.array([[0., -1j], [1j, 0.]]), np.eye(2))

    def matrix(kx, ky, continuum=False):
        if continuum:
            x, y, q2 = kx, ky, kx * kx + ky * ky
        else:
            x, y = np.sin(kx), np.sin(ky)
            q2 = 2 * (2 - np.cos(kx) - np.cos(ky))
        epsilon, z = c - d * q2, mass - b * q2
        first = np.array([[epsilon + z, a * (x + 1j * y)],
                          [a * (x - 1j * y), epsilon - z]], dtype=complex)
        partner = np.array([[epsilon + z, a * (-x + 1j * y)],
                            [a * (-x - 1j * y), epsilon - z]], dtype=complex)
        off = mixing * (x - 1j * y) * tau_x
        return np.block([[first, off], [off.conj().T, partner]])

    lattice_k = (-np.pi + 2 * np.pi * np.arange(grid) / grid).tolist()
    continuum_k = np.linspace(-extent, extent, grid).tolist()
    lattice_bands = [[] for _ in range(4)]
    continuum_bands = [[] for _ in range(4)]
    sampled_gap = float("inf")
    for i, kx in enumerate(lattice_k):
        for ky in lattice_k:
            energies = np.linalg.eigvalsh(matrix(kx, ky))
            sampled_gap = min(sampled_gap, float(energies[2] - energies[1]))
            for n in range(4):
                lattice_bands[n].append(float(energies[n]))
        for ky in continuum_k:
            energies = np.linalg.eigvalsh(matrix(continuum_k[i], ky, True))
            for n in range(4):
                continuum_bands[n].append(float(energies[n]))

    # The inversion eigenvalues at the four TRIM are fixed by M(k). The R term
    # vanishes there; the two X/Y factors cancel in the Fu-Kane product.
    masses = [mass, mass - 4 * b, mass - 4 * b, mass - 8 * b]
    closed = any(abs(value) < 1e-9 for value in masses)
    fine = -np.pi + 2 * np.pi * np.arange(2 * grid + 1) / (2 * grid + 1)
    fine_gap = float("inf")
    for kx in fine:
        for ky in fine:
            energies = np.linalg.eigvalsh(matrix(kx, ky))
            fine_gap = min(fine_gap, float(energies[2] - energies[1]))
    resolved = not closed and fine_gap > 0.02 and abs(fine_gap - sampled_gap) < 0.18
    parity = [1 if value > 0 else -1 if value < 0 else 0 for value in masses]
    z2 = int(np.prod(parity) < 0) if resolved else None

    block_chern = partner_chern = None
    if mixing == 0 and not closed:
        block = np.empty((grid, grid, 2, 2), dtype=complex)
        partner = np.empty_like(block)
        for i, kx in enumerate(lattice_k):
            for j, ky in enumerate(lattice_k):
                h = matrix(kx, ky)
                block[i, j], partner[i, j] = h[:2, :2], h[2:, 2:]
        def chern(matrices):
            _, vec = np.linalg.eigh(matrices)
            occupied = vec[..., :, 0]
            ux = np.sum(occupied.conj() * np.roll(occupied, -1, axis=0), axis=-1)
            uy = np.sum(occupied.conj() * np.roll(occupied, -1, axis=1), axis=-1)
            if min(float(np.min(abs(ux))), float(np.min(abs(uy)))) < 1e-10:
                return None
            ux, uy = ux / abs(ux), uy / abs(uy)
            return int(round(float(np.sum(np.angle(ux * np.roll(uy, -1, axis=0) *
                np.conj(np.roll(ux, -1, axis=1)) * np.conj(uy))) / (2 * np.pi))))
        block_chern, partner_chern = chern(block), chern(partner)
        if resolved and (block_chern is None or partner_chern != -block_chern or
                         abs(block_chern) % 2 != z2):
            resolved, z2 = False, None

    # Store one full set of normalized complex bulk eigenvectors at an explicit
    # off-TRIM momentum. Degenerate gauge choices are never used as invariants.
    bulk_index = [min(grid - 1, grid // 2 + 2), min(grid - 1, grid // 2 + 1)]
    bulk_k = [lattice_k[bulk_index[0]], lattice_k[bulk_index[1]]]
    bulk_energy, bulk_vectors = np.linalg.eigh(matrix(*bulk_k))
    def state(energy, vector, edge_weight=None):
        spin = [float(np.real(np.vdot(vector, (np.kron(np.eye(cells), operator)
                if edge_weight is not None else operator) @ vector))) for operator in
                (spin_x, spin_y, spin_z)]
        out = {"energy": float(energy), "spin": spin,
               "amplitudes": [[float(v.real), float(v.imag)] for v in vector]}
        if edge_weight is not None:
            density = np.sum(abs(vector.reshape(cells, 4)) ** 2, axis=1)
            out.update({"density": density.tolist(), "edgeWeight": float(edge_weight)})
        return out
    bulk_states = [state(energy, bulk_vectors[:, i]) for i, energy in enumerate(bulk_energy)]

    edge_k = np.linspace(-np.pi, np.pi, edge_samples).tolist()
    edge_energies, edge_weights = [], []
    selected_edge_states = []
    selected_index = edge_samples // 2 + 1
    for index, kx in enumerate(edge_k):
        zero = matrix(kx, 0.)
        pi = matrix(kx, np.pi)
        sine = (matrix(kx, np.pi / 2) - matrix(kx, -np.pi / 2)) / 2
        onsite = (zero + pi) / 2
        hopping = ((zero - pi) / 2 - 1j * sine) / 2
        ribbon = np.zeros((4 * cells, 4 * cells), dtype=complex)
        for cell in range(cells):
            sl = slice(4 * cell, 4 * cell + 4)
            ribbon[sl, sl] = onsite
            if cell + 1 < cells:
                nxt = slice(4 * (cell + 1), 4 * (cell + 2))
                ribbon[sl, nxt], ribbon[nxt, sl] = hopping, hopping.conj().T
        energies, vectors = np.linalg.eigh(ribbon)
        weights = (abs(vectors[:8, :]) ** 2).sum(axis=0) + (abs(vectors[-8:, :]) ** 2).sum(axis=0)
        edge_energies.append(energies.tolist())
        edge_weights.append(weights.tolist())
        if index == selected_index:
            center = 2 * cells
            selected_edge_states = [state(energies[n], vectors[:, n], weights[n])
                                    for n in range(center - 2, center + 2)]

    return {"kind": "bhz_general", "bulkGap": 0. if closed else fine_gap,
            "sampledGap": sampled_gap, "gapClosed": closed, "meshResolved": resolved,
            "z2": z2, "paritySigns": parity, "blockChern": block_chern,
            "partnerChern": partner_chern, "latticeKValues": lattice_k,
            "latticeBandEnergies": lattice_bands, "continuumKValues": continuum_k,
            "continuumBandEnergies": continuum_bands,
            "bulkStateK": bulk_k, "bulkStates": bulk_states,
            "edge": {"kValues": edge_k, "energies": edge_energies,
                     "weights": edge_weights, "selectedKIndex": selected_index,
                     "states": selected_edge_states}}


def bbh_matrices(np, parameters):
    """Atlas BBH pi-flux convention, with four anticommuting Hermitian Gamma matrices."""
    sx = np.array([[0, 1], [1, 0]], dtype=complex)
    sy = np.array([[0, -1j], [1j, 0]], dtype=complex)
    sz = np.diag([1, -1]).astype(complex)
    identity = np.eye(2, dtype=complex)
    g1, g2, g3 = (-np.kron(sy, s) for s in (sx, sy, sz))
    g4 = np.kron(sx, identity)
    onsite = parameters["gammaX"] * g4 + parameters["gammaY"] * g2
    tx = parameters["lambdaX"] * (g4 - 1j * g3) / 2
    ty = parameters["lambdaY"] * (g2 - 1j * g1) / 2
    return onsite, tx, ty


def bbh_bulk_matrix(np, parameters, kx, ky):
    onsite, tx, ty = bbh_matrices(np, parameters)
    return onsite + np.exp(1j * kx) * tx + np.exp(-1j * kx) * tx.conj().T + \
        np.exp(1j * ky) * ty + np.exp(-1j * ky) * ty.conj().T


def bbh_open_matrix(np, parameters):
    cells = parameters["cells"]
    onsite, tx, ty = bbh_matrices(np, parameters)
    matrix = np.zeros((4 * cells * cells, 4 * cells * cells), dtype=complex)
    for x in range(cells):
        for y in range(cells):
            index = 4 * (x * cells + y)
            matrix[index:index + 4, index:index + 4] = onsite
            for dx, dy, hopping in ((1, 0, tx), (0, 1, ty)):
                if x + dx < cells and y + dy < cells:
                    other = 4 * ((x + dx) * cells + y + dy)
                    matrix[other:other + 4, index:index + 4] = hopping
                    matrix[index:index + 4, other:other + 4] = hopping.conj().T
    return matrix


def bbh_analysis(np, parameters):
    """Periodic four-band samples and four finite open-lattice midgap states.

    Corner density is an observation of this finite Hamiltonian, not a bulk
    quadrupole invariant or an inferred phase label.
    """
    grid, cells = parameters["grid"], parameters["cells"]
    k = -np.pi + 2 * np.pi * np.arange(grid) / grid
    bands = [[] for _ in range(4)]
    gap = float("inf")
    for kx in k:
        for ky in k:
            energies = np.linalg.eigvalsh(bbh_bulk_matrix(np, parameters, kx, ky))
            gap = min(gap, float(energies[2] - energies[1]))
            for index, energy in enumerate(energies):
                bands[index].append(float(energy))
    energies, vectors = np.linalg.eigh(bbh_open_matrix(np, parameters))
    middle = 2 * cells * cells
    selected = list(range(middle - 2, middle + 2))
    densities = []
    for index in selected:
        density = np.sum(abs(vectors[:, index].reshape(cells * cells, 4)) ** 2, axis=1)
        densities.append(density)
    average = np.mean(densities, axis=0)
    corners = [0, cells - 1, cells * (cells - 1), cells * cells - 1]
    return {"kind": "bbh", "bulkGap": gap, "bandKValues": k.tolist(),
            "bandEnergies": bands, "finite": {"cells": cells,
            "midgapEnergies": [float(energies[index]) for index in selected],
            "midgapDensity": average.tolist(),
            "cornerWeight": float(np.sum(average[corners]))}}


def kitaev_bulk_matrix(np, parameters, k):
    """Spinless nearest-neighbor BdG matrix in the (c_k, c†_-k) basis."""
    xi = -parameters["mu"] - 2 * parameters["hopping"] * np.cos(k)
    pair = 2j * parameters["pairing"] * np.sin(k)
    return np.array([[xi, pair], [np.conj(pair), -xi]], dtype=complex)


def kitaev_open_matrix(np, parameters):
    """Open chain; no bond joins the first and last sites."""
    cells = parameters["cells"]
    normal = np.diag(np.full(cells, -parameters["mu"]))
    pairing = np.zeros((cells, cells))
    for site in range(cells - 1):
        normal[site, site + 1] = normal[site + 1, site] = -parameters["hopping"]
        pairing[site, site + 1] = parameters["pairing"]
        pairing[site + 1, site] = -parameters["pairing"]
    return np.block([[normal, pairing], [-pairing, -normal.T]])


def kitaev_analysis(np, parameters):
    """Periodic bands and finite open-chain density, without a phase invariant."""
    cells, points = parameters["cells"], parameters["kPoints"]
    k = np.linspace(-np.pi, np.pi, points)
    bands = np.array([np.linalg.eigvalsh(kitaev_bulk_matrix(np, parameters, value)) for value in k])
    energies, vectors = np.linalg.eigh(kitaev_open_matrix(np, parameters))
    selected = (cells - 1, cells)
    density = np.mean([abs(vectors[:cells, index]) ** 2 + abs(vectors[cells:, index]) ** 2
                       for index in selected], axis=0)
    # Minimize E²=(mu+2t cos k)²+4 Delta²(1-cos² k) on [-1,1].
    mu, hopping, pairing = (parameters[key] for key in ("mu", "hopping", "pairing"))
    candidates = [-1., 1.]
    curvature = hopping * hopping - pairing * pairing
    if curvature > 0:
        candidates.append(float(np.clip(-mu * hopping / (2 * curvature), -1., 1.)))
    exact_gap = 2 * min(np.sqrt((mu + 2 * hopping * x) ** 2 +
                                 4 * pairing * pairing * (1 - x * x)) for x in candidates)
    return {"kind": "kitaev_chain", "bulkGap": float(exact_gap),
            "sampledGap": float(np.min(bands[:, 1] - bands[:, 0])),
            "gapClosed": bool(exact_gap < 1e-10), "kValues": k.tolist(),
            "lowerBand": bands[:, 0].tolist(), "upperBand": bands[:, 1].tolist(),
            "finite": {"cells": cells, "nearZeroEnergies": [float(energies[i]) for i in selected],
                       "siteDensity": density.tolist(), "endWeight": float(density[0] + density[-1])}}


def solve(job):
    validate("quantum-job", job)
    if job["operation"] != "topology" or job["engine"] != "native":
        raise ValueError("Expected native topology job")
    started = perf_counter()
    np, scipy, _ = libraries()
    model = job["model"]
    if model["type"] == "ssh":
        analysis = ssh_analysis(np, model["parameters"])
    elif model["type"] == "qwz":
        analysis = qwz_analysis(np, model["parameters"])
    elif model["type"] == "bhz":
        analysis = bhz_analysis(np, model["parameters"])
    elif model["type"] == "bhz_general":
        analysis = bhz_general_analysis(np, model["parameters"])
    elif model["type"] == "bbh":
        analysis = bbh_analysis(np, model["parameters"])
    elif model["type"] == "kitaev_chain":
        analysis = kitaev_analysis(np, model["parameters"])
    else:
        raise ValueError("Unsupported topology model")
    result = {"schema": "quantum-result/v1", "jobId": job["jobId"], "runId": "run-" + uuid4().hex,
              "status": "completed", "operation": "topology", "model": model,
              "engine": {"name": "native", "version": scipy.__version__}, "analysis": analysis,
              "provenance": {"pythonVersion": platform.python_version(), "workerVersion": __version__,
                             "computedAt": datetime.now(timezone.utc).isoformat(),
                             "durationMs": (perf_counter() - started) * 1000}}
    validate("quantum-result", result)
    return result
