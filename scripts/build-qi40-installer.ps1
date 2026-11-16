param([string]$OutputDirectory = 'release')

$ErrorActionPreference = 'Stop'
$toolchainRoot = Join-Path $(if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { $env:TEMP }) ('theory-lab-nsis313-' + [guid]::NewGuid().ToString('N'))
& (Join-Path $PSScriptRoot 'prepare-qi40-nsis313.ps1') -OutputRoot $toolchainRoot
if (-not $env:ELECTRON_BUILDER_NSIS_DIR) { throw 'Pinned NSIS toolchain was not selected' }
& npm run build
if ($LASTEXITCODE -ne 0) { throw 'Theory Lab build failed' }
& node scripts/build-frozen-worker.mjs
if ($LASTEXITCODE -ne 0) { throw 'Theory Lab frozen worker build failed' }
& npx electron-builder --win nsis --config electron-builder.config.cjs "--config.directories.output=$OutputDirectory" --publish never
if ($LASTEXITCODE -ne 0) { throw 'Theory Lab NSIS installer build failed' }
$installers = @(Get-ChildItem -LiteralPath $OutputDirectory -Filter 'Quantum-Hamiltonian-Lab-Setup-*.exe' -File)
if ($installers.Count -ne 1) { throw "Expected one Theory Lab installer; found $($installers.Count)" }
& (Join-Path $PSScriptRoot 'verify-qi40-installer-nsis.ps1') -Installer $installers[0].FullName
