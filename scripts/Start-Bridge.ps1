[CmdletBinding()]
param([string]$AppToolsServer)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
foreach ($name in @('CODEX_APP_TOOLS_PIPE_PATH','CODEX_THREAD_ID','CODEX_MCP_NODE_PATH')) {
    if (-not [Environment]::GetEnvironmentVariable($name)) { throw ('DESKTOP_CONTEXT_REQUIRED: ' + $name + ' missing. Run from a current Codex desktop session; never copy session context.') }
}
if (-not $AppToolsServer) { $AppToolsServer = $env:CODEX_APP_TOOLS_SERVER }
if (-not $AppToolsServer) {
    $codexBase = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
    $toolBase = Join-Path $codexBase 'plugins\cache\openai-bundled\codex-app-tools'
    $candidates = @(Get-ChildItem -LiteralPath $toolBase -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^\d+\.\d+\.\d+$' } | Sort-Object { [version]$_.Name } -Descending)
    foreach ($candidate in $candidates) {
        $server = Join-Path $candidate.FullName 'server.mjs'
        if (Test-Path -LiteralPath $server -PathType Leaf) { $AppToolsServer = $server; break }
    }
}
if (-not $AppToolsServer -or -not [IO.Path]::IsPathRooted($AppToolsServer) -or -not (Test-Path -LiteralPath $AppToolsServer -PathType Leaf)) { throw 'Installed codex-app-tools server.mjs not found. Supply -AppToolsServer using a verified local installation.' }
$config = Get-Content -Raw -LiteralPath (Join-Path $taskRoot '.local\bridge.json') | ConvertFrom-Json
if ($config.port -lt 1 -or $config.port -gt 65535 -or @($config.workspaceRoots).Count -eq 0) { throw 'Invalid local configuration.' }
$entry = Join-Path $taskRoot 'bridge\dist\src\index.js'
if (-not (Test-Path -LiteralPath $entry)) { throw 'Build missing; run Install.ps1 first.' }
$listener = New-Object System.Net.Sockets.TcpListener([Net.IPAddress]::Loopback, [int]$config.port)
try { $listener.Start() } catch { throw 'Selected port is occupied; identify the existing service or choose another port. No process was stopped.' } finally { $listener.Stop() }
$handoff = if ([IO.Path]::IsPathRooted($config.handoffRoot)) { $config.handoffRoot } else { Join-Path $taskRoot $config.handoffRoot }
$logRoot = Join-Path $taskRoot '.local\logs'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
$suffix = [guid]::NewGuid().ToString('N')
$stdout = Join-Path $logRoot ('bridge-' + $suffix + '.out.log')
$stderr = Join-Path $logRoot ('bridge-' + $suffix + '.err.log')
$values = @{ CODEX_APP_TOOLS_SERVER=$AppToolsServer; CODEX_WORKSPACE_ROOTS=(ConvertTo-Json -InputObject @($config.workspaceRoots) -Compress); HOST='127.0.0.1'; PORT=[string]$config.port; CODEX_AGENT_HANDOFF_ROOT=$handoff; CODEX_AGENT_ALLOWED_HOSTS=(@($config.allowedHosts) -join ',') }
$previous = @{}
try {
    foreach ($name in $values.Keys) { $previous[$name] = [Environment]::GetEnvironmentVariable($name); [Environment]::SetEnvironmentVariable($name,$values[$name]) }
    $process = Start-Process -FilePath $env:CODEX_MCP_NODE_PATH -ArgumentList @('"' + $entry + '"') -WorkingDirectory (Join-Path $taskRoot 'bridge') -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
} finally { foreach ($name in $previous.Keys) { [Environment]::SetEnvironmentVariable($name,$previous[$name]) } }
Write-Output ('STARTED: PID=' + $process.Id + '; URL=http://127.0.0.1:' + $config.port + '; stderr=' + $stderr)
Write-Output 'Run Test-Bridge.mjs. Process creation alone is not readiness or dispatch proof.'
