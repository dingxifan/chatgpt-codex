[CmdletBinding()]
param(
    [string[]]$WorkspaceRoots,
    [ValidateRange(1,65535)][int]$Port = 8787,
    [string]$SkillDirectory = (Join-Path $env:USERPROFILE '.agents\skills\codex-dispatch'),
    [switch]$UpdateSkill,
    [switch]$SkipDependencies
)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object System.Text.UTF8Encoding($false)
$local = Join-Path $taskRoot '.local'
$config = Join-Path $local 'bridge.json'
$existingConfig = $null
if (Test-Path -LiteralPath $config) {
    $existingConfig = Get-Content -Raw -Encoding UTF8 -LiteralPath $config | ConvertFrom-Json
    if ($existingConfig.port -lt 1 -or $existingConfig.port -gt 65535 -or
        @($existingConfig.workspaceRoots).Count -eq 0 -or
        -not ($existingConfig.handoffRoot -is [string]) -or [string]::IsNullOrWhiteSpace($existingConfig.handoffRoot)) {
        throw 'Invalid existing configuration; inspect .local/bridge.json before updating. No files were changed.'
    }
    foreach ($root in $existingConfig.workspaceRoots) {
        if (-not ($root -is [string]) -or -not [IO.Path]::IsPathRooted($root) -or -not (Test-Path -LiteralPath $root -PathType Container)) {
            throw 'Existing workspaceRoots must be existing absolute directories. Inspect .local/bridge.json; no files were changed.'
        }
    }
}
if (-not $WorkspaceRoots -or $WorkspaceRoots.Count -eq 0) {
    if (-not $existingConfig) { throw 'First install requires explicit -WorkspaceRoots. No files were changed.' }
    $WorkspaceRoots = @($existingConfig.workspaceRoots)
}
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
$sourceSkillRoot = Split-Path $source -Parent
$sourceFiles = @(Get-ChildItem -LiteralPath $sourceSkillRoot -Recurse -File -Force)
$hasInstalledSkill = Test-Path -LiteralPath $destination
$different = $false
if ($hasInstalledSkill) {
    foreach ($file in $sourceFiles) {
        $relative = $file.FullName.Substring($sourceSkillRoot.Length + 1)
        $target = Join-Path $SkillDirectory $relative
        if (-not (Test-Path -LiteralPath $target -PathType Leaf) -or (Get-FileHash -LiteralPath $target).Hash -ne (Get-FileHash -LiteralPath $file.FullName).Hash) { $different = $true; break }
    }
}
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
foreach ($file in $sourceFiles) {
    $relative = $file.FullName.Substring($sourceSkillRoot.Length + 1)
    $target = Join-Path $SkillDirectory $relative
    New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
    if ((Test-Path -LiteralPath $target -PathType Leaf) -and (Get-FileHash -LiteralPath $target).Hash -ne (Get-FileHash -LiteralPath $file.FullName).Hash) {
        Copy-Item -LiteralPath $target -Destination ($target + '.backup-' + [guid]::NewGuid().ToString('N'))
    }
    Copy-Item -LiteralPath $file.FullName -Destination $target -Force
}
New-Item -ItemType Directory -Path $local -Force | Out-Null
if (-not (Test-Path -LiteralPath $config)) {
    $value = [ordered]@{ workspaceRoots=$roots; port=$Port; handoffRoot='.local/handoff'; allowedHosts=@() }
    [IO.File]::WriteAllText($config, ($value | ConvertTo-Json -Depth 4), $utf8)
} else {
    Write-Output ('Existing configuration preserved; effective port=' + $existingConfig.port + '; workspaceRoots=' + (ConvertTo-Json -InputObject @($existingConfig.workspaceRoots) -Compress))
    if ($PSBoundParameters.ContainsKey('WorkspaceRoots') -or $PSBoundParameters.ContainsKey('Port')) {
        Write-Output 'WorkspaceRoots and Port arguments do not replace existing configuration. Edit .local/bridge.json explicitly for an intended configuration change.'
    }
}
Write-Output ('PREPARED: skill=' + $destination + '; config=' + $config)
Write-Output 'Desktop, Tunnel and ChatGPT validation are separate steps; installation is not yet end-to-end verified.'
