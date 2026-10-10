# Run after installing bridge dependencies. Uses only ignored local test directories.
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$errors = $null
foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.ps1') {
    $tokens = $null
    [void][Management.Automation.Language.Parser]::ParseFile($file.FullName,[ref]$tokens,[ref]$errors)
    if ($errors.Count) { throw ('PowerShell parse failure: ' + $file.Name) }
}
$local = Join-Path $taskRoot '.local'
$config = Join-Path $local 'bridge.json'
if (-not (Test-Path -LiteralPath $config)) { throw 'Run Install.ps1 before testing wrappers.' }
$originalConfig = [IO.File]::ReadAllBytes($config)
$fixture = Join-Path $local ('install-preflight-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path (Join-Path $fixture 'scripts') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Install.ps1') -Destination (Join-Path $fixture 'scripts\Install.ps1')
$fixtureSkill = Join-Path $fixture 'skill'
$rejected = $false
try { & (Join-Path $fixture 'scripts\Install.ps1') -SkillDirectory $fixtureSkill -SkipDependencies | Out-Null }
catch { if ($_.Exception.Message -match 'First install requires explicit') { $rejected=$true } else { throw } }
if (-not $rejected -or (Test-Path -LiteralPath $fixtureSkill) -or (Test-Path -LiteralPath (Join-Path $fixture '.local'))) { throw 'Missing first-install roots must fail before writes.' }
New-Item -ItemType Directory -Path (Join-Path $fixture '.local') -Force | Out-Null
[IO.File]::WriteAllText((Join-Path $fixture '.local\bridge.json'),'{"port":8787,"workspaceRoots":["relative"],"handoffRoot":".local/handoff"}')
$fixtureConfig = [IO.File]::ReadAllText((Join-Path $fixture '.local\bridge.json'))
$rejected = $false
try { & (Join-Path $fixture 'scripts\Install.ps1') -SkillDirectory $fixtureSkill -SkipDependencies | Out-Null }
catch { if ($_.Exception.Message -match 'Existing workspaceRoots') { $rejected=$true } else { throw } }
if (-not $rejected -or (Test-Path -LiteralPath $fixtureSkill) -or [IO.File]::ReadAllText((Join-Path $fixture '.local\bridge.json')) -ne $fixtureConfig) { throw 'Invalid existing config must fail before Skill/config writes.' }
$skill = Join-Path $local ('install-test-' + [guid]::NewGuid().ToString('N'))
$source = Join-Path $taskRoot 'plugin\codex-dispatch\skills\codex-dispatch\SKILL.md'
& (Join-Path $PSScriptRoot 'Install.ps1') -WorkspaceRoots @($taskRoot) -Port 19999 -SkillDirectory $skill -SkipDependencies | Out-Null
if ([Convert]::ToBase64String([IO.File]::ReadAllBytes($config)) -ne [Convert]::ToBase64String($originalConfig)) { throw 'Existing config was changed.' }
if ((Get-FileHash -LiteralPath (Join-Path $skill 'SKILL.md')).Hash -ne (Get-FileHash -LiteralPath $source).Hash) { throw 'Skill installation differs.' }
$sourceSkillRoot = Split-Path $source -Parent
foreach ($file in Get-ChildItem -LiteralPath $sourceSkillRoot -Recurse -File -Force) {
    $relative = $file.FullName.Substring($sourceSkillRoot.Length + 1)
    $installed = Join-Path $skill $relative
    if (-not (Test-Path -LiteralPath $installed) -or (Get-FileHash -LiteralPath $installed).Hash -ne (Get-FileHash -LiteralPath $file.FullName).Hash) { throw ('Skill supporting file missing/different: ' + $relative) }
}
& (Join-Path $PSScriptRoot 'Install.ps1') -SkillDirectory $skill -SkipDependencies | Out-Null
if ([Convert]::ToBase64String([IO.File]::ReadAllBytes($config)) -ne [Convert]::ToBase64String($originalConfig)) { throw 'Upgrade without roots changed existing config.' }
[IO.File]::WriteAllText((Join-Path $skill 'SKILL.md'),'existing custom content')
$refused = $false
try { & (Join-Path $PSScriptRoot 'Install.ps1') -WorkspaceRoots @($taskRoot) -SkillDirectory $skill -SkipDependencies | Out-Null }
catch { if ($_.Exception.Message -match 'Existing skill differs') { $refused=$true } else { throw } }
if (-not $refused -or [IO.File]::ReadAllText((Join-Path $skill 'SKILL.md')) -ne 'existing custom content') { throw 'Conflicting skill was not preserved.' }
& (Join-Path $PSScriptRoot 'Install.ps1') -WorkspaceRoots @($taskRoot) -SkillDirectory $skill -SkipDependencies -UpdateSkill | Out-Null
$backups = @(Get-ChildItem -LiteralPath $skill -Filter 'SKILL.md.backup-*')
if ($backups.Count -ne 1 -or [IO.File]::ReadAllText($backups[0].FullName) -ne 'existing custom content') { throw 'Skill update backup failed.' }
$reference = Join-Path $skill 'references\instruction-file.md'
if (Test-Path -LiteralPath $reference) {
    [IO.File]::WriteAllText($reference,'existing custom reference')
    $refused = $false
    try { & (Join-Path $PSScriptRoot 'Install.ps1') -SkillDirectory $skill -SkipDependencies | Out-Null }
    catch { if ($_.Exception.Message -match 'Existing skill differs') { $refused=$true } else { throw } }
    if (-not $refused -or [IO.File]::ReadAllText($reference) -ne 'existing custom reference') { throw 'Reference collision was not preserved.' }
    & (Join-Path $PSScriptRoot 'Install.ps1') -SkillDirectory $skill -SkipDependencies -UpdateSkill | Out-Null
    $referenceBackups = @(Get-ChildItem -LiteralPath (Split-Path $reference -Parent) -Filter 'instruction-file.md.backup-*')
    if ($referenceBackups.Count -ne 1 -or [IO.File]::ReadAllText($referenceBackups[0].FullName) -ne 'existing custom reference') { throw 'Reference update backup failed.' }
}
$oldPipe = $env:CODEX_APP_TOOLS_PIPE_PATH
try {
    [Environment]::SetEnvironmentVariable('CODEX_APP_TOOLS_PIPE_PATH',$null)
    $rejected=$false
    try { & (Join-Path $PSScriptRoot 'Start-Bridge.ps1') | Out-Null }
    catch { if ($_.Exception.Message -match 'DESKTOP_CONTEXT_REQUIRED') { $rejected=$true } else { throw } }
    if (-not $rejected) { throw 'Missing desktop context must not start Bridge.' }
} finally { [Environment]::SetEnvironmentVariable('CODEX_APP_TOOLS_PIPE_PATH',$oldPipe) }
Write-Output 'PASS: script syntax, first-install roots required, invalid-config refusal before writes, upgrade reuses config, config preservation, exact Skill installation, collision refusal, update backup and missing-context rejection.'
