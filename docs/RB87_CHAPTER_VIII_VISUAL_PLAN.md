# Next feature: monitored dimer evidence visual

**Time box:** 3–4 focused hours. **Status:** prepared, not implemented. This follows the Chapter VIII source intake and independent exact-value check.

## Reader outcome

In the Companion Library, a reader selects one of the archived monitoring strengths `γ/J = 0, 0.5, 2` and moves among the five recorded times `Jt/ℏ = 0, 0.5, 1, 2, 3`. A compact plot shows the probability of one boson on each site. A second plot shows the unconditional density-matrix purity. A separate plot shows the **mean spatial-mode entropy of conditioned pure trajectories**. Exact master-equation values and archived 1200-trajectory estimates have distinct marks and labels. A selected point displays its numerical value and source.

The screen names the idealized model: two bosons, two sites, `U/J = 4`, initial amplitudes `(1/2, 1/√2, 1/2)` in `|20⟩, |11⟩, |02⟩`, and local number-monitoring operators `L_i = √γ n_i`. The existing Atlas dimer is a static eigenstate job. This visual is a recorded monitored-evolution example, with no new runnable solver, feedback controller, quantum-error-correction feature, Rb87 calibration, or claim of an experimental image or thermodynamic transition.

## Evidence and data contract

- Pin the Chapter VIII PDF SHA-256 `376e1adf84021f558a33899f4b37019e088f58ef0ecee2dbc2774fda7d58709c` and `trajectory_results.csv` SHA-256 `e711c5217e9c89146ce162cff5842e330bb0ae61894d07348e90d86429ac4f4d` in a generated, typed table. Preserve the archived rows exactly; attach the source filename and section locators: VIII §§4–6, PDF pp. 4–7.
- Reuse `scripts/verify-rb87-chapter-eight.py` as the independent numerical gate. It reproduces exact `P11` and master purity; the Monte Carlo columns are archived estimates, checked for plausibility against exact values but not independently resampled.
- Draw only the five recorded times as points or explicitly labeled line segments. Do not imply an exact continuous trajectory between sampled times. Do not treat `mean_trajectory_entropy` as entropy of the unconditional mixed state.
- Gate the visual on `rb87-viii` availability through the existing hash-checked catalog. If the PDF changes or disappears, withhold the source-linked chart and values.

## Implementation slice

1. Review the three plotted quantities, units, equations, and section/page locators against the pinned PDF and TeX; record any correction in a short Chapter VIII review note. Estimate 40–50 minutes.
2. Add a checked, typed data module derived from the CSV and expose one selected row to the Library visual. Estimate 35–45 minutes.
3. Build the accessible selector, three clearly separated plots, value readout, model brief, and link to the Chapter VIII PDF. Estimate 75–100 minutes.
4. Add a meaningful data-integrity test, UI source-withholding test, and desktop interaction smoke. Run typecheck, build, verifier, and smoke. Estimate 45–60 minutes.

**Done when:** the reader can compare monitoring strengths and times; each plotted value traces to the archived row; exact and sampled values are visibly distinct; conditional entropy and unconditional purity are never conflated; a changed PDF withholds the visual; the existing static dimer route still works after restart.

**After this slice:** review the preparation and correction sections separately before considering another visual. A runnable monitored dimer would require its own versioned model, stochastic validation, saved-run provenance, and capability gate.
