# Bounded Hofstadter bulk–edge comparison

In **Topological bands → Sweeps → Bulk–edge comparison**, choose a reduced
nonzero `p/q`, occupied-band count, hopping, bulk momentum grid and strip
momentum samples. Theory Lab saves one periodic bulk run plus independently
computed 18- and 24-site open strips. Each source remains an immutable
hash-verified run. Reopening the study and exporting its `.qscene` reverify
all three jobs, results and the derived comparison.

The bulk producer supplies a global filled-band gap, Fermi energy and
conditional TKNN/FHS Hall value. Each study retains the original
sorted-index crossing counts as a separately labelled observation. Those
counts require at least 0.35 boundary probability at both samples.
New study status uses the overlap-validated crossings described below;
legacy status continues to use only the originally saved sampled evidence.

For new runs with a specified Fermi energy, the producer also saves bounded
adjacent-sample eigenvector-overlap assignments. It maximizes total squared
overlap and admits a tracked crossing only above overlap 0.5, winner margin
0.02, and boundary weight 0.35 at both samples. The 31-point strip grid and
both widths must resolve matching opposite flows. If the assignment is
ambiguous or the two widths disagree, the new comparison is **undefined**.
At `p/q=1/3` the 31-point example is ambiguous; `p/q=1/6` with the same
18- and 24-site terminations is a resolved bounded example. Different strip
terminations can shift crossing momentum even when each strip has a clear
overlap assignment.

Earlier saved studies retain their original sorted-index evidence and status.
They reopen with an explicit legacy label; their source results did not save
the eigenvector overlaps. This is a bounded sampled-continuation diagnostic,
not a unique physical edge-channel classification. Gap closure, weak
localization, coarse momentum sampling and width disagreement remain visible.

The exported scene contains exact bulk energies and both strips' exact
energy and boundary-weight samples. New scenes also include the accepted
crossing segments, exact crossing positions and stored overlap values, with
run hashes for each strip. The strip lanes in the combined viewer
are display offsets, not physical positions. Math3D displays these supplied
values read-only and rechecks source bytes before sample inspection. No
experimental transport, robust Hall plateau or unique edge-channel
classification is claimed.
