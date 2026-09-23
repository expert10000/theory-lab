$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot
if (-not (Test-Path -LiteralPath '.venv/Scripts/python.exe')) {
    py -3.12 -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.12 is required. Install it and retry.' }
}
& '.venv/Scripts/python.exe' -m pip install -e './workers/quantum-python'
if ($LASTEXITCODE -ne 0) { throw 'Worker dependency installation failed.' }
