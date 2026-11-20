# Reviewed Chapter VII Library path

**Pinned source:** `Chapter_7_Open_Quantum_Systems.pdf`, SHA-256 `bd3587629480236bde7235598fd2495b70e1494429fee20ce251e3f0cdcaa5dd` (9 PDF pages). The Library withholds this path if the PDF fails its hash check. The UI uses only the specific examples reviewed below; it does not endorse every numerical scale or bibliography item in the chapter.

| Library claim | Chapter VII locator | Scope checked |
| --- | --- | --- |
| Unread outcomes give unconditional GKSL evolution; a retained record conditions a trajectory | §§1–2, 4; PDF pp. 3–4 | The channel operator and record must be specified separately. |
| Local number monitoring `L_L=√γ n_L`, `L_R=√γ n_R` | §§5–6; PDF pp. 4–5 | For one atom initially `(\|L⟩+\|R⟩)/√2` and no tunneling, populations remain 1/2 while normalized coherence is `e^(−γt)`. This is an ideal spatially resolved model. |
| Local one-body loss `L_i=√κ a_i` | §7; PDF p. 5 | For one initial atom and no refilling, survival is `e^(−κt)` and the complementary weight is in the zero-particle sector. This differs from dephasing. |
| Internal spontaneous-emission jump `L_em=√Γ\|g⟩⟨e\|` | §§3–4; PDF p. 4 | For one initially excited ideal two-level atom without re-excitation, excited-state survival is `e^(−Γt)`; emission puts the atom in its ground internal state. |
| Detector efficiency and imaging limits | §§11–12; PDF p. 7 | The interactive single-photon illustration uses `P(detected)=η[1−e^(−Γt)]` only for the at-most-one-photon case. Sustained driven fluorescence needs another model, including collection, recoil, cooling, hopping, and possible loss. |

The plotted rate × time slider is dimensionless and uses a different physical rate in each panel. It compares three **separate one-atom examples**, not three channels applied simultaneously to the same Rb87 system. The existing Chapter VIII monitoring plot is linked as **related theory**: it reports archived two-boson results and is not a result of these one-atom illustrations. No new runnable Lab solver or measured camera image is claimed.

Independent primary-source cross-checks: [Mekhov and Ritsch, 2009](https://arxiv.org/abs/0904.4210) describe a light-scattering measurement that changes the atomic state without particle loss, while [Shotter, 2011](https://arxiv.org/abs/1011.5426) models fluorescence signal degradation and loss processes during lattice imaging. These support separating measurement backaction from particle loss and detector readout. They do not validate an Rb87 implementation of this exact Library illustration. The chapter's dated D2 numeric example and 2026 reference are omitted from the UI pending separate source verification.
