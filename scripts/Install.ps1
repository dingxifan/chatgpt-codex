[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string[]]$WorkspaceRoots,
    [ValidateRange(1,65535)][int]$Port = 8787,
    [string]$SkillDirectory = (Join-Path $env:USERPROFILE '.agents\skills\codex-dispatch'),
    [switch]$UpdateSkill,
    [switch]$SkipDependencies
)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object System.Text.UTF8Encoding($false)
$node = (Get-Command node -ErrorAction Stop).Source
$major = [int]((& $node --version).TrimStart('v').Split('.')[0])
if ($major -lt 20) { throw 'Node.js 20+ required.' }
$roots = @($WorkspaceRoots | ForEach-Object {
    if (-not [IO.Path]::IsPathRooted($_) -or -not (Test-Path -LiteralPath $_ -PathType Container)) { throw 'Each workspace root must be an existing absolute directory.' }
    (Resolve-Path -LiteralPath $_).Path
} | Select-Object -Unique)
if ($roots.Count -eq 0) { throw 'At least one workspace root required.' }
$source = Join-Path $taskRoot 'plugin\codex-dispatch\skills\codex-dispatch\SKILL.md'
$destination = Join-Path $SkillDirectory 'SKILL.md'
$different = (Test-Path -LiteralPath $destination) -and ((Get-FileHash -LiteralPath $destination).Hash -ne (Get-FileHash -LiteralPath $source).Hash)
if ($different -and -not $UpdateSkill) { throw 'Existing skill differs. Compare it first; use -UpdateSkill only for an intended update.' }
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
Push-Location (Join-Path $taskRoot 'bridge')
try {
    if (-not $SkipDependencies) { & $npm ci --ignore-scripts; if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' } }
    if (-not (Test-Path -LiteralPath 'node_modules')) { throw 'Dependencies missing; do not use -SkipDependencies on a fresh install.' }
    & $npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
} finally { Pop-Location }
New-Item -ItemType Directory -Path $SkillDirectory -Force | Out-Null
if ($different) { Copy-Item -LiteralPath $destination -Destination ($destination + '.backup-' + [guid]::NewGuid().ToString('N')) }
Copy-Item -LiteralPath $source -Destination $destination -Force
$local = Join-Path $taskRoot '.local'
New-Item -ItemType Directory -Path $local -Force | Out-Null
$config = Join-Path $local 'bridge.json'
if (-not (Test-Path -LiteralPath $config)) {
    $value = [ordered]@{ workspaceRoots=$roots; port=$Port; handoffRoot='.local/handoff'; allowedHosts=@() }
    [IO.File]::WriteAllText($config, ($value | ConvertTo-Json -Depth 4), $utf8)
} else { Write-Output 'Existing configuration preserved; inspect its workspaceRoots and port.' }
Write-Output ('PREPARED: skill=' + $destination + '; config=' + $config)
Write-Output 'Desktop, Tunnel and ChatGPT validation are separate steps; installation is not yet end-to-end verified.'
