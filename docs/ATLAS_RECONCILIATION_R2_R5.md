# R2–R5 — Additive Atlas reconciliation

Canonical source: `48e2036ba7c7dd5c79d54749341a79d41770cbb7`. R1's complete inventory is retained in [ATLAS_RECONCILIATION_R1.md](ATLAS_RECONCILIATION_R1.md).

No existing lab, source definition, binding, engine, host control or scene vocabulary is removed. These milestones complete the review and freeze; they do not claim implementation of unbound physics. Source programs are evidence, not execution permission.

D1 amendment: tables and digests below represent the current additive inventory, including the accepted static 1D oscillator. The historical R5 baseline at 4159d2e is preserved in packages/atlas/fixtures/reconciliation-r5.v1.json. Original protocol branches/definitions are fingerprint-tested against that baseline; new oscillator enum/variants require updated strict consumers. No existing scene schema changed.

## R2 — Executable mapping review (implemented)

All 68 entries have an explicit disposition. The nine original bindings remain unchanged; D1 adds one accepted oscillator binding through the existing atlasBinding switch. Two restricted adapter candidates remain disabled pending unit/parameter acceptance. Every new model must extend existing contracts and worker supervision, not create a parallel executor.

| Atlas ID | Disposition | Enabled existing binding | Next requirement |
| --- | --- | --- | --- |
| `harmonic_oscillator` | accepted-binding | yes | D1 standalone static 1D Fock spectrum and stationary Hermite density now accepted. Broader arbitrary-state/time-dependent/physical-coordinate oscillator scope remains additive; a JC component remains a separate related path. |
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
| `tavis_cummings` | new-model-required | no | Source uses emitters x cavity, rotating-frame Delta*sum(Pe)+g*(a^dag J_-+a J_+). At hbar=1, J_z=sum(Pe)-N/2 and Delta=omega_q-omega_c: H_source=H_Atlas-omega_c*(n+sum(Pe))+N*omega_q*I/2. Atlas has no default emitter count, so N/basis/cutoff must be explicit new model data. Bound 2^N*cutoff and result shapes; test N=1, sqrt(N) bright coupling and dark states. Do not map to single-emitter JC. |
| `dicke` | new-model-required | no | Collective model required; one-qubit Rabi is only the N=1 restriction, not an enabled mapping. |
| `dispersive_jc` | new-model-required | no | Source uses atom x cavity and rotating-frame H_eff=(Delta+chi)Pe+chi*n*sigma_z, chi=g^2/Delta, sigma_z=2Pe-I. At hbar=1: Delta=omega_q-omega_c; H_source=H_Atlas-omega_c*(n+Pe)+(omega_q+chi)*I/2 after tensor conversion. Inferring g from Atlas chi requires chi*Delta>=0 and an explicit coupling-sign convention, not a unique default. Freeze nonzero detuning, |g/Delta|<<1, n<<n_crit and compare to full JC before integration. |
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
| `spin_half_zeeman` | adapter-candidate | no | Adapter candidate only: with hbar=1 and B_y=0, delta=-gamma*B_z and omega=-gamma*B_x reproduce the Atlas -hbar*gamma*B.sigma/2. Declare angular-frequency versus physical energy units and signed gamma. Atlas B has a model-defined vector default, so no automatic numeric field can be loaded. The full y component needs an additive model extension. |
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

#### harmonic_oscillator

omega=omega_Atlas, hbar=1; H=omega(N+1/2), including zero-point energy.

Fock |n>; stationary Hermite amplitude in dimensionless q=(a+a†)/sqrt(2). No mass/physical-length calibration inferred.

Static 1D spectrum, selected n<=10 below the top basis state; cutoff 8..64, levels 3..12, odd grid 101..401. Shared analytic Hermite plotting is not an independent spatial solver. No oscillator scene adapter.

Evidence: `tests/oscillator.test.ts`, `workers/quantum-python/tests/test_oscillator.py`, `scripts/smoke.mjs`.

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

## R4 — Genuine physics/model gaps (implemented review)

Every Atlas ID is classified exactly once: 10 covered subspaces, 2 parameter-adapter candidates and 56 entries requiring new model scope. Covered subspace never means the full Atlas Hamiltonian family is implemented. Priority 1 is adapter review; 2 is bounded first extensions; 3 is more involved physics; 4 is substantial many-body/QEC scope. This is an additive backlog, not authorization to execute or build every entry.

| Atlas ID | Gap status | Group | Priority |
| --- | --- | --- | --- |
| `harmonic_oscillator` | covered-subspace | — | preserve |
| `rabi` | covered-subspace | — | preserve |
| `jaynes_cummings` | covered-subspace | — | preserve |
| `ssh` | covered-subspace | — | preserve |
| `rice_mele` | new-model | G07 | 2 |
| `hubbard` | new-model | G10 | 4 |
| `kitaev_chain` | new-model | G11 | 4 |
| `surface_code_stabilizer` | new-model | G12 | 4 |
| `landau_zener` | covered-subspace | — | preserve |
| `semiclassical_rabi_drive` | covered-subspace | — | preserve |
| `rotating_frame_qubit` | new-model | G05 | 2 |
| `ramsey_sequence_effective` | new-model | G05 | 2 |
| `floquet_two_level` | covered-subspace | — | preserve |
| `driven_harmonic_oscillator` | new-model | G02 | 2 |
| `parametric_oscillator` | new-model | G02 | 2 |
| `tavis_cummings` | new-model | G06 | 3 |
| `dicke` | new-model | G06 | 3 |
| `dispersive_jc` | new-model | G06 | 3 |
| `free_particle` | new-model | G03 | 3 |
| `particle_in_box` | new-model | G03 | 3 |
| `finite_square_well` | new-model | G03 | 3 |
| `delta_potential` | new-model | G03 | 3 |
| `harmonic_oscillator_nd` | new-model | G02 | 2 |
| `anharmonic_oscillator` | new-model | G02 | 2 |
| `double_well` | new-model | G02 | 2 |
| `linear_potential` | new-model | G03 | 3 |
| `central_potential` | new-model | G03 | 3 |
| `coulomb_one_body` | parameter-adapter | G01 | 1 |
| `tight_binding_generic` | new-model | G07 | 2 |
| `bloch_two_band` | new-model | G07 | 2 |
| `graphene_nn` | new-model | G07 | 2 |
| `dirac_2d` | new-model | G07 | 2 |
| `qwz` | covered-subspace | — | preserve |
| `haldane` | new-model | G07 | 2 |
| `bhz` | new-model | G07 | 2 |
| `bbh` | new-model | G07 | 2 |
| `weyl_minimal` | new-model | G07 | 2 |
| `nodal_line_two_band` | new-model | G07 | 2 |
| `two_level_pauli` | covered-subspace | — | preserve |
| `spin_half_zeeman` | parameter-adapter | G01 | 1 |
| `pauli_particle_em` | new-model | G04 | 3 |
| `linear_stark` | new-model | G04 | 3 |
| `spin_orbit_ls` | new-model | G04 | 3 |
| `hyperfine_dipole` | new-model | G04 | 3 |
| `ising_chain` | covered-subspace | — | preserve |
| `xy_chain` | new-model | G08 | 2 |
| `heisenberg_chain` | new-model | G08 | 2 |
| `spin_one_zfs` | new-model | G04 | 3 |
| `landau_continuum` | new-model | G09 | 3 |
| `hofstadter` | new-model | G09 | 3 |
| `integer_qh_effective` | new-model | G09 | 3 |
| `bose_hubbard` | new-model | G10 | 4 |
| `extended_hubbard` | new-model | G10 | 4 |
| `t_j_model` | new-model | G10 | 4 |
| `heisenberg_from_hubbard` | new-model | G10 | 4 |
| `bcs_reduced` | new-model | G11 | 4 |
| `bdg_swave` | new-model | G11 | 4 |
| `anderson_impurity` | new-model | G10 | 4 |
| `repetition_code_ising` | new-model | G12 | 4 |
| `toric_code` | new-model | G12 | 4 |
| `surface_code_planar` | new-model | G12 | 4 |
| `surface_code_with_fields` | new-model | G12 | 4 |
| `color_code_stabilizer` | new-model | G12 | 4 |
| `bacon_shor_gauge` | new-model | G12 | 4 |
| `stabilizer_penalty_generic` | new-model | G12 | 4 |
| `encoded_adiabatic_penalty` | new-model | G12 | 4 |
| `logical_pauli_effective` | new-model | G12 | 4 |
| `syndrome_defect_effective` | new-model | G12 | 4 |

### G01 — Restricted Coulomb/Zeeman parameter adapters (priority 1)

Entries: `coulomb_one_body`, `spin_half_zeeman`. Dependencies: none.

Reuse: Existing hydrogenic orbital and real two-level jobs, result verification and desktop controls.

Missing: Explicit physical unit, reduced-mass and gyromagnetic conventions; full vector/mass scope is not supported by current jobs.

Acceptance requirements:

- Reject unsupported mass, charge, y-field and unit conventions
- Verify E_n=-Z^2/(2n^2) and radial moments
- Verify Zeeman signs and Pauli factors independently
- Enable only the tested restricted mapping

### G02 — Standalone oscillator family (priority 2)

Entries: `harmonic_oscillator_nd`, `driven_harmonic_oscillator`, `parametric_oscillator`, `anharmonic_oscillator`, `double_well`. Dependencies: none.

Reuse: Cavity Fock mathematics, existing supervised jobs, binary artifacts, sweeps, native/QuTiP comparisons and scalar/complex viewers.

Delivered bounded subspaces: harmonic_oscillator: D1 static 1D Fock spectrum and stationary Hermite density; broader scope remains below.

Missing: D1 now delivers standalone static 1D jobs/results/controls and analytic basis-to-q plotting. Arbitrary-state dynamics, drive/displacement, parametric/anharmonic/ND/double-well solvers and physical length calibration remain missing. JC oscillator components remain distinct.

Acceptance requirements:

- Start with one-dimensional harmonic E_n=hbar*omega*(n+1/2)
- Declare finite cutoff and show convergence/boundary occupation
- Independent QuTiP/native spectrum and dynamics checks
- Add driven/parametric/anharmonic/ND/double-well scope only with its own tests

### G03 — Spatial potentials and scattering (priority 3)

Entries: `free_particle`, `particle_in_box`, `finite_square_well`, `delta_potential`, `linear_potential`, `central_potential`. Dependencies: none.

Reuse: Validated field/binary pipeline and offline scene views; no replacement workspace.

Missing: Grid/basis operators, boundary conditions, bound-versus-continuum semantics, discretization/error controls and solver jobs.

Acceptance requirements:

- Box analytic spectrum and mesh convergence
- Separate bound-state normalization from scattering normalization
- Explicit potential/length/mass/hbar units
- No finite-grid eigenvalues claimed as continuum scattering data

### G04 — Atomic/spin operators beyond restricted qubits (priority 3)

Entries: `pauli_particle_em`, `linear_stark`, `spin_orbit_ls`, `hyperfine_dipole`, `spin_one_zfs`. Dependencies: none.

Reuse: Existing bounded spectra, hydrogenic basis references and scalar-field visualization.

Missing: Spin-1/angular-momentum/operator products, EM gauge and atomic perturbation bases; hydrogenic labels do not calculate these effects.

Acceptance requirements:

- Explicit basis, degeneracies and spin normalization
- Hermiticity and selection-rule tests
- Gauge/unit and perturbative-domain documentation
- No many-electron chemistry claim

### G05 — Rotating frames and Ramsey sequences (priority 2)

Entries: `rotating_frame_qubit`, `ramsey_sequence_effective`. Dependencies: none.

Reuse: Existing evolution solvers, Bloch adapters and comparison diagnostics.

Missing: Effective frame/RWA semantics, pulse schedule and phase controls; existing continuous-drive lab stays available unchanged.

Acceptance requirements:

- Frame/sign/phase transformation tests
- RWA validity range against full drive
- Ramsey fringe phase and limiting pulse checks
- Explicit time/pulse resolution without invented interpolation

### G06 — Dispersive and collective light–matter models (priority 3)

Entries: `dispersive_jc`, `tavis_cummings`, `dicke`. Dependencies: none.

Reuse: Existing JC/Rabi labs and pinned source programs as numerical references, not source-path dispatch.

Missing: Effective-domain controls, emitter counts, collective basis, bounded new jobs/results and observable adapters.

Acceptance requirements:

- Dispersive error scaling versus full JC and n_crit
- Tavis N=1 restriction and sqrt(N) bright/dark sectors
- Dicke counter-rotating terms and parity
- Hilbert dimension/time/cutoff limits and independent engine checks

### G07 — Additional lattice and band Hamiltonians (priority 2)

Entries: `rice_mele`, `tight_binding_generic`, `bloch_two_band`, `graphene_nn`, `dirac_2d`, `haldane`, `bhz`, `bbh`, `weyl_minimal`, `nodal_line_two_band`. Dependencies: none.

Reuse: Existing SSH/QWZ topology, band/reciprocal/vector scenes and verified export/import.

Missing: Explicit per-model matrices, k domains, boundaries, occupied bands, topology algorithms and numerical result adapters. Rice–Mele is a natural first extension, not already implemented.

Acceptance requirements:

- Rice–Mele zero-staggering SSH limit
- Hermitian band matrices and independent analytic points
- Mesh convergence and gapless/undefined invariant handling
- No discrete spectrum relabeled as bands; no automatic topology inference

### G08 — XY and Heisenberg chains (priority 2)

Entries: `xy_chain`, `heisenberg_chain`. Dependencies: none.

Reuse: Existing finite-chain native/optional QuSpin path, sweeps and site scenes.

Missing: XX/YY/ZZ operators and model-specific spin/Pauli conventions; Ising execution remains intact.

Acceptance requirements:

- Small-chain analytic spectra
- Spin versus Pauli factor tests
- Independent native/QuSpin when installed
- Finite-size/open/periodic boundary convergence, no thermodynamic claim

### G09 — Hall and magnetic lattice models (priority 3)

Entries: `landau_continuum`, `hofstadter`, `integer_qh_effective`. Dependencies: G07.

Reuse: Momentum/band/Berry displays and existing verified/unresolved topology conventions.

Missing: Magnetic flux/gauge, magnetic unit cells, continuum-versus-lattice basis, occupied bands and transport semantics.

Acceptance requirements:

- Landau ladder and flux/gauge equivalence
- Rational-flux magnetic-cell budget
- Band/Chern convergence where defined
- Do not claim conductivity from a viewer annotation alone

### G10 — Correlated particles and impurity models (priority 4)

Entries: `hubbard`, `bose_hubbard`, `extended_hubbard`, `t_j_model`, `heisenberg_from_hubbard`, `anderson_impurity`. Dependencies: none.

Reuse: Existing job supervision, persistence, finite-chain controls and native comparison pattern.

Missing: Fermion/boson statistics, particle sectors, onsite occupancy cutoffs and interaction/operator result shapes; Ising basis is not a Hubbard solver.

Acceptance requirements:

- Noninteracting and isolated-site limits
- Fermionic signs and number conservation
- Bounded sector/cutoff scaling
- Large-U effective exchange checks for the derived Heisenberg entry

### G11 — Superconducting and BdG models (priority 4)

Entries: `kitaev_chain`, `bcs_reduced`, `bdg_swave`. Dependencies: none.

Reuse: Spectra, finite-site/band displays and topology status semantics; transmon remains a distinct existing circuit lab.

Missing: Nambu basis, pairing conventions, particle-hole redundancy, finite-chain versus mean-field many-body interpretation.

Acceptance requirements:

- Particle-hole spectral symmetry
- Pairing-zero normal-state limit
- Finite-size edge versus bulk-gap diagnostics
- No transmon-to-BCS equivalence or unsupported self-consistency claim

### G12 — QEC stabilizers, defects and logical Hamiltonians (priority 4)

Entries: `surface_code_stabilizer`, `repetition_code_ising`, `toric_code`, `surface_code_planar`, `surface_code_with_fields`, `color_code_stabilizer`, `bacon_shor_gauge`, `stabilizer_penalty_generic`, `encoded_adiabatic_penalty`, `logical_pauli_effective`, `syndrome_defect_effective`. Dependencies: none.

Reuse: Existing scene primitives for supplied layouts and pinned reference_lab programs; no new QEC workbench framework.

Missing: Stabilizer/gauge/logical operator jobs, code geometry, defects/noise/decoding semantics and bounded statistical result contracts.

Acceptance requirements:

- Commutation/gauge tests and code-space dimension
- Logical versus physical Pauli conventions
- Known syndrome/error/decoder limiting cases
- Distinguish Hamiltonian spectrum, syndrome observations and Monte Carlo failure rates

D1 now delivers the bounded standalone static 1D oscillator within G02; the group retains all broader oscillator-family requirements. G01 restricted adapter candidates, Rice–Mele and XY/Heisenberg are further bounded candidates, not implemented here. The reconciliation review itself did not implement D1; the separate D1 commits do. All current labs remain available.

## R5 — Reconciled Atlas ↔ Lab metadata freeze (implemented)

The additive atlas-lab-reconciliation/v1 metadata contract is frozen in packages/atlas/atlas-lab-reconciliation.v1.json with a strict JSON Schema, semantic validator and deterministic regeneration check. It covers all 68 IDs, source examples, related-only models, nine preserved binding defaults/conventions, desktop/web/gateway/scene coverage, executable dispositions, C2–C8 review IDs and physics gap groups.

Catalog digest: `f115cf435899bd1805e30de9088d6ac46a3389afc2f04f6335b07b94b5466f0a`. Review/inventory digest: `dda5df8da41b9ef6cd494eec6f41d635733437d97aea87849d318c90b1c46289`. Digests detect drift, not publisher identity or scientific truth.

### Current protocol digests; legacy branches retained

Hashes below use SHA-256 of JSON.stringify(JSON.parse(schema)), avoiding platform line-ending differences. No existing job/result/scene schema was edited by R2–R5.

| Existing schema | Semantic SHA-256 |
| --- | --- |
| packages/contracts/schemas/quantum-job.v1.json | `efb5bd930baec50fb20eeaf680df8dfb7df416b8f280b87953acd57ce3b7b7e5` |
| packages/contracts/schemas/quantum-result.v1.json | `f47e8d58885bffe89da5ea511705200257e1d7de72fd642ae79216f41ffe6c6e` |
| packages/contracts/schemas/worker-capabilities.v1.json | `d36e442ffcf53781fb5081bfecfc09bfadd1c04d306d2252819e18140c25a1cf` |
| packages/contracts/schemas/worker-resources.v1.json | `200d7dc74f4e6ba1d197662655211c091e08a0c9940eeb804761e034b448c436` |
| packages/quantum-scene/quantum-scene.v1.json | `b5b61c3b7749d6ae077dca1f2baad3ac298077cb1dc1d452dcfffc2359f23ccc` |

### Additive change policy

- Keep all existing IDs, labs, bindings, operations, engines, host controls and scene formats. New mappings require explicit scientific conversions, bounded contracts and independent numerical acceptance.
- Execution remains in existing atlasBinding + host/worker validation and runtime capabilities. This metadata, a source path, a related model or a geometry fixture cannot authorize execution.
- Extend existing typed model modules/contracts and QVIS adapters. No B job/result workspace or C free-form bridge protocol is adopted; Math3D remains a separate consumer track.
- Regenerate metadata/report only after reviewing changed definitions and evidence. Do not silently broaden scientific scope or weaken validation/budgets to make a new model fit.
- Backward-compatible new optional fields or enum cases still require updated strict consumers and compatibility fixtures. A breaking semantic change requires a new contract version and migration; the metadata version does not version or replace quantum-job/result/scene protocols.
- R5 freezes the reconciliation baseline, not the whole application. Future extensions stay possible and are recorded with additive tests; no existing capability is reduced.

### Reproduce acceptance

```powershell
node scripts/sync-atlas.mjs --check
npx tsx scripts/report-atlas.ts --check
npx tsx scripts/freeze-atlas.ts --check
npx tsx scripts/report-reconciliation.ts --check
npm run typecheck
npm test
npm run test:worker
npm run test:desktop
npm run test:web
npm run test:scenes
```

R2–R5 implementation means the mapping review, compatibility review, gap review and metadata freeze are delivered. It does not mean 59 additional Atlas entries, chemistry, periodic crystals or Math3D are implemented. All original feature paths and tests are retained.
