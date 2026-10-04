# QVIS-017 bounded Ising state inspection

The saved `quantum-result/v1` Ising branch remains fingerprint-frozen. An
opt-in `quantum-ising-state/v1` sidecar is computed from an already
hash-verified saved `many_body` job. It names the source run ID and hashes of
its saved job and result. The Electron main process checks the worker reply
against the verified source's engine, site count, ground energy, gap,
site magnetizations and half-chain entropy before caching it. A sidecar is
hash-wrapped; restart reopens it only if the source and wrapper still verify.
Corruption is an error, never a signal to silently recompute.

The worker's two paths are native dense diagonalization and QuSpin's
diagonalization, both mapped into the same site-1-most-significant-bit basis:
`0` means Pauli-z up and `1` means down. Independent residual/norm checks
bound this conversion. A ground gap no greater than
`10⁻⁸ max(1, |E₀|)` is treated as near-degenerate. In that case the sidecar
explicitly withholds unique-state correlations, cut entropy and basis
probabilities; it does not choose an arbitrary eigenvector for inspection.

For a resolved ground state of 2–8 sites, the sidecar contains:

- `Cᶻᶻᵢⱼ = ⟨σᶻᵢσᶻⱼ⟩ − ⟨σᶻᵢ⟩⟨σᶻⱼ⟩`, with symmetry and diagonal identity checks;
- natural-log von Neumann entropy for each contiguous `1..cut | cut+1..N` split;
- up to 16 highest computational-basis probabilities, sorted by probability
  then bit string, and the omitted probability mass.

The displayed probabilities are not amplitudes or a full state vector. The
finite chain is not a thermodynamic phase claim. No general correlation
length is inferred from a 2–8-site matrix. Existing saved runs remain
readable without a sidecar; state inspection is available on demand, and
the selected site links to QVIS-016 only when its exact sidecar is loaded.
