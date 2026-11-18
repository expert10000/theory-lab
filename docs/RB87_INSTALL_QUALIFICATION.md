# Rb87 dimer installed handoff check

Date: 2026-11-18. Scope: local unsigned Theory Lab installer candidate on Windows, installed to an isolated temporary directory; real `C:\Math3D` source checkout as the Math3D target. This is a feature check, not QI-40 release acceptance or a two-installed-app qualification.

The installer was built with the pinned NSIS 3.13 toolchain and `signAndEditExecutable=false`. The normal signing-helper extraction failed because this Windows session could not create symbolic links. The installed Lab executable, `app.asar`, and frozen worker matched the packaged copies byte for byte. Installer SHA-256: `1f5e27f145df8569ea3c4cfa041cc40d54511659402e7692ea99134db192682d`. Pinned NSIS `System.dll` SHA-256: `1556ee1bf1cb477124e1269b534ed81653ba71994dab7903ee3782b75acc2810`.

The installed acceptance script opened Chapter III in Lab's PDF reader and checked the PDF content type, then restarted the installed app and found all seven chapters available. It changed the installed Chapter III bytes, observed the chapter become unavailable and open fail on a hash check, restored the exact bytes, and observed availability return.

The script ran an N=3, U/J=2 dimer, restarted, reopened the exact result from **Runs**, and checked its recorded units. A wrong result hash blocked Math3D launch. The valid launch wrote a `.qscene` whose `scene.json` SHA-256 matched `bundle.json`, retained the run/result hash, and used `bosons per site`. The local Math3D checkout started with that exact scene path and kept a renderer process. The test closed only the process it launched. This establishes the installed Lab to checkout handoff; an installed Math3D executable was not available locally.

Reproduce the app-level check with `node scripts/accept-rb87-installed.mjs <installed Lab.exe> <Math3D checkout or installed Math3D.exe>`. The script uses isolated Lab and Math3D profiles and removes its generated profile after the run. The local restart/tamper desktop smoke is `npm run test:bose-hubbard-desktop`.

The isolated test installation was silently uninstalled after acceptance. The Hamiltonian Atlas entry stays reference-only. The Rb87 dimer and Companion content do not expand Math3D 2.0 claims or satisfy QI-40's separate direct-launch gate.
