# R1 — Canonical Atlas ↔ existing Theory Lab

Pinned theory revision: `48e2036ba7c7dd5c79d54749341a79d41770cbb7` (https://github.com/expert10000/theory).

68 reference definitions; 7 declared theory-example bindings; 9 tested Lab bindings; 4 web compute bindings; 6 bound models with saved scene adapters.

R1 is implemented: the catalog, capability map and UI explanations are reconciled. No new physics executor, job/result protocol, scene format or Math3D integration is introduced. The canonical Atlas remains the metadata source; Lab owns its explicit tested parameter adapters. This map is an implementation inventory, not an execution authorization registry or the R5 contract freeze.

## Reading the map

Reference means browseable. Theory example means declared adapter/program paths exist at the pinned source revision, not that they were run or accepted here. A reference_lab binding is a related QEC program, not a one-to-one Hamiltonian executor. Lab-bound means one of the nine existing tested subspace mappings. Related-only means an existing physical family is relevant but no parameter binding is enabled. Engines are implemented integrations, not a claim that optional packages/devices are installed. Runtime worker capabilities still gate execution.

## Complete 68-entry inventory

| Atlas ID | Status | Theory example kind | Bound Lab model / operation | Related existing Lab (not bound) |
| --- | --- | --- | --- | --- |
| `harmonic_oscillator` | related-only | — | — | jaynes_cummings |
| `rabi` | lab-bound | — | `quantum_rabi` / cavity | — |
| `jaynes_cummings` | lab-bound | direct | `jaynes_cummings` / cavity | — |
| `ssh` | lab-bound | — | `ssh` / topology | — |
| `rice_mele` | reference | — | — | — |
| `hubbard` | reference | — | — | — |
| `kitaev_chain` | reference | — | — | — |
| `surface_code_stabilizer` | theory-example | reference_lab | — | — |
| `landau_zener` | lab-bound | — | `landau_zener` / evolve | — |
| `semiclassical_rabi_drive` | lab-bound | — | `driven_two_level` / evolve | — |
| `rotating_frame_qubit` | related-only | — | — | driven_two_level |
| `ramsey_sequence_effective` | related-only | — | — | driven_two_level |
| `floquet_two_level` | lab-bound | — | `strong_drive` / evolve | — |
| `driven_harmonic_oscillator` | related-only | — | — | open_jaynes_cummings |
| `parametric_oscillator` | reference | — | — | — |
| `tavis_cummings` | theory-example | direct | — | — |
| `dicke` | related-only | — | — | quantum_rabi |
| `dispersive_jc` | related-only | direct | — | jaynes_cummings |
| `free_particle` | reference | — | — | — |
| `particle_in_box` | reference | — | — | — |
| `finite_square_well` | reference | — | — | — |
| `delta_potential` | reference | — | — | — |
| `harmonic_oscillator_nd` | reference | — | — | — |
| `anharmonic_oscillator` | reference | — | — | — |
| `double_well` | reference | — | — | — |
| `linear_potential` | reference | — | — | — |
| `central_potential` | reference | — | — | — |
| `coulomb_one_body` | related-only | — | — | hydrogenic |
| `tight_binding_generic` | reference | — | — | — |
| `bloch_two_band` | reference | — | — | — |
| `graphene_nn` | reference | — | — | — |
| `dirac_2d` | reference | — | — | — |
| `qwz` | lab-bound | — | `qwz` / topology | — |
| `haldane` | reference | — | — | — |
| `bhz` | reference | — | — | — |
| `bbh` | reference | — | — | — |
| `weyl_minimal` | reference | — | — | — |
| `nodal_line_two_band` | reference | — | — | — |
| `two_level_pauli` | lab-bound | family | `two_level` / diagonalize | — |
| `spin_half_zeeman` | related-only | — | — | two_level |
| `pauli_particle_em` | reference | — | — | — |
| `linear_stark` | reference | — | — | — |
| `spin_orbit_ls` | reference | — | — | — |
| `hyperfine_dipole` | reference | — | — | — |
| `ising_chain` | lab-bound | — | `ising_chain` / many_body | — |
| `xy_chain` | reference | — | — | — |
| `heisenberg_chain` | reference | — | — | — |
| `spin_one_zfs` | reference | — | — | — |
| `landau_continuum` | reference | — | — | — |
| `hofstadter` | reference | — | — | — |
| `integer_qh_effective` | reference | — | — | — |
| `bose_hubbard` | reference | — | — | — |
| `extended_hubbard` | reference | — | — | — |
| `t_j_model` | reference | — | — | — |
| `heisenberg_from_hubbard` | reference | — | — | — |
| `bcs_reduced` | reference | — | — | — |
| `bdg_swave` | reference | — | — | — |
| `anderson_impurity` | reference | — | — | — |
| `repetition_code_ising` | related-only | — | — | ising_chain |
| `toric_code` | reference | — | — | — |
| `surface_code_planar` | theory-example | reference_lab | — | — |
| `surface_code_with_fields` | reference | — | — | — |
| `color_code_stabilizer` | reference | — | — | — |
| `bacon_shor_gauge` | reference | — | — | — |
| `stabilizer_penalty_generic` | reference | — | — | — |
| `encoded_adiabatic_penalty` | reference | — | — | — |
| `logical_pauli_effective` | reference | — | — | — |
| `syndrome_defect_effective` | theory-example | reference_lab | — | — |

## Tested binding coverage

All nine bindings and the original 48 formula/basis/parameter definitions are preserved by checked-in legacy regression fixtures. The bound operation is the tested Atlas path; other Lab operations listed below do not automatically become additional Atlas bindings.

| Atlas ID | Desktop load | Web compute load | Bound gateway operation | Saved scene views | Convention |
| --- | --- | --- | --- | --- | --- |
| `rabi` | yes | no | not accepted | — | ħ = 1. Atlas basis is Fock × qubit; lab basis is qubit × Fock (unitary permutation). Lab ωq\|e⟩⟨e\| adds global ωq/2 to Atlas energies; subtract it for absolute-spectrum comparison. Finite Fock cutoff is a lab choice. |
| `jaynes_cummings` | yes | no | not accepted | — | ħ = 1. Atlas basis is Fock × qubit; lab basis is qubit × Fock (unitary permutation). Lab ωq\|e⟩⟨e\| adds global ωq/2 to Atlas energies; subtract it for absolute-spectrum comparison. Finite Fock cutoff is a lab choice. |
| `ssh` | yes | yes | topology | standard, bands | Atlas t₁/t₂ are the lab intracell/intercell hoppings. Bloch H(k)=(t₁+t₂ cos k)σx+t₂ sin k σy; open chain uses \|n,A⟩,\|n,B⟩ and 16 cells. Winding requires nonzero bulk gap. |
| `landau_zener` | yes | no | evolve | standard | Atlas H = vt σz/2 + Δ σx/2; lab sweepRate = v, gap = Δ, bias = 0. Finite simulation window does not equal asymptotic LZ scattering. |
| `semiclassical_rabi_drive` | yes | yes | evolve | standard | ħ = 1; lab Δ = ω₀, A = 2Ω, ω = ωd, φ unchanged. This is a classical drive, not the quantum Rabi cavity model. |
| `floquet_two_level` | yes | no | evolve | standard | Lab uses A_lab cos(ωt + φ) σx/2: A_lab = 2A_Atlas, φ = 0, ħ = 1. Quasienergies are modulo ω. |
| `qwz` | yes | yes | topology | standard, bands | Atlas H(k)=sin kₓ σx+sin kᵧ σy+(m+cos kₓ+cos kᵧ)σz, with lattice spacing, hopping scale and ħ set to 1. The lab computes the lower-band FHS Chern number and an independent midpoint Berry-curvature integral; at m=−2, 0, 2 the invariant is undefined. |
| `two_level_pauli` | yes | yes | diagonalize | — | Subspace d₀ = dᵧ = 0; lab Δ = 2d_z and Ω = 2d_x. Atlas's full four-parameter model is not implemented. |
| `ising_chain` | yes | no | not accepted | standard | Finite open chain, four sites, zero longitudinal field. Lab H = −JΣσᶻᵢσᶻᵢ₊₁ − hΣσˣᵢ; no thermodynamic-limit claim. |

Saved scenes can be viewed/imported in desktop and web even when the web has no compute form. No scene adapter is claimed for cavity, Lindblad, transmon, sweeps or static-spectrum results. Generic geometry/field primitives are not evidence that a Hamiltonian has a numerical adapter.

## Existing typed implementation inventory

The central MODEL_REGISTRY covers five two-level models. Other families use their existing typed modules; R1 does not replace them. Every inventory model has a contract-valid job constructed from its real helper in tests.

| Lab model | Existing module | Operations | Engines (runtime availability required) | Web compute form | Gateway operations | Scene operation / views |
| --- | --- | --- | --- | --- | --- | --- |
| `two_level` | packages/models/index.ts | diagonalize | native, qutip | yes | diagonalize | — |
| `driven_two_level` | packages/models/index.ts | evolve, sweep | native, qutip, dynamiqs | yes | evolve | evolve / standard |
| `landau_zener` | packages/models/index.ts | evolve, sweep | native, qutip, dynamiqs | no | evolve | evolve / standard |
| `stuckelberg` | packages/models/index.ts | evolve, sweep | native, qutip, dynamiqs | no | evolve | evolve / standard |
| `strong_drive` | packages/models/index.ts | evolve, sweep | native, qutip, dynamiqs | no | evolve | evolve / standard |
| `jaynes_cummings` | packages/models/cavity.ts | cavity | native, qutip | no | — | — |
| `quantum_rabi` | packages/models/cavity.ts | cavity | native, qutip | no | — | — |
| `open_jaynes_cummings` | packages/models/lindblad.ts | lindblad | native, qutip | no | — | — |
| `ising_chain` | packages/models/many_body.ts | many_body | native, quspin | no | — | many_body / standard |
| `transmon` | packages/models/circuit.ts | circuit | native, scqubits | no | circuit | — |
| `ssh` | packages/models/topology.ts | topology | native | yes | topology | topology / standard, bands |
| `qwz` | packages/models/topology.ts | topology | native | yes | topology | topology / standard, bands |
| `hydrogenic` | packages/models/orbital.ts | orbital | native | no | — | orbital / standard |

- **two_level**: Restricted real two-level Hamiltonian; not all four Pauli coefficients.
- **driven_two_level**: Classical periodic drive; web has evolution controls, not sweeps.
- **landau_zener**: Finite-time linear passage; not asymptotic scattering.
- **stuckelberg**: Finite-time double passage; no distinct canonical Atlas binding.
- **strong_drive**: Driven two-level evolution with desktop Floquet diagnostics; no extra floquet wire operation.
- **jaynes_cummings**: Finite Fock cutoff; tensor permutation and global energy offset relative to Atlas.
- **quantum_rabi**: Finite qubit-cavity model, not the semiclassical drive. No portable cavity scene adapter.
- **open_jaynes_cummings**: Driven dissipative qubit-cavity model; not a second closed-Hamiltonian Atlas binding.
- **ising_chain**: Finite 2–8-site chain; optional QuSpin, not a thermodynamic solution or QEC executor.
- **transmon**: Finite charge-basis spectrum with optional scqubits; no current Atlas binding or web compute form.
- **ssh**: Finite open chain and supplied two-band path; gap closure gives undefined winding.
- **qwz**: Periodic two-band grid, supplied curvature/bands; unresolved mesh is not verified topology.
- **hydrogenic**: Analytic single-electron Coulomb 1s–3d, infinite nuclear mass; no many-electron solver.

## Source-side programs, not Lab permissions

| Atlas ID | Kind | Adapter path | Example path |
| --- | --- | --- | --- |
| `jaynes_cummings` | direct | examples/python/qutip/adapters/jaynes_cummings.py | examples/python/qutip/run_jaynes_cummings_cavity_qed_lab.py |
| `surface_code_stabilizer` | reference_lab | examples/python/qutip/adapters/surface_code_d3.py | examples/python/qutip/run_surface_code_d3_lab.py |
| `tavis_cummings` | direct | examples/python/qutip/adapters/tavis_cummings.py | examples/python/qutip/run_tavis_cummings_collective_qed_lab.py |
| `dispersive_jc` | direct | examples/python/qutip/adapters/dispersive_jc.py | examples/python/qutip/run_dispersive_jc_spectroscopy_lab.py |
| `two_level_pauli` | family | examples/python/qutip/adapters/models.py | examples/python/qutip/run_two_level_dynamics_lab.py |
| `surface_code_planar` | reference_lab | examples/python/qutip/adapters/surface_code_rotated.py | examples/python/qutip/run_surface_code_rotated_lab.py |
| `syndrome_defect_effective` | reference_lab | examples/python/qutip/adapters/surface_plaquette.py | examples/python/qutip/run_surface_plaquette_lab.py |

All paths are checked in Git at the pinned revision during snapshot generation. Catalog flags such as theory_lab=true mean source-side catalog exposure, not an installed Lab solver. No runner path crosses preload/gateway, no dynamic script execution is added, and source flags never enable Load/Run actions.

## Related physics is not a missing architecture

- **harmonic_oscillator → jaynes_cummings**: Cavity mode is an oscillator component, not a standalone oscillator laboratory or binding.
- **rotating_frame_qubit → driven_two_level**: Related drive family; rotating-frame approximation is not an implemented Atlas binding.
- **ramsey_sequence_effective → driven_two_level**: A continuous cosine drive is not a pulsed Ramsey sequence.
- **driven_harmonic_oscillator → open_jaynes_cummings**: Driven cavity component exists; a standalone driven-oscillator model is not bound.
- **dicke → quantum_rabi**: One-qubit quantum Rabi is not a collective Dicke solver.
- **dispersive_jc → jaynes_cummings**: Parent full JC solver exists; the effective dispersive Hamiltonian and diagnostics are not a tested binding.
- **coulomb_one_body → hydrogenic**: Restricted hydrogenic states exist, but no Atlas-default-to-orbital parameter binding is tested.
- **spin_half_zeeman → two_level**: A restricted spin Hamiltonian could embed in the real two-level subspace; vector/sign/unit conversion is not bound.
- **repetition_code_ising → ising_chain**: Ising spectrum exists; repetition-code stabilizers, decoding and correction are not implemented.

## Genuine gaps and the next steps at R1 delivery

This section preserves the R1 planning context. R2–R5 are now reviewed/frozen in ATLAS_RECONCILIATION_R2_R5.md; the current Roadmap describes delivery status. Planned physics listed below is still not implemented by reconciliation.

R2 — review additional executable mappings against existing quantum-job/v1 and quantum-result/v1. Hydrogenic Coulomb mapping is an adapter gap; source-side dispersive JC/Tavis–Cummings/QEC programs need separate bounded numerical integration and tests. Do not execute their paths from catalog flags.

R3 — map C2–C8 ideas into quantum-scene/v1. Bloch, bounded fields, lattices, SSH/QWZ bands and supplied topology already exist. C's nested atomic [z][y][x] arrays require explicit conversion to xyz-z-fastest; nonuniform grids, arbitrary crystals, species and periodic bonds exceed current bounded vocabulary. Density alone is not a supplied complex wavefunction. Preserve units, provenance and compatibility tests.

R4 — rank genuinely missing physics after R2/R3. A standalone harmonic-oscillator lab, collective light–matter models, broader Hall/Hubbard/superconducting models and QEC execution are not currently implemented as Atlas-bound Lab solvers. An existing component or related reference is not sufficient evidence of coverage. This list is not authorization to implement them all.

R5 — freeze the reconciled Atlas ↔ Lab contract only after mappings and gap review. R1 does not freeze the B scaffold's alternative job/result or C bridge shapes. Keep QuantumResult → QuantumScene → independent consumers; Math3D remains a separate track.

## Reproduce and verify

```powershell
node scripts/sync-atlas.mjs ../THEORY --check
npx tsx scripts/report-atlas.ts --check
npm run typecheck
npm test
npm run test:web
npm run test:desktop
```

The source checkout needs the pinned Git object, not a switched working tree. The app never fetches live Atlas content. Generation checks the complete canonical consumer catalog, source bindings and paths; normal tests/UI use only vendored data. No Math3D files or theory working-tree files are modified.
