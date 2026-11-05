# QI-31–33: bounded QEC evidence and saved-run review

The Atlas includes a source-hash-checked three-qubit repetition-code example. Its syndrome rounds, defects, correction and logical result are checked from the pinned source. It is not a general surface-code decoder or failure-rate study.

Runs provenance now displays numerical diagnostics from an independently reopened saved run. The dashboard measures available normalization, trace, damped-oscillator density-matrix Hermiticity and resolved-state orthogonality and labels unsupported checks as unavailable. It surfaces producer invariant/resolution and cutoff evidence without claiming convergence from one grid.

A/B comparison keeps exact coordinates as the default. Opt-in scalar interpolation uses only overlapping coordinates with compatible declared units; it reports that interpolation error and source uncertainty are unquantified. Two-level eigenstate matching uses squared overlap and refuses missing, degenerate or ambiguous pairs. Complex amplitudes are never subtracted as physical observables.
