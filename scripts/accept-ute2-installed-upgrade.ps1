param(
  [Parameter(Mandatory=$true)][string]$OldInstaller,
  [Parameter(Mandatory=$true)][string]$NewInstaller,
  [Parameter(Mandatory=$true)][string]$OldSha256,
  [Parameter(Mandatory=$true)][string]$NewSha256,
  [Parameter(Mandatory=$true)][string]$WorkRoot
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$temp = [IO.Path]::GetFullPath($env:TEMP).TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar
$root = [IO.Path]::GetFullPath($WorkRoot).TrimEnd('\','/')
if (-not $root.StartsWith($temp,[StringComparison]::OrdinalIgnoreCase)) { throw 'WorkRoot must be a new child of TEMP.' }
if (Test-Path -LiteralPath $root) { throw "WorkRoot already exists: $root" }
$old = (Resolve-Path -LiteralPath $OldInstaller).Path
$new = (Resolve-Path -LiteralPath $NewInstaller).Path
if ((Get-FileHash -LiteralPath $old).Hash -ine $OldSha256 -or (Get-FileHash -LiteralPath $new).Hash -ine $NewSha256) {
  throw 'Installer hash differs from the pinned input.'
}
$install = Join-Path $root 'install'
$profile = Join-Path $root 'profile'
$backup = Join-Path $root 'pre-upgrade-profile'
$rollbackProfile = Join-Path $root 'rollback-profile'
$exe = Join-Path $install 'Quantum Hamiltonian Lab.exe'
$registryRoot = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall'
$registry = @(Get-ChildItem $registryRoot | ForEach-Object { Get-ItemProperty -LiteralPath $_.PSPath } |
  Where-Object { $_.DisplayName -like 'Quantum Hamiltonian Lab*' })
$registryKeys = @($registry | ForEach-Object { $_.PSChildName })
New-Item -ItemType Directory -Path $root | Out-Null
foreach ($key in $registryKeys) {
  & reg.exe export "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\$key" (Join-Path $root "registry-$key.reg") /y | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not back up registration $key" }
}
$record = [ordered]@{ schema='theory-lab/ute2-installed-upgrade/v1'; status='started';
  oldInstallerSha256=$OldSha256.ToLowerInvariant(); newInstallerSha256=$NewSha256.ToLowerInvariant();
  oldSignature=[string](Get-AuthenticodeSignature -LiteralPath $old).Status;
  newSignature=[string](Get-AuthenticodeSignature -LiteralPath $new).Status;
  mode='same-product same-directory replacement, pre-upgrade profile backup for rollback';
  phases=[ordered]@{}; failure=$null }
function Install([string]$path,[string]$name) {
  $process = Start-Process -FilePath $path -ArgumentList @('/S','/CURRENTUSER',"/D=$install") -WindowStyle Hidden -PassThru
  if (-not $process.WaitForExit(180000)) { Stop-Process -Id $process.Id -Force; throw "$name installer timeout" }
  if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $exe)) { throw "$name installer failed: $($process.ExitCode)" }
}
function Phase([string]$name,[string]$profilePath,[string]$seedFile) {
  $args = @((Join-Path $PSScriptRoot 'accept-ute2-installed-upgrade.mjs'),$name,$exe,$profilePath,(Join-Path $root "$name.json"))
  if ($seedFile) { $args += $seedFile }
  & node @args | ForEach-Object { Write-Host $_ }
  if ($LASTEXITCODE -ne 0) { throw "$name UI phase failed" }
  return Get-Content -LiteralPath (Join-Path $root "$name.json") -Raw | ConvertFrom-Json
}
try {
  Install $old 'old'
  $oldExeHash = (Get-FileHash -LiteralPath $exe).Hash.ToLowerInvariant()
  $seed = Phase 'seed' $profile ''
  $record.phases.seed = $seed
  Copy-Item -LiteralPath $profile -Destination $backup -Recurse
  Copy-Item -LiteralPath $backup -Destination $rollbackProfile -Recurse
  $backupHash = (Get-FileHash -LiteralPath (Join-Path $backup "runs\$($seed.legacyRun.runId)\result.json")).Hash.ToLowerInvariant()
  if ($backupHash -ne $seed.legacyRun.resultSha256) { throw 'Backup changed the saved run.' }
  Install $new 'new'
  $newExeHash = (Get-FileHash -LiteralPath $exe).Hash.ToLowerInvariant()
  if ($oldExeHash -eq $newExeHash) { throw 'Installer did not replace the executable.' }
  $verify = Phase 'verify' $profile (Join-Path $root 'seed.json')
  if ($verify.legacyRun.resultSha256 -ne $seed.legacyRun.resultSha256) { throw 'Legacy run changed on upgrade.' }
  $record.phases.verify = $verify
  Install $old 'rollback'
  if ((Get-FileHash -LiteralPath $exe).Hash.ToLowerInvariant() -ne $oldExeHash) { throw 'Rollback executable differs from original.' }
  $rollback = Phase 'rollback' $rollbackProfile (Join-Path $root 'seed.json')
  if ($rollback.legacyRun.resultSha256 -ne $seed.legacyRun.resultSha256) { throw 'Rollback run changed.' }
  $record.phases.rollback = $rollback
  $record.status = 'passed'
} catch {
  $record.status='failed'; $record.failure=$_.Exception.Message
  throw
} finally {
  $after = @(Get-ChildItem $registryRoot | ForEach-Object { Get-ItemProperty -LiteralPath $_.PSPath } |
    Where-Object { $_.DisplayName -like 'Quantum Hamiltonian Lab*' })
  foreach ($item in $after) {
    if ($item.PSChildName -notin $registryKeys) { Remove-Item -LiteralPath (Join-Path $registryRoot $item.PSChildName) -Recurse -Force }
  }
  foreach ($key in $registryKeys) { & reg.exe import (Join-Path $root "registry-$key.reg") | Out-Null }
  $record | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $root 'upgrade-rollback.json') -Encoding utf8
  Write-Host "Lab upgrade/rollback evidence: $(Join-Path $root 'upgrade-rollback.json')"
}
