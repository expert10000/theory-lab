# R2–R5 — Additive Atlas reconciliation

Canonical source: `48e2036ba7c7dd5c79d54749341a79d41770cbb7`. R1's complete inventory is retained in [ATLAS_RECONCILIATION_R1.md](ATLAS_RECONCILIATION_R1.md).

No existing lab, source definition, binding, engine, host control or scene vocabulary is removed. These milestones complete the review and freeze; they do not claim implementation of unbound physics. Source programs are evidence, not execution permission.

## R2 — Executable mapping review (implemented)

All 68 entries have an explicit disposition. The nine existing bindings remain enabled through the unchanged atlasBinding switch. Two restricted adapter candidates remain disabled pending unit/parameter acceptance. Every new model must extend existing contracts and worker supervision, not create a parallel executor.

| Atlas ID | Disposition | Enabled existing binding | Next requirement |
| --- | --- | --- | --- |
| `harmonic_oscillator` | new-model-required | no | A cavity component is not a standalone oscillator job; define Fock/position output, cutoff and analytic ladder tests. |
| `rabi` | preserved-binding | yes | Preserve the current tested conversion, host controls and runtime capability gates; wider scope requires additive tests. |
| `jaynes_cummings` | preserved-binding | yes | Preserve the current tested conversion, host controls and runtime capability gates; wider scope requires additive tests. |
| `ssh` | preserved-binding | yes | Preserve the current tested conversion, host controls and runtime capability gates; wider scope requires additive tests. |
| `rice_mele` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `hubbard` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `kitaev_chain` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `surface_code_stabilizer` | new-model-required | no | reference_lab program is not a one-to-one Hamiltonian solver. Separate code geometry, stabilizers, syndrome and numerical result boundaries; test commutation and logical dimension. |
| `landau_zener` | preserved-binding | yes | Preserve the current tested conversion, host controls and runtime capability gates; wider scope requires additive tests. |
| `semiclassical_rabi_drive` | preserved-binding | yes | Preserve the current tested conversion, host controls and runtime capability gates; wider scope requires additive tests. |
| `rotating_frame_qubit` | new-model-required | no | New effective-model path required: specify frame, detuning sign, rotation and RWA validity. A lab-frame cosine solver is not the same result contract semantics. |
| `ramsey_sequence_effective` | new-model-required | no | Pulse schedule and phase conventions are missing; continuous drive must not substitute for a Ramsey sequence. |
| `floquet_two_level` | preserved-binding | yes | Preserve the current tested conversion, host controls and runtime capability gates; wider scope requires additive tests. |
| `driven_harmonic_oscillator` | new-model-required | no | Standalone drive/displacement and truncation diagnostics are needed; open JC has an additional qubit and dissipation. |
| `parametric_oscillator` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `tavis_cummings` | new-model-required | no | Source uses emitters x cavity, rotating-frame Delta*sum(Pe)+g*(a^dag J_-+a J_+). New collective parameters, 2^N*cutoff budget and result shapes are needed; test N=1 limit, sqrt(N) bright coupling and dark states. Do not map to single-emitter JC. |
| `dicke` | new-model-required | no | Collective model required; one-qubit Rabi is only the N=1 restriction, not an enabled mapping. |
| `dispersive_jc` | new-model-required | no | Source uses atom x cavity and rotating-frame H_eff=(Delta+chi)Pe+chi*n*sigma_z, chi=g^2/Delta. Freeze a nonzero-detuning validity domain, n_crit, state/basis/global-shift conversions and compare to full JC before integration. |
| `free_particle` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `particle_in_box` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `finite_square_well` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `delta_potential` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `harmonic_oscillator_nd` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `anharmonic_oscillator` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `double_well` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `linear_potential` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `central_potential` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `coulomb_one_body` | adapter-candidate | no | Adapter candidate only: Atlas reduced mass m must be fixed to electron mass in declared atomic units, kappa=Z in 1..6 integer charge, hbar=1. Existing hydrogenic n<=3 is a state selection, not the full Coulomb spectrum. Require explicit units, mass restriction and energy/radial checks before enabling. |
| `tight_binding_generic` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `bloch_two_band` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `graphene_nn` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `dirac_2d` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `qwz` | preserved-binding | yes | Preserve the current tested conversion, host controls and runtime capability gates; wider scope requires additive tests. |
| `haldane` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `bhz` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `bbh` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `weyl_minimal` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `nodal_line_two_band` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `two_level_pauli` | preserved-binding | yes | Preserve the current tested conversion, host controls and runtime capability gates; wider scope requires additive tests. |
| `spin_half_zeeman` | adapter-candidate | no | Adapter candidate only: derive gyromagnetic sign and hbar/2 factors, restrict transverse field to the real x-z plane, specify physical energy scale. The full vector/y component needs a model extension. |
| `pauli_particle_em` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `linear_stark` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `spin_orbit_ls` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `hyperfine_dipole` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `ising_chain` | preserved-binding | yes | Preserve the current tested conversion, host controls and runtime capability gates; wider scope requires additive tests. |
| `xy_chain` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `heisenberg_chain` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `spin_one_zfs` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `landau_continuum` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `hofstadter` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `integer_qh_effective` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `bose_hubbard` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `extended_hubbard` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `t_j_model` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `heisenberg_from_hubbard` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `bcs_reduced` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `bdg_swave` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `anderson_impurity` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `repetition_code_ising` | new-model-required | no | Existing Ising diagonalization is not QEC execution. Specify stabilizers, logical operators and decoding separately. |
| `toric_code` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `surface_code_planar` | new-model-required | no | Reference program includes decoding workflows, not an enabled planar-code Lab job. Require bounded code size, syndrome/logical conventions and failure-rate statistics. |
| `surface_code_with_fields` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `color_code_stabilizer` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `bacon_shor_gauge` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `stabilizer_penalty_generic` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `encoded_adiabatic_penalty` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `logical_pauli_effective` | reference-only | no | No current Lab binding: define bounded model, parameter/unit/basis conversions, contract-valid results and independent numerical acceptance before enabling. |
| `syndrome_defect_effective` | new-model-required | no | A reference_lab syndrome program does not establish an effective-defect Hamiltonian spectrum or transport solver. Define that scientific mapping independently. |

### Preserved scientific conversions

#### rabi

qubitFrequency=omega_q, cavityFrequency=omega_c, coupling=g; subtract omega_q/2 from lab absolute energies.

Fock x qubit to qubit x Fock permutation; counter-rotating terms retained.

Eight-level default Fock cutoff; not collective Dicke or semiclassical Rabi dynamics.

Evidence: `tests/atlas.test.ts`, `workers/quantum-python/tests/test_atlas_mapping.py`, `workers/quantum-python/tests/test_cavity.py`.

#### jaynes_cummings

qubitFrequency=omega_q, cavityFrequency=omega_c, coupling=g; subtract omega_q/2 from lab absolute energies.

Atlas Fock x qubit to lab qubit x Fock by unitary permutation; qubit |g>,|e> projectors explicit.

Six-level default Fock cutoff is a Lab choice, not an Atlas parameter; monitor cutoff occupation.

Evidence: `tests/atlas.test.ts`, `workers/quantum-python/tests/test_atlas_mapping.py`, `workers/quantum-python/tests/test_cavity.py`.

#### ssh

t1=t_1, t2=t_2; lattice spacing and hopping energy convention unchanged.

Open-chain |n,A>,|n,B>; Bloch d_y=+t2*sin(k), explicit k ordering.

16-cell default, 101 k samples; winding undefined at bulk gap closure.

Evidence: `tests/atlas.test.ts`, `workers/quantum-python/tests/test_atlas_mapping.py`, `workers/quantum-python/tests/test_topology.py`.

#### landau_zener

sweepRate=v, gap=Delta, bias=0; hbar=1.

Diabatic sigma_z basis; finite-time populations are not an asymptotic S matrix.

Finite passage only, with explicit simulation window.

Evidence: `tests/atlas.test.ts`, `workers/quantum-python/tests/test_atlas_mapping.py`, `workers/quantum-python/tests/test_evolution.py`.

#### semiclassical_rabi_drive

delta=omega_0, amplitude=2*Omega, frequency=omega_d, phase=phi; hbar=1.

Lab sigma_z eigenbasis; Atlas drive is classical, not a quantized oscillator.

Existing bounded time samples and initial basis state; no pulse sequence inferred.

Evidence: `tests/atlas.test.ts`, `workers/quantum-python/tests/test_atlas_mapping.py`, `workers/quantum-python/tests/test_evolution.py`.

#### floquet_two_level

delta=Delta, amplitude=2*A, frequency=omega, phase=0; hbar=1.

Pauli basis; quasienergies modulo omega; evolution wire operation is unchanged.

Existing strong-drive evolution and period-propagator diagnostics, not a new floquet job.

Evidence: `tests/atlas.test.ts`, `workers/quantum-python/tests/test_atlas_mapping.py`, `workers/quantum-python/tests/test_floquet.py`.

#### qwz

mass=m; hopping, spacing, hbar=1; lower occupied band.

H=sin(kx) sigma_x+sin(ky) sigma_y+(m+cos(kx)+cos(ky)) sigma_z.

21x21 default mesh; gapless and unresolved invariants are not verified integers.

Evidence: `tests/atlas.test.ts`, `workers/quantum-python/tests/test_atlas_mapping.py`, `workers/quantum-python/tests/test_topology.py`.

#### two_level_pauli

delta=2*d_z, omega=2*d_x; d_0=d_y=0; hbar=1.

Pauli sigma_z basis, same ordering; no global shift in this subspace.

Real 2x2 Hermitian spectrum, not arbitrary four-coefficient Pauli input.

Evidence: `tests/atlas.test.ts`, `workers/quantum-python/tests/test_atlas_mapping.py`.

#### ising_chain

interaction=J, transverse=h, longitudinal=0; Pauli, not spin-1/2 operators.

Full computational tensor basis with explicit -J ZZ and -h X signs.

Four-site open default, finite chain; no decoding, thermodynamic limit or stabilizer computation.

Evidence: `tests/atlas.test.ts`, `workers/quantum-python/tests/test_atlas_mapping.py`, `workers/quantum-python/tests/test_many_body.py`.

Source review: pinned examples/python/qutip/adapters/dispersive_jc.py and tavis_cummings.py. Their rotating-frame/tensor conventions above are not silently substituted for Lab's existing closed cavity convention.

## R3 — C2–C8 to existing quantum-scene/v1 (implemented)

Seven ideas reviewed against the real QVIS vocabulary. Compatible scope does not imply a new model solver or automatic import of the B/C request envelopes. The additive grid-order utility converts only supplied bounded regular data; it does not resample, infer wavefunctions, normalize or modify existing adapters.

### C2 — Bloch vectors and trajectories

Pinned source: [TRACK_C_C2_BLOCH_QVIS.md](https://github.com/expert10000/theory/blob/48e2036ba7c7dd5c79d54749341a79d41770cbb7/docs/theory-lab/TRACK_C_C2_BLOCH_QVIS.md).

Existing vocabulary: objects.vectors, objects.polyline. Modules: `packages/quantum-scene/from-result.ts`.

Compatible scope: Existing verified two-level evolution supplies Bloch observables and time-ordered trajectory samples.

Conversion: Preserve dimensionless coordinates, sample order and supplied vectors; no density-matrix or Ramsey solver inferred.

Additive gap: B's free-form states/series envelopes are not accepted worker results. Other producers need explicit validated numerical adapters.

Evidence: `tests/scenes.test.ts`.

### C3 — Finite sites, bonds and observables

Pinned source: [TRACK_C_C3_LATTICE_QVIS.md](https://github.com/expert10000/theory/blob/48e2036ba7c7dd5c79d54749341a79d41770cbb7/docs/theory-lab/TRACK_C_C3_LATTICE_QVIS.md).

Existing vocabulary: objects.point-cloud, objects.segments, objects.scalars, lattice. Modules: `packages/quantum-scene/examples.ts`, `packages/quantum-scene/from-result.ts`.

Compatible scope: Existing bounded open geometry, Ising magnetization and SSH site density/bonds are already portable.

Conversion: Resolve site IDs to explicit positions and bond endpoints; carry scalar units, no distance-inferred hopping/connectivity.

Additive gap: Arbitrary site labels, multiple observable dictionaries and QEC semantics need explicit authored adapters/metadata; generic objects are not a solver.

Evidence: `tests/lattice-scenes.test.ts`.

### C4 — Momentum-resolved bands

Pinned source: [TRACK_C_C4_BAND_QVIS.md](https://github.com/expert10000/theory/blob/48e2036ba7c7dd5c79d54749341a79d41770cbb7/docs/theory-lab/TRACK_C_C4_BAND_QVIS.md).

Existing vocabulary: bands, reciprocal, objects.polyline, objects.mesh. Modules: `packages/quantum-scene/bands.ts`.

Compatible scope: Supplied SSH paths and QWZ surfaces already use explicit momentum, energies and energy units.

Conversion: C 2D arrays are [ky][kx]; Lab's QWZ arrays are kx-major/ky-fastest. Explicitly reorder coordinates and every energy band together. Preserve energy reference as a declared conversion, not an invented offset.

Additive gap: Additional model band solvers, arbitrary band counts/domain conventions and dedicated Fermi-reference metadata need reviewed adapters/extensions.

Evidence: `tests/band-scenes.test.ts`.

### C5 — Berry, vectors and invariants

Pinned source: [TRACK_C_C5_BERRY_QVIS.md](https://github.com/expert10000/theory/blob/48e2036ba7c7dd5c79d54749341a79d41770cbb7/docs/theory-lab/TRACK_C_C5_BERRY_QVIS.md).

Existing vocabulary: topology.quantities, topology.invariants, objects.vectors, objects.scalars. Modules: `packages/quantum-scene/from-result.ts`, `packages/quantum-scene/index.ts`.

Compatible scope: Supplied QWZ curvature, SSH Berry phase and explicit vector quantities are already supported.

Conversion: Preserve grid ordering, gauge/convention text, units, method and supplied/verified/undefined/unresolved invariant status. Never round or compute topology in the viewer.

Additive gap: Broader Hall/Weyl/BHZ/Haldane results need worker calculations; arbitrary gauge metadata needs explicit mapping, not silent defaults.

Evidence: `tests/topology-scenes.test.ts`.

### C6 — Spatial density and phase

Pinned source: [TRACK_C_C6_WAVEFUNCTION_QVIS.md](https://github.com/expert10000/theory/blob/48e2036ba7c7dd5c79d54749341a79d41770cbb7/docs/theory-lab/TRACK_C_C6_WAVEFUNCTION_QVIS.md).

Existing vocabulary: fields.scalar-field, fields.complex-field, objects.polyline, objects.mesh. Modules: `packages/quantum-scene/grid-order.ts`, `packages/quantum-scene/from-result.ts`.

Compatible scope: Bounded regular 3D densities map to scalar fields; existing orbital results already supply real/imaginary complex amplitudes.

Conversion: Transpose [z][y][x] to xyz-z-fastest with the tested grid utility. Density alone stays scalar: no amplitude, phase, normalization or rescaling is inferred. Explicit density+phase requires a separately tested amplitude reconstruction if wanted.

Additive gap: Nonuniform grids and 1D/2D fields need separate curve/mesh adapters. Generic Fock/eigenvector coefficients are not spatial wavefunctions.

Evidence: `tests/grid-order.test.ts`, `tests/orbital.test.ts`.

### C7 — Atomic state density

Pinned source: [TRACK_C_C7_ATOMIC_DENSITY_QVIS.md](https://github.com/expert10000/theory/blob/48e2036ba7c7dd5c79d54749341a79d41770cbb7/docs/theory-lab/TRACK_C_C7_ATOMIC_DENSITY_QVIS.md).

Existing vocabulary: fields.scalar-field, annotations, provenance.parameters. Modules: `packages/quantum-scene/grid-order.ts`, `packages/models/orbital.ts`.

Compatible scope: Existing single-electron analytic orbitals and supplied regular density grids fit bounded fields; labels are descriptive, not calculations.

Conversion: Keep absolute x/y/z origin, length/density units and state provenance. State/nucleus metadata must be explicit; annotations do not replace typed chemistry semantics.

Additive gap: Species, nuclei, arbitrary quantum-number/nodal dictionaries and multi-state comparison need additive typed semantics/UI. No many-electron atomic solver exists.

Evidence: `tests/grid-order.test.ts`, `tests/orbital.test.ts`.

### C8 — Periodic crystal geometry

Pinned source: [TRACK_C_C8_CRYSTAL_QVIS.md](https://github.com/expert10000/theory/blob/48e2036ba7c7dd5c79d54749341a79d41770cbb7/docs/theory-lab/TRACK_C_C8_CRYSTAL_QVIS.md).

Existing vocabulary: lattice, reciprocal, objects.segments. Modules: `packages/quantum-scene/examples.ts`, `packages/quantum-scene/reciprocal.ts`.

Compatible scope: Open square/honeycomb/cubic fixtures and 2pi-dual reciprocal guides already exist; C8 has a broader periodic structure scope.

Conversion: Fractional-to-Cartesian conversion requires an explicit basis. Validate duality a_i dot b_j=2pi delta_ij; expand integer target-cell offsets without guessing bonds.

Additive gap: Periodic bonds, species/orbital metadata and arbitrary crystal construction are genuinely new additive extensions. Do not flatten them into open lattice fixtures and claim equivalence.

Evidence: `tests/lattice-scenes.test.ts`, `tests/reciprocal-scenes.test.ts`.

Keep QuantumResult → QuantumScene → independent consumers. Reuse current TS/Python validators, hashes, 16 MiB regular-scene budget, four fields and 3..49 grid axes; larger/chunked data retains the separate existing stream contract. No direct Lab-to-Math3D worker calls.

R4–R5 remain planned until their review artifacts and acceptance gates land.
