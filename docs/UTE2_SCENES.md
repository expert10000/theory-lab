# UTe₂ journey scene mapping

Theory Lab exports from a saved, hash-verified run through `quantum-scene/v1` in a `quantum-scene-bundle/v1` directory. The export control is available after opening a saved result. The host verifies the source again after folder selection. The result SHA-256 is in scene provenance; binary datasets and `scene.json` have their own bundle hashes. An exported bundle is portable and can reopen without the original run. Its provenance says which result produced it; it cannot detect a later mutation of that separate original run. A new export from a missing or changed source is refused.

| Saved run | Display mapping | Explicit limit |
| --- | --- | --- |
| Two-order Landau | `r1`, `r2`, `F` stationary positions; subsets label locally stable and tied global minima. | Uniform dimensionless example; no coefficient surface, temperature/pressure fit or measured phase boundary. |
| Reduced BdG | Exact ordered negative/positive branches over `xi`; positive-branch electron/hole weights where defined; sampled zero-energy points. | `xi` is not crystal momentum. Undefined weights are omitted, and no bulk topology is inferred. |
| Square-lattice pairing | Exact half-open kx-major/ky-minor point samples: `xi`, complex pairing components, gap magnitude, two energies, defined pairing phase, coherence weights, and binary phase/coherence/node masks. Masked weights are stored as zero with a separate validity mask. | Points have no interpolation or periodic seam. A missing sampled node does not qualify a continuous bulk gap. |
| Class-D bulk receipt | One exact parameter-space point `(μ, Δₚ, continuous bulk gap)` with saved full-gap and two-mesh convergence diagnostics; conditional toy invariant is present only when defined. | No momentum grid, Berry-curvature surface, material Chern or measured UTe₂ topology is fabricated. |
| Class-D finite strip | Exact saved central-pair density at N and 2N open-x widths, with selected ky, finite status, bulk toy Chern and parent run/hash in provenance parameters. | The scene is a density view, not a full eigenvector or dispersion export. The finite status does not establish an exact zero mode or infinite-width result. |

The qualified bulk result has no retained k-grid arrays to render as a surface. The bulk receipt exports its actual scalar diagnostics as a parameter-space point; a strip scene separately names its qualified bulk parent and digest. These toy scenes do not establish a UTe₂ material Hamiltonian or an installed Theory Lab and Math3D pair. That cross-app gate remains UTe2-5.
