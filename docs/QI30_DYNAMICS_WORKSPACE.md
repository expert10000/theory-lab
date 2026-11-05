# QI-30: saved-run dynamics workspace

The evolution plot, Bloch sphere, density matrix, state amplitudes and observable readouts use one selected sample from a saved, verified run. The selected time is bounded by the stored solver interval.

The sampled response panel computes a Hann-windowed discrete Fourier transform of recorded P₁ samples. It requires a complete, uniform time grid and labels frequency in cycles per model time unit. It is display analysis, not an energy spectrum or new solver output.

The solver panel shows the completed result status, exact sample count, run ID and artifact hash. `quantum-result/v1` does not record an early-termination reason or an uncertainty estimate, so the workspace does not infer either or extrapolate beyond the final saved sample.
