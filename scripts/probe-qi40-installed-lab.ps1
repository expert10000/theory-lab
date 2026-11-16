param(
  [Parameter(Mandatory = $true)][string]$Installer,
  [Parameter(Mandatory = $true)][string]$PackagedRoot,
  [Parameter(Mandatory = $true)][string]$InstallRoot,
  [Parameter(Mandatory = $true)][string]$EvidencePath
)

$ErrorActionPreference = 'Stop'
$installerPath = (Resolve-Path -LiteralPath $Installer).Path
$packagedPath = (Resolve-Path -LiteralPath $PackagedRoot).Path
$installPath = [IO.Path]::GetFullPath($InstallRoot)
$evidenceFile = [IO.Path]::GetFullPath($EvidencePath)
if (Test-Path -LiteralPath $installPath) { throw "InstallRoot already exists: $installPath" }
if (Test-Path -LiteralPath $evidenceFile) { throw "EvidencePath already exists: $evidenceFile" }
New-Item -ItemType Directory -Path (Split-Path -Parent $evidenceFile) -Force | Out-Null

$component = & (Join-Path $PSScriptRoot 'verify-qi40-installer-nsis.ps1') -Installer $installerPath | ConvertFrom-Json
$started = Get-Date
$record = [ordered]@{
  schema = 'theory-lab/qi40-installed-lab-probe/v1'
  installerName = [IO.Path]::GetFileName($installerPath)
  installerSha256 = $component.installerSha256
  nsisSystemDllSha256 = $component.systemDllSha256
  startedUtc = $started.ToUniversalTime().ToString('o')
  installExitCode = $null
  installed = $null
  failure = $null
}
try {
  $process = Start-Process -FilePath $installerPath -ArgumentList @('/S', '/CURRENTUSER', "/D=$installPath") -WindowStyle Hidden -PassThru
  if (-not $process.WaitForExit(180000)) {
    try { Stop-Process -Id $process.Id -Force -ErrorAction Stop } catch { }
    throw 'Theory Lab installer exceeded 180 seconds'
  }
  $record.installExitCode = $process.ExitCode
  if ($process.ExitCode -ne 0) {
    $hex = '0x{0:X8}' -f ($process.ExitCode -band 0xffffffffL)
    throw "Theory Lab installer exited with $hex"
  }
  $files = [ordered]@{
    executable = 'Quantum Hamiltonian Lab.exe'
    appAsar = 'resources/app.asar'
    workerExe = 'resources/quantum-worker/quantum-worker.exe'
  }
  $installed = [ordered]@{}
  foreach ($key in $files.Keys) {
    $relative = $files[$key]
    $source = Join-Path $packagedPath $relative
    $destination = Join-Path $installPath $relative
    if (-not (Test-Path -LiteralPath $destination -PathType Leaf)) {
      throw "Installed payload missing: $relative"
    }
    $sourceSha = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
    $installedSha = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($sourceSha -ne $installedSha) { throw "Installed payload differs from packaged app: $relative" }
    $installed[$key] = $installedSha
  }
  $record.installed = $installed
} catch {
  $record.failure = $_.Exception.Message
  try {
    $record.applicationErrors = @(Get-WinEvent -FilterHashtable @{
      LogName = 'Application'; Id = 1000; StartTime = $started.AddSeconds(-5)
    } -ErrorAction SilentlyContinue | Where-Object {
      $_.Properties.Count -gt 0 -and $_.Properties[0].Value -eq $record.installerName
    } | Select-Object -First 3 | ForEach-Object {
      [ordered]@{
        timeUtc = $_.TimeCreated.ToUniversalTime().ToString('o')
        faultingModule = if ($_.Properties.Count -gt 3) { $_.Properties[3].Value } else { $null }
        exceptionCode = if ($_.Properties.Count -gt 6) { $_.Properties[6].Value } else { $null }
      }
    })
  } catch { $record.applicationErrors = @() }
} finally {
  $record.endedUtc = (Get-Date).ToUniversalTime().ToString('o')
  $record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $evidenceFile -Encoding utf8
}
if ($record.failure) { throw $record.failure }
Write-Host "Installed Theory Lab payload matches packaged candidate: $evidenceFile"
