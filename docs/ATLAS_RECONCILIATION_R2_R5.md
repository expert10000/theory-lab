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

R3–R5 remain planned until their review artifacts and acceptance gates land.
