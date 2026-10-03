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
$skill = Join-Path $local ('install-test-' + [guid]::NewGuid().ToString('N'))
$source = Join-Path $taskRoot 'plugin\codex-dispatch\skills\codex-dispatch\SKILL.md'
& (Join-Path $PSScriptRoot 'Install.ps1') -WorkspaceRoots @($taskRoot) -Port 19999 -SkillDirectory $skill -SkipDependencies | Out-Null
if ([Convert]::ToBase64String([IO.File]::ReadAllBytes($config)) -ne [Convert]::ToBase64String($originalConfig)) { throw 'Existing config was changed.' }
if ((Get-FileHash -LiteralPath (Join-Path $skill 'SKILL.md')).Hash -ne (Get-FileHash -LiteralPath $source).Hash) { throw 'Skill installation differs.' }
[IO.File]::WriteAllText((Join-Path $skill 'SKILL.md'),'existing custom content')
$refused = $false
try { & (Join-Path $PSScriptRoot 'Install.ps1') -WorkspaceRoots @($taskRoot) -SkillDirectory $skill -SkipDependencies | Out-Null }
catch { if ($_.Exception.Message -match 'Existing skill differs') { $refused=$true } else { throw } }
if (-not $refused -or [IO.File]::ReadAllText((Join-Path $skill 'SKILL.md')) -ne 'existing custom content') { throw 'Conflicting skill was not preserved.' }
& (Join-Path $PSScriptRoot 'Install.ps1') -WorkspaceRoots @($taskRoot) -SkillDirectory $skill -SkipDependencies -UpdateSkill | Out-Null
$backups = @(Get-ChildItem -LiteralPath $skill -Filter 'SKILL.md.backup-*')
if ($backups.Count -ne 1 -or [IO.File]::ReadAllText($backups[0].FullName) -ne 'existing custom content') { throw 'Skill update backup failed.' }
$oldPipe = $env:CODEX_APP_TOOLS_PIPE_PATH
try {
    [Environment]::SetEnvironmentVariable('CODEX_APP_TOOLS_PIPE_PATH',$null)
    $rejected=$false
    try { & (Join-Path $PSScriptRoot 'Start-Bridge.ps1') | Out-Null }
    catch { if ($_.Exception.Message -match 'DESKTOP_CONTEXT_REQUIRED') { $rejected=$true } else { throw } }
    if (-not $rejected) { throw 'Missing desktop context must not start Bridge.' }
} finally { [Environment]::SetEnvironmentVariable('CODEX_APP_TOOLS_PIPE_PATH',$oldPipe) }
Write-Output 'PASS: script syntax, config preservation, exact Skill installation, collision refusal, update backup and missing-context rejection.'
