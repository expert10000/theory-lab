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


def bbh_wilson_diagnostics(np, parameters, occupied_gauge=None):
    """Two occupied-band Wilson loops and nested one-band sector polarizations.

    The polar-decomposed overlap is unitary and covariant under an arbitrary
    local U(2) rotation of the occupied frame. The periodic seam is included.
    Sector labels use the signed Wilson eigenphase; an unresolved Wannier
    gap suppresses polarization rather than assigning an arbitrary sector.
    """
    grid = parameters["grid"]
    momenta = -np.pi + 2 * np.pi * np.arange(grid) / grid
    occupied = {}
    for ix, kx in enumerate(momenta):
        for iy, ky in enumerate(momenta):
            frame = np.linalg.eigh(bbh_bulk_matrix(np, parameters, kx, ky))[1][:, :2]
            if occupied_gauge is not None:
                frame = frame @ occupied_gauge(ix, iy)
            occupied[ix, iy] = frame

    weakest_link = 1.
    def unitary_overlap(left, right):
        nonlocal weakest_link
        u, singular, vh = np.linalg.svd(left.conj().T @ right)
        weakest_link = min(weakest_link, float(min(singular)))
        return u @ vh

    def direction(axis):
        sectors = [[], []]
        phases = [[], []]
        separation = float("inf")
        for transverse in range(grid):
            frames = [occupied[step, transverse] if axis == "x" else occupied[transverse, step]
                      for step in range(grid)]
            loop = np.eye(2, dtype=complex)
            for step in range(grid):
                loop = loop @ unitary_overlap(frames[step], frames[(step + 1) % grid])
            values, vectors = np.linalg.eig(loop)
            centers = np.angle(values) / (2 * np.pi)
            order = np.argsort(centers)
            centers = centers[order]
            delta = abs(centers[1] - centers[0])
            separation = min(separation, float(min(delta, 1 - delta)))
            for sector, column in enumerate(order):
                phases[sector].append(float(centers[sector]))
                sectors[sector].append(frames[0] @ vectors[:, column])
        return phases, sectors, separation

    x_phases, x_states, x_gap = direction("x")
    y_phases, y_states, y_gap = direction("y")
    exact_gap = 2 * np.hypot(abs(parameters["gammaX"]) - parameters["lambdaX"],
                             abs(parameters["gammaY"]) - parameters["lambdaY"])
    defined = bool(exact_gap > 1e-8 and min(x_gap, y_gap, weakest_link) > 1e-6)

    def nested(states):
        loop = 1 + 0j
        for index in range(grid):
            overlap = np.vdot(states[index], states[(index + 1) % grid])
            if abs(overlap) < 1e-10:
                return None
            loop *= overlap / abs(overlap)
        value = float((-np.angle(loop) / (2 * np.pi)) % 1)
        return 0. if min(value, 1 - value) < 1e-9 else value

    x_nested = [nested(states) if defined else None for states in x_states]
    y_nested = [nested(states) if defined else None for states in y_states]
    defined = defined and all(value is not None for value in x_nested + y_nested)
    if not defined:
        x_nested, y_nested = [None, None], [None, None]
    return {"bulkGapExact": float(exact_gap),
            "wannierGapX": float(x_gap), "wannierGapY": float(y_gap),
            "minOccupiedLinkSingular": weakest_link,
            "wannierX": x_phases, "wannierY": y_phases,
            "nestedX": x_nested, "nestedY": y_nested, "defined": defined}


def bbh_analysis(np, parameters):
    """Periodic four-band samples and four finite open-lattice midgap states.

    Nested Wilson loops diagnose the periodic bulk independently of the
    finite corner density. Unresolved bulk/Wannier gaps withhold the invariant.
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
    wilson = bbh_wilson_diagnostics(np, parameters)
    def quantized(pair):
        if any(value is None for value in pair):
            return None
        if all(min(value, 1 - value) < 1e-3 for value in pair):
            return 0.
        if all(abs(value - .5) < 1e-3 for value in pair):
            return .5
        return None
    px, py = quantized(wilson["nestedY"]), quantized(wilson["nestedX"])
    quadrupole = px if px is not None and px == py else None
    wilson["quadrupole"] = quadrupole
    wilson["status"] = ("defined" if quadrupole is not None else
                        "bulk-gap-closed" if wilson["bulkGapExact"] <= 1e-8 else
                        "wannier-gap-closed" if min(wilson["wannierGapX"], wilson["wannierGapY"]) <= 1e-6 else
                        "unresolved")
    return {"kind": "bbh", "bulkGap": gap, "bandKValues": k.tolist(),
            "bandEnergies": bands, "wilson": wilson, "finite": {"cells": cells,
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
    """Periodic BdG bands and independent bulk invariant plus finite density."""
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
    # In the stated Nambu basis H=xi*tau_z-2*Delta*sin(k)*tau_y.
    # The real-pairing chiral curve q=xi-2i*Delta*sin(k) winds anticlockwise
    # once as k grows from -pi to pi in the nontrivial phase (Delta>0).
    xi = -mu - 2 * hopping * np.cos(k)
    dy = -2 * pairing * np.sin(k)
    q = xi + 1j * dy
    pfaffian_signs = [int(np.sign(-mu-2*hopping)), int(np.sign(-mu+2*hopping))]
    closed = bool(exact_gap < 1e-10)
    if closed:
        parity, winding, max_step, status = None, None, None, "bulk-gap-closed"
    else:
        parity = int(pfaffian_signs[0] != pfaffian_signs[1])
        steps = np.angle(q[1:] / q[:-1])
        turns = float(np.sum(steps) / (2*np.pi))
        max_step = float(np.max(np.abs(steps)))
        candidate = int(round(turns))
        resolved = (abs(turns-candidate) < 1e-8 and
                    max_step < np.pi/2 and candidate in (0, 1) and
                    candidate % 2 == parity)
        winding = candidate if resolved else None
        status = "defined" if resolved else "mesh-unresolved"
    invariant = {"method": "Pfaffian signs at k=0,pi; chiral q winding on sampled periodic mesh",
                 "pfaffianSigns": pfaffian_signs, "parity": parity,
                 "winding": winding, "status": status, "maxPhaseStep": max_step,
                 "curveX": xi.tolist(), "curveY": dy.tolist()}
    return {"kind": "kitaev_chain", "bulkGap": float(exact_gap),
            "sampledGap": float(np.min(bands[:, 1] - bands[:, 0])),
            "gapClosed": bool(exact_gap < 1e-10), "kValues": k.tolist(),
            "lowerBand": bands[:, 0].tolist(), "upperBand": bands[:, 1].tolist(),
            "invariant": invariant,
            "finite": {"cells": cells, "nearZeroEnergies": [float(energies[i]) for i in selected],
                       "siteDensity": density.tolist(), "endWeight": float(density[0] + density[-1])}}


def weyl_matrix(np, velocity, chirality, q):
    """Atlas linearized H_chi(q)=chi*v*q.sigma, not a periodic lattice."""
    x, y, z = q
    return chirality * velocity * np.array([[z, x - 1j*y], [x + 1j*y, -z]], complex)


def weyl_sphere(np, subdivisions):
    """Deterministic outward icosphere; no periodic seam or lattice inferred."""
    from scipy.spatial import ConvexHull
    golden = (1 + np.sqrt(5)) / 2
    vertices = np.array([(0, y, z*golden) for y in (-1, 1) for z in (-1, 1)] +
                        [(x, y*golden, 0) for x in (-1, 1) for y in (-1, 1)] +
                        [(x*golden, 0, z) for x in (-1, 1) for z in (-1, 1)], float)
    vertices /= np.linalg.norm(vertices, axis=1)[:, None]
    faces = ConvexHull(vertices).simplices.tolist()
    faces = [face if np.dot(np.cross(vertices[face[1]]-vertices[face[0]],
                                    vertices[face[2]]-vertices[face[0]]),
                                np.mean(vertices[face], axis=0)) > 0
             else [face[0], face[2], face[1]] for face in faces]
    points = vertices.tolist()
    for _ in range(subdivisions):
        midpoints, refined = {}, []
        def midpoint(a, b):
            edge = tuple(sorted((a, b)))
            if edge not in midpoints:
                p = np.array(points[a]) + np.array(points[b])
                midpoints[edge] = len(points)
                points.append((p / np.linalg.norm(p)).tolist())
            return midpoints[edge]
        for a, b, c in faces:
            ab, bc, ca = midpoint(a, b), midpoint(b, c), midpoint(c, a)
            refined.extend([[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]])
        faces = refined
    return np.array(points), faces


def weyl_link_flux(np, eigenvectors, faces):
    """Gauge-invariant occupied-band Wilson triangles on an oriented sphere."""
    fluxes, minimum_link = [], 1.
    for a, b, c in faces:
        links = [np.vdot(eigenvectors[i], eigenvectors[j]) for i, j in ((a,b),(b,c),(c,a))]
        minimum_link = min(minimum_link, *(abs(link) for link in links))
        fluxes.append(float(np.angle(links[0]*links[1]*links[2])))
    return fluxes, minimum_link


def weyl_analysis(np, parameters):
    velocity, chirality, radius = (parameters[key] for key in ("velocity", "chirality", "radius"))
    directions, faces = weyl_sphere(np, parameters["subdivisions"])
    points = radius * directions
    eigensystems = [np.linalg.eigh(weyl_matrix(np, velocity, chirality, q)) for q in points]
    lower = [float(energies[0]) for energies, _ in eigensystems]
    upper = [float(energies[1]) for energies, _ in eigensystems]
    occupied = [vectors[:, 0] for _, vectors in eigensystems]
    face_flux, minimum_link = weyl_link_flux(np, occupied, faces)
    flux = float(sum(face_flux))
    measured = flux / (2*np.pi)
    resolved = bool(minimum_link > .01 and abs(measured + chirality) < .01)
    # The lower-band Berry field is -chi*q/(2|q|^3); the upper has opposite sign.
    curvature_array = -chirality * directions / (2*radius*radius)
    curvature_array[np.abs(curvature_array) < 1e-15] = 0.0
    curvature = curvature_array.tolist()
    return {"kind": "weyl_minimal", "node": [0., 0., 0.],
            "chirality": int(chirality), "lowerChern": int(-chirality) if resolved else None,
            "flux": flux, "meshResolved": resolved, "minimumLink": float(minimum_link),
            "sphereGap": float(2*velocity*radius), "positions": points.tolist(),
            "triangles": faces, "lowerBand": lower, "upperBand": upper,
            "berryCurvature": curvature, "faceFlux": face_flux}


def nodal_matrix(np, mass, curvature, velocity, q):
    """Atlas continuum H=[m-B(kx²+ky²)]sigma_x+v*kz*sigma_z."""
    x, y, z = q
    radial = mass-curvature*(x*x+y*y)
    return np.array([[velocity*z, radial], [radial, -velocity*z]], complex)


def nodal_analysis(np, parameters):
    mass, curvature, velocity = (parameters[key] for key in ("mass", "curvature", "velocity"))
    center, radius, samples = (parameters[key] for key in ("loopCenter", "loopRadius", "samples"))
    ring_radius = float(np.sqrt(mass/curvature)) if mass > 0 else None
    ring = [[ring_radius*float(np.cos(t)), ring_radius*float(np.sin(t)), 0.]
            for t in np.linspace(0, 2*np.pi, 64, endpoint=False)] if ring_radius is not None else []
    ring = [[0. if abs(v) < 1e-15 else v for v in q] for q in ring]
    def sampled(count):
        angles = np.linspace(0, 2*np.pi, count, endpoint=False)
        points = [[float(center+radius*np.cos(t)), 0., float(radius*np.sin(t))] for t in angles]
        energies = [np.linalg.eigh(nodal_matrix(np, mass, curvature, velocity, q)) for q in points]
        lower = [0. if abs(e[0][0]) < 1e-15 else float(e[0][0]) for e in energies]
        upper = [0. if abs(e[0][1]) < 1e-15 else float(e[0][1]) for e in energies]
        return points, lower, upper, [e[1][:, 0] for e in energies]
    points, lower, upper, occupied = sampled(samples)
    # An exact path/node intersection cannot have an occupied-band Berry phase.
    node_radius = ring_radius if ring_radius is not None else (0. if mass == 0 else None)
    gap_closed = node_radius is not None and any(
        abs(abs(center+sign*radius)-node_radius) < 1e-9 for sign in (-1, 1))
    gap = float(min(u-l for u, l in zip(upper, lower)))
    if gap_closed:
        return {"kind":"nodal_line_two_band", "ringRadius":ring_radius, "ringPositions":ring,
                "loopPositions":points, "lowerBand":lower, "upperBand":upper,
                "loopGap":0., "berryPhase":None, "winding":None,
                "minimumLink":None, "convergenceError":None, "status":"gap-closed"}
    def wilson(vectors):
        links = [np.vdot(vectors[i], vectors[(i+1)%len(vectors)]) for i in range(len(vectors))]
        return float(abs(np.angle(np.prod([link/abs(link) for link in links])))), float(min(map(abs, links)))
    phase, minimum_link = wilson(occupied)
    _, _, _, fine_vectors = sampled(2*samples)
    fine_phase, _ = wilson(fine_vectors)
    # Independent analytic map of the loop into the real (sigma_x,sigma_z) plane.
    angle = [np.arctan2(velocity*q[2], mass-curvature*q[0]*q[0]) for q in points]
    angle.append(angle[0])
    winding = int(round(float(np.diff(np.unwrap(angle)).sum()/(2*np.pi))))
    expected = np.pi*(abs(winding)%2)
    error = float(abs(phase-fine_phase))
    resolved = minimum_link > .01 and abs(phase-expected) < .01 and error < .01
    return {"kind":"nodal_line_two_band", "ringRadius":ring_radius, "ringPositions":ring,
            "loopPositions":points, "lowerBand":lower, "upperBand":upper,
            "loopGap":gap, "berryPhase":phase if resolved else None,
            "winding":winding if resolved else None, "minimumLink":minimum_link,
            "convergenceError":error, "status":"defined" if resolved else "mesh-unresolved"}


def landau_finite_difference(np, mass, charge, field, levels, grid):
    """Independent Landau-gauge, k_y=0 oscillator on a bounded Dirichlet grid."""
    from scipy.linalg import eigh_tridiagonal
    magnetic_length = 1 / np.sqrt(abs(charge * field))
    extent = np.sqrt(2 * (levels + 6)) * magnetic_length
    spacing = 2 * extent / (grid + 1)
    x = np.linspace(-extent + spacing, extent - spacing, grid)
    diagonal = 1 / (mass * spacing**2) + (charge * field * x)**2 / (2 * mass)
    adjacent = np.full(grid - 1, -1 / (2 * mass * spacing**2))
    return eigh_tridiagonal(diagonal, adjacent, select="i", select_range=(0, levels - 1),
                            eigvals_only=True)


def landau_analysis(np, parameters):
    """Uniform 2D continuum field, hbar=1; no filling, boundary, or Hall response."""
    mass, charge = parameters["mass"], parameters["charge"]
    start, stop = parameters["fieldStart"], parameters["fieldStop"]
    count, levels, grid = (parameters[key] for key in ("fieldSamples", "levels", "grid"))
    if mass <= 0 or charge not in (-1, 1) or start * stop <= 0:
        raise ValueError("Landau field must remain nonzero with a fixed sign")
    fields = np.linspace(start, stop, count)
    energies, frequencies, coarse_errors, fine_errors = [], [], [], []
    for field in fields:
        frequency = abs(charge * field) / mass
        exact = frequency * (np.arange(levels) + .5)
        coarse = landau_finite_difference(np, mass, charge, field, levels, grid)
        fine = landau_finite_difference(np, mass, charge, field, levels, 2 * grid)
        frequencies.append(float(frequency))
        energies.append(exact.tolist())
        coarse_errors.append(float(np.max(np.abs(coarse - exact))))
        fine_errors.append(float(np.max(np.abs(fine - exact))))
    return {"kind": "landau_continuum", "fieldValues": fields.tolist(),
            "levelIndices": list(range(levels)), "energies": energies,
            "cyclotronFrequencies": frequencies, "coarseMaxErrors": coarse_errors,
            "fineMaxErrors": fine_errors, "converged": bool(all(
                fine < coarse and fine < .05 for coarse, fine in zip(coarse_errors, fine_errors))),
            "units": {"field": "normalized magnetic field", "energy": "normalized energy",
                      "hbar": "1", "mass": "normalized mass", "charge": "elementary charge"}}


def hofstadter_matrix(np, hopping, p, q, kx, ky):
    """Square-lattice Landau-gauge magnetic Bloch matrix; flux alpha=p/q."""
    phase = 2 * np.pi * p / q
    matrix = np.zeros((q, q), dtype=complex)
    for site in range(q):
        matrix[site, site] = -2 * hopping * np.cos(ky + phase * site)
    if q == 1:
        matrix[0, 0] -= 2 * hopping * np.cos(kx)
    else:
        for site in range(q - 1):
            matrix[site, site + 1] -= hopping
            matrix[site + 1, site] -= hopping
        boundary = -hopping * np.exp(1j * q * kx)
        matrix[q - 1, 0] += boundary
        matrix[0, q - 1] += boundary.conjugate()
    return matrix


def hofstadter_strip_matrix(np, hopping, p, q, ky, cells):
    """Landau-gauge Harper strip, open along x and Bloch-periodic along y."""
    sites = np.arange(cells)
    onsite = -2 * hopping * np.cos(ky + 2 * np.pi * p * sites / q)
    matrix = np.diag(onsite).astype(complex)
    offdiagonal = np.full(cells - 1, -hopping)
    matrix += np.diag(offdiagonal, 1) + np.diag(offdiagonal, -1)
    return matrix


def hofstadter_strip_analysis(np, p, q, hopping, cells, samples):
    """Exact finite-strip eigenvalues and separately measured boundary weights."""
    if not (isinstance(cells, int) and 12 <= cells <= 32 and
            isinstance(samples, int) and 11 <= samples <= 31 and samples % 2 == 1):
        raise ValueError("Hofstadter strip requires 12..32 open sites and 11..31 odd ky samples")
    ky_values = np.linspace(-np.pi, np.pi, samples)
    energies = [[] for _ in range(cells)]
    left = [[] for _ in range(cells)]
    right = [[] for _ in range(cells)]
    residual = 0.
    norm_error = 0.
    for ky in ky_values:
        matrix = hofstadter_strip_matrix(np, hopping, p, q, ky, cells)
        values, vectors = np.linalg.eigh(matrix)
        residual = max(residual, float(np.max(np.linalg.norm(
            matrix @ vectors - vectors * values, axis=0))))
        norm_error = max(norm_error, float(np.max(np.abs(
            np.sum(np.abs(vectors)**2, axis=0) - 1))))
        for state in range(cells):
            energies[state].append(float(values[state]))
            left[state].append(float(np.sum(np.abs(vectors[:2, state])**2)))
            right[state].append(float(np.sum(np.abs(vectors[-2:, state])**2)))
    return {"cells": cells, "kyValues": ky_values.tolist(), "stateIndices": list(range(cells)),
            "energies": energies, "leftWeights": left, "rightWeights": right,
            "edgeSites": 2, "boundary": "open-x / periodic-y", "maxResidual": residual,
            "maxNormError": norm_error}


def occupied_chern_links(np, frames):
    """FHS determinant links on a half-open torus (x then y orientation).

    frames[x,y] has orthonormal occupied columns. Determinants make this
    invariant under arbitrary local U(r) rotations, including seam gauges.
    https://arxiv.org/abs/cond-mat/0503172
    """
    size = frames.shape[0]
    links = np.empty((2, size, size), dtype=complex)
    minimum = 1.
    for x in range(size):
        for y in range(size):
            for axis, neighbor in ((0, frames[(x + 1) % size, y]),
                                   (1, frames[x, (y + 1) % size])):
                overlap = np.linalg.det(frames[x, y].conj().T @ neighbor)
                magnitude = float(abs(overlap))
                minimum = min(minimum, magnitude)
                links[axis, x, y] = overlap / magnitude if magnitude > 1e-12 else 1.
    if minimum <= 1e-12:
        return None, minimum, None
    plaquette = links[0] * np.roll(links[1], -1, axis=0) * \
        np.conj(np.roll(links[0], -1, axis=1)) * np.conj(links[1])
    flux = np.angle(plaquette)
    return float(np.sum(flux) / (2 * np.pi)), minimum, flux.ravel().tolist()


def hofstadter_chern_diagnostics(np, p, q, hopping, grid):
    """Conditional occupied-subspace Chern for every internal magnetic gap."""
    if q == 1:
        return []

    def mesh(size):
        # Half-open magnetic BZ; no duplicate seam row or column in FHS links.
        kx = -np.pi / q + 2 * np.pi * np.arange(size) / (q * size)
        ky = -np.pi + 2 * np.pi * np.arange(size) / size
        energies = np.empty((size, size, q))
        vectors = np.empty((size, size, q, q), complex)
        for x, xx in enumerate(kx):
            for y, yy in enumerate(ky):
                energies[x, y], vectors[x, y] = np.linalg.eigh(
                    hofstadter_matrix(np, hopping, p, q, xx, yy))
        return energies, vectors

    coarse_energy, coarse_vectors = mesh(grid - 1)
    fine_energy, fine_vectors = mesh(2 * (grid - 1))
    output = []
    for occupied in range(1, q):
        gap_index = occupied - 1
        coarse_gap = float(np.min(coarse_energy[:, :, occupied] - coarse_energy[:, :, gap_index]))
        fine_gap = float(np.min(fine_energy[:, :, occupied] - fine_energy[:, :, gap_index]))
        # A sampled touching or near touching cannot support a bulk claim.
        closed = min(coarse_gap, fine_gap) <= 1e-6 * hopping
        coarse = fine = None
        min_link = None
        flux = []
        if not closed:
            coarse, coarse_link, _ = occupied_chern_links(np, coarse_vectors[:, :, :, :occupied])
            fine, fine_link, flux_values = occupied_chern_links(np, fine_vectors[:, :, :, :occupied])
            min_link = min(coarse_link, fine_link)
            flux = flux_values or []
        rounded = None if fine is None else int(round(fine))
        resolved = (not closed and coarse is not None and fine is not None and
                    abs(coarse - round(coarse)) < 1e-6 and
                    abs(fine - rounded) < 1e-6 and
                    int(round(coarse)) == rounded and min_link > 1e-8)
        output.append({"occupiedBands": occupied, "coarseGap": coarse_gap,
                       "fineGap": fine_gap, "coarseChern": coarse,
                       "fineChern": fine, "chern": rounded if resolved else None,
                       "minimumLink": min_link,
                       "status": "gap-closed" if closed else "defined" if resolved else "mesh-unresolved",
                       "mesh": 2 * (grid - 1), "plaquetteFlux": flux if resolved else []})
    return output


def hofstadter_analysis(np, parameters):
    """Bounded periodic spectrum and conditional occupied-gap Chern diagnostics."""
    from math import gcd
    p, q, hopping, grid = (parameters[key] for key in ("p", "q", "hopping", "grid"))
    if (not isinstance(p, int) or not isinstance(q, int) or not isinstance(grid, int)
            or q < 1 or q > 7 or grid < 7 or grid > 15 or grid % 2 != 1
            or hopping <= 0 or (q == 1 and p != 0)
            or (q > 1 and (p == 0 or abs(p) >= q or gcd(abs(p), q) != 1))):
        raise ValueError("Hofstadter requires reduced p/q, bounded odd momentum grid and positive hopping")
    def sampled(size):
        x_values = np.linspace(-np.pi / q, np.pi / q, size)
        y_values = np.linspace(-np.pi, np.pi, size)
        bands = [[] for _ in range(q)]
        for kx in x_values:
            for ky in y_values:
                energies = np.linalg.eigvalsh(hofstadter_matrix(np, hopping, p, q, kx, ky))
                for band, energy in enumerate(energies):
                    bands[band].append(float(energy))
        bounds = [[float(min(band)), float(max(band))] for band in bands]
        return x_values.tolist(), y_values.tolist(), bands, bounds
    kx, ky, bands, coarse_bounds = sampled(grid)
    _, _, _, fine_bounds = sampled(2 * grid - 1)
    drift = [max(abs(coarse[side] - fine[side]) for side in (0, 1))
             for coarse, fine in zip(coarse_bounds, fine_bounds)]
    return {"kind": "hofstadter", "flux": p / q, "kxValues": kx, "kyValues": ky,
            "bandIndices": list(range(q)), "bandEnergies": bands,
            "coarseBounds": coarse_bounds, "fineBounds": fine_bounds,
            "extremaDrift": drift, "converged": bool(max(drift) <= .05 * hopping),
            "chernGaps": hofstadter_chern_diagnostics(np, p, q, hopping, grid),
            "units": {"flux": "flux quanta per plaquette", "momentum": "rad / lattice constant",
                      "energy": "hopping energy"}}


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
    elif model["type"] == "weyl_minimal":
        analysis = weyl_analysis(np, model["parameters"])
    elif model["type"] == "nodal_line_two_band":
        analysis = nodal_analysis(np, model["parameters"])
    elif model["type"] == "landau_continuum":
        analysis = landau_analysis(np, model["parameters"])
    elif model["type"] == "hofstadter":
        analysis = hofstadter_analysis(np, model["parameters"])
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
