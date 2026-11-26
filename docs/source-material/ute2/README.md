# UTe2 chapter intake

The user supplied `UTe2_Quantum_Hamiltonians_Chapter.pdf`, a nine-page scientific study edition dated 25 November 2026. `CHAPTER_SOURCE.json` pins its byte length, SHA-256, section locators, and the two dated primary research references. The PDF is intentionally kept outside the public repository; this record does not grant redistribution rights or turn the chapter into application code.

Run `node scripts/verify-ute2-source.mjs <path-to-the-local-PDF>` before using a local copy. The command refuses changed bytes and recomputes the chapter's two worked examples: the single-sector BdG quasiparticle in §12.2 and the two-component Landau equilibrium in §12.1. It verifies only the recorded source and elementary reference arithmetic. It does not independently validate a UTe2 band structure, pairing symmetry, experimental phase boundary, Chern number, or Majorana mode.

Use [the journey roadmap](../../UTE2_JOURNEY_ROADMAP.md) for implementation sequence and claim limits. Source sections are cited by section and PDF page there. The October 2026 [Nature Physics](https://doi.org/10.1038/s41567-026-03504-z) and [Physical Review X](https://doi.org/10.1103/qjt6-hj2k) articles support the chapter's experimental motivation; the chapter's square-lattice p-wave and scalar BdG examples are pedagogical models, not measured UTe2 Hamiltonians.
