# QI-04 QWZ Scene Compiler

The QWZ recipe registry in `packages/quantum-scene/recipes.ts` names `qwz-curvature/v1` and `qwz-bands/v1`, declares their capabilities and `quantum-scene/v1` output, and pins compiler version `qvis-compiler/1`. The numeric policy `source-f64le-exact/1` retains worker Float64 samples and existing k-grid ordering without rounding or interpolation. Scene geometry and display guides still come from the existing adapters.

`RunStore.scene()` selects the registry for verified QWZ saved runs. The compiler compares its result object to the exact saved result bytes, hashes those bytes for scene provenance, checks the topology result, and verifies the output schema. It does not rewrite the saved run or change the scene reader. For the pinned run `run-05ce1036d70c466eb4f900944a85c474`, recompilation twice yields identical payloads. The curvature scene JSON SHA-256 remains `38f8275bfd0e568251ef44742fe7ef412c958cb066e713558768cc2872af65b5`; bands remains `9759d1e5555fd8c7af7614a08e372593d55398894960f5d96eb41a349555890b`.

`npx tsx --test tests/result-v2-qwz.test.ts` is the golden gate. Other models continue through their existing adapters until each receives its own reviewed recipe and fixture.
