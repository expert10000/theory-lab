# Rb87 Quantum Companion, chapters I–VIII

User-supplied reference material for future Theory Lab work. The original chapters I–VII remain byte for byte unchanged; Chapter VIII and its supporting files are preserved from `Rb87_Quantum_Companion_I-VIII.zip` (archive SHA-256 `f9a3c47d6e1d343fdee05223cdce4e20aead4173e59cb4ce70c53365a75b899e`). All 23 source files match the supplied [SHA-256 manifest](SHA256_MANIFEST.txt). The eight PDFs open successfully; page counts are listed below. The flat Chapter VIII PDF and TeX in `Chapters/` are identical copies of the originals in `Chapter_VIII/` for the Library reader.

| Chapter | Subject | PDF | TeX | Pages |
| --- | --- | --- | --- | ---: |
| I | Atomic structure, Bose statistics, condensate basics | [PDF](Chapters/Chapter_1_Expanded.pdf) | [TeX](Chapters/Chapter_1_Expanded.tex) | 11 |
| II | Interference, coherence, time of flight, imaging | [PDF](Chapters/Chapter_2_Expanded.pdf) | [TeX](Chapters/Chapter_2_Expanded.tex) | 12 |
| III | Optical lattices and Bose–Hubbard derivation | [PDF](Chapters/Chapter_3_Expanded.pdf) | [TeX](Chapters/Chapter_3_Expanded.tex) | 7 |
| IV | Finite Bose–Hubbard calculations and quenches | [PDF](Chapters/Chapter_4_Expanded.pdf) | [TeX](Chapters/Chapter_4_Expanded.tex) | 10 |
| V | Bosonic correlations and entanglement | [PDF](Chapters/Chapter_5_Entanglement_Correlations.pdf) | [TeX](Chapters/Chapter_5_Entanglement_Correlations.tex) | 6 |
| VI | Quantum gas microscopy and measurement limits | [PDF](Chapters/Chapter_6_Quantum_Gas_Microscopy.pdf) | [TeX](Chapters/Chapter_6_Quantum_Gas_Microscopy.tex) | 10 |
| VII | Open systems, fluorescence, loss, and measurement | [PDF](Chapters/Chapter_7_Open_Quantum_Systems.pdf) | [TeX](Chapters/Chapter_7_Open_Quantum_Systems.tex) | 9 |
| VIII | Measurement, feedback, and correction | [PDF](Chapter_VIII/Chapter_8_Measurement_Feedback_QEC.pdf) | [TeX](Chapter_VIII/Chapter_8_Measurement_Feedback_QEC.tex) | 11 |

Chapter VIII also supplies two Python scripts, two numerical CSV tables, and three plots in `Chapter_VIII/`. They are source artifacts, not app code. We did not execute the supplied scripts. The independent [read-only verifier](../../../scripts/verify-rb87-chapter-eight.py) reconstructed its finite two-boson Lindblad master evolution with SciPy's ODE solver: all 15 archived exact population and purity values agreed within `5.2e-13`. Its trajectory estimates were within `0.0213` of the independently computed populations, but their random sampling was not independently rerun. The verifier also matched all 21 exact preparation-fidelity values to `1e-12` and tested each of the three single-bit-flip syndromes and recoveries on an arbitrary encoded state. Run it with `node scripts/python.mjs scripts/verify-rb87-chapter-eight.py`.

The archive establishes file identity, not scientific correctness or external attribution. Chapter VIII distinguishes conditional trajectories from unconditional states, finite-size crossover from a thermodynamic transition, and preparation of a known state from correction of unknown encoded information. No Chapter VIII process is currently a runnable Theory Lab model. Chapter II includes a dated experiment discussion; review its external sources before using that passage in product copy. The [integration roadmap](../../RB87_COMPANION_ROADMAP.md) records current Lab coverage and gaps. Keep chapter and section locators tied to this manifest when adding reviewed explanations.
