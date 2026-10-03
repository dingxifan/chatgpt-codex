[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$source = Join-Path $taskRoot 'plugin\codex-dispatch'
$manifest = Get-Content -Raw -LiteralPath (Join-Path $source 'plugin.json') | ConvertFrom-Json
$out = Join-Path $taskRoot 'out'
New-Item -ItemType Directory -Path $out -Force | Out-Null
$archive = Join-Path $out ('codex-dispatch-v' + $manifest.version + '.zip')
if (Test-Path -LiteralPath $archive) { throw 'Archive already exists; retain it or choose a fresh output before repackaging.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($source, $archive, [IO.Compression.CompressionLevel]::Optimal, $true)
Write-Output $archive
