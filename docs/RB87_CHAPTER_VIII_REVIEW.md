# Chapter VIII visual review

Source: pinned Chapter VIII PDF SHA-256 `376e1adf84021f558a33899f4b37019e088f58ef0ecee2dbc2774fda7d58709c`, with identical TeX. Archived table: `trajectory_results.csv`, SHA-256 `e711c5217e9c89146ce162cff5842e330bb0ae61894d07348e90d86429ac4f4d`.

| Quantity | Source locator | Meaning in the visual |
| --- | --- | --- |
| `P11` | VIII §4, PDF pp. 4–5; figure on p. 5 | Probability of the `|11⟩` occupation. Exact values come from the unconditional Lindblad master equation; archived 1200-trajectory points estimate the same probability. |
| Master purity `Tr(ρ²)` | VIII §§3–4, PDF pp. 4–5 | Purity of the unconditional density matrix. It is not trajectory entanglement. |
| Mean trajectory spatial-mode entropy | VIII §5, PDF p. 6 | Mean of entropies of conditioned pure-state left/right mode reductions. It is not entropy of the unconditional reduced density matrix. |

The model uses two bosons in two sites, `J=1`, `U=4`, `ℏ=1`, and initial amplitudes `(1/2, 1/√2, 1/2)` in `|20⟩, |11⟩, |02⟩`. Local number monitoring uses `L_i=√γ n_i`; recorded strengths are `γ/J=0, 0.5, 2`. All time values are `Jt/ℏ`. The archive reports only five time rows per strength. The Library draws discrete points, and labels archived Monte Carlo values separately from independently reproduced master values. `scripts/verify-rb87-chapter-eight.py` independently reproduces all 15 exact `P11` and master-purity entries; it does not resample the 1200 paths.

The finite dimer cannot establish a thermodynamic measurement-induced transition (VIII §6, PDF pp. 6–7). The static Atlas dimer does not implement this monitored evolution. Feedback, preparation, and quantum correction are outside this visual.

## Preparation visual

Chapter VIII §8, PDF pp. 7–8, defines the ideal jump `L_prep=√κ|G⟩⟨E|` and exact target fidelity `F_G(t)=1−[1−F_G(0)]e^(−κt)` under a target-preserving Hamiltonian and no competing dissipator. With `F_G(0)=0.25`, the supplied `dissipative_preparation.csv` has 21 rows from `κt=0` to `5` in steps of `0.25`; CSV SHA-256 `f42b578f78a5a38f36476f8f4e6e3c0d1b003ad6014beb8877ff44d854367cb9`. The exact values match the formula to `1e-12` in the independent verifier. The 3000-path estimates are archived Monte Carlo results and were not independently resampled. The visual uses the analytic curve and distinct sample points.

Chapter VIII §9, PDF pp. 8–9, distinguishes preparation of a known target from correction of unknown logical amplitudes. A unique attractive state does not by itself preserve an arbitrary encoded qubit. The visual makes no local Rb87 optical-pumping or autonomous quantum-memory claim.
