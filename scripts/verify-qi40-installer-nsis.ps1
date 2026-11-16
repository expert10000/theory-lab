param([Parameter(Mandatory = $true)][string]$Installer)

$ErrorActionPreference = 'Stop'
$resolvedInstaller = (Resolve-Path -LiteralPath $Installer).Path
$sevenZip = (Get-Command 7z.exe -ErrorAction Stop).Source
$archiveRows = & $sevenZip l -slt $resolvedInstaller
if ($LASTEXITCODE -ne 0) { throw '7-Zip could not inspect the installer' }
$pluginPaths = @($archiveRows | ForEach-Object {
  if ($_ -match '^Path = (.+[\\/])?System\.dll$') { $_.Substring(7) }
})
if ($pluginPaths.Count -ne 1) { throw "Expected one embedded System.dll; found $($pluginPaths.Count)" }
$scratch = Join-Path $(if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { $env:TEMP }) ('theory-lab-nsis-check-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $scratch | Out-Null
& $sevenZip e -y "-o$scratch" $resolvedInstaller $pluginPaths[0] | Out-Null
if ($LASTEXITCODE -ne 0) { throw '7-Zip could not extract System.dll' }
$system = Join-Path $scratch 'System.dll'
if (-not (Test-Path -LiteralPath $system -PathType Leaf)) { throw 'Extracted System.dll is missing' }
$expected = '1556ee1bf1cb477124e1269b534ed81653ba71994dab7903ee3782b75acc2810'
$actual = (Get-FileHash -LiteralPath $system -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw "Installer contains an unpinned System.dll: $actual" }
[ordered]@{
  schema = 'theory-lab/qi40-installer-nsis/v1'
  installer = [IO.Path]::GetFileName($resolvedInstaller)
  installerSha256 = (Get-FileHash -LiteralPath $resolvedInstaller -Algorithm SHA256).Hash.ToLowerInvariant()
  systemDllSha256 = $actual
  systemDllBytes = (Get-Item -LiteralPath $system).Length
} | ConvertTo-Json -Depth 3
