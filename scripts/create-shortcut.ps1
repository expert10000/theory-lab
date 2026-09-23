$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$electronPath = Join-Path $repoRoot 'node_modules/electron/dist/electron.exe'
if (-not (Test-Path -LiteralPath $electronPath)) { throw 'Run npm ci first.' }
if (-not (Test-Path -LiteralPath (Join-Path $repoRoot 'dist/main.cjs'))) { throw 'Run npm run build first.' }
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath 'Quantum Hamiltonian Lab.lnk'
$shellObject = New-Object -ComObject WScript.Shell
$shortcut = $shellObject.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $electronPath
$shortcut.Arguments = '"' + $repoRoot + '"'
$shortcut.WorkingDirectory = $repoRoot
$shortcut.Description = 'Quantum Hamiltonian Lab - Electron, React and QuTiP'
$shortcut.IconLocation = $electronPath + ',0'
$shortcut.Save()
Write-Output "Desktop shortcut: $shortcutPath"
