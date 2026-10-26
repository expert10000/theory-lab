# Bounded Hofstadter bulk–edge comparison

In **Topological bands → Sweeps → Bulk–edge comparison**, choose a reduced
nonzero `p/q`, occupied-band count, hopping, bulk momentum grid and strip
momentum samples. Theory Lab saves one periodic bulk run plus independently
computed 18- and 24-site open strips. Each source remains an immutable
hash-verified run. Reopening the study and exporting its `.qscene` reverify
all three jobs, results and the derived comparison.

The bulk producer supplies a global filled-band gap, Fermi energy and
conditional TKNN/FHS Hall value. At each finite strip, the comparison counts
a sampled Fermi crossing only when the same boundary has at least 0.35
probability at both adjacent momentum samples. Its signed direction is
compared separately for the left and right boundaries. A **consistent**
result requires a resolved bulk gap and Chern value, matching opposite
left/right flow at both widths, and crossing locations stable within one
sample interval. Otherwise the result is **undefined** with a reason.

Sorted strip eigenvalue indices are not tracked eigenstate identities. This
is a bounded consistency diagnostic, not a general proof of branch identity.
The finite-width evidence and its thresholds are reported alongside the
verified inputs. Gap closure, weak localization, coarse momentum sampling
and width disagreement do not receive a bulk–edge agreement label.

The exported scene contains exact bulk energies and both strips' exact
energy and boundary-weight samples. The strip lanes in the combined viewer
are display offsets, not physical positions. Math3D displays these supplied
values read-only and rechecks source bytes before sample inspection. No
experimental transport, robust Hall plateau or unique edge-channel
classification is claimed.
