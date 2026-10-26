# Bounded Hofstadter flux sweep

In Theory Lab, choose **Topological bands → Sweeps**. Set hopping, an odd
momentum grid (7, 9, or 11), maximum reduced denominator (3–7), and an
optional occupied-band filling. Run the sweep, select a plotted sample, or
open its exact saved Harper run. Cancel after a flux and resume from a
verified checkpoint. A completed study can export a `.qscene` butterfly from
the Sweeps view.

The plan enumerates `0/1` and all coprime `0 < p < q`, `2 ≤ q ≤ Q`, in
increasing flux order. Each point is a separate periodic Harper topology job
with a hash-verified immutable run. It records every sampled band energy,
coarse and finer-grid bounds, extrema drift, convergence, and each occupied
gap's status. A specified filling is passed only when its occupied-band count
is less than `q`. The ideal bulk Hall value is present only when the producer
resolves the global gap and the occupied Chern result. Otherwise it is
**undefined**; the zero-flux `q=1` sample has no applicable band filling.

The sweep checkpoint is atomic and hashes its payload. Reopening and scene
export reverify every referenced run, its parameters and its recorded values.
The butterfly `.qscene` contains exact `(p/q, energy)` samples in a display
plane and annotates each flux with its source run ID and result SHA-256.
Math3D imports it read-only via **File → Verified quantum examples →
Hofstadter · verified flux butterfly**, or by opening the exported `.qscene`
folder. Its inspector rechecks selected sample bytes. Math3D does not run a
Harper solver. This is a clean-model periodic spectrum and conditional bulk
Hall map, without an experimental plateau or finite-strip edge-channel claim.
