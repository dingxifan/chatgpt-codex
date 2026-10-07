[CmdletBinding()]
param([switch]$VerifyOnly)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$source = Join-Path $taskRoot 'plugin\codex-dispatch'
$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $source 'plugin.json') | ConvertFrom-Json
$legacyManifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $source '.codex-plugin\plugin.json') | ConvertFrom-Json
if ($manifest.name -ne 'codex-dispatch' -or $legacyManifest.name -ne $manifest.name -or $legacyManifest.version -ne $manifest.version -or $manifest.version -notmatch '^\d+\.\d+\.\d+$') {
    throw 'Plugin manifests must agree on codex-dispatch and a release version. No archive was changed.'
}
$out = Join-Path $taskRoot 'out'
$archive = Join-Path $out ('codex-dispatch-v' + $manifest.version + '.zip')
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (-not (Test-Path -LiteralPath $archive)) {
    if ($VerifyOnly) { throw 'Release archive missing; run Pack-Plugin.ps1 first.' }
    New-Item -ItemType Directory -Path $out -Force | Out-Null
    [IO.Compression.ZipFile]::CreateFromDirectory($source, $archive, [IO.Compression.CompressionLevel]::Optimal, $true)
}
$zip = [IO.Compression.ZipFile]::OpenRead($archive)
try {
    $files = @(Get-ChildItem -LiteralPath $source -Recurse -File -Force)
    $entries = @($zip.Entries | Where-Object { -not $_.FullName.EndsWith('/') })
    if ($entries.Count -ne $files.Count) { throw 'Existing archive differs from source; preserve it and resolve the release version/content before publishing.' }
    foreach ($file in $files) {
        $relative = $file.FullName.Substring($source.Length + 1).Replace('\','/')
        $matches = @($entries | Where-Object { $_.FullName -ceq ('codex-dispatch/' + $relative) })
        if ($matches.Count -ne 1) { throw ('Archive entry missing or duplicated: ' + $relative) }
        $stream = $matches[0].Open()
        $sha = [Security.Cryptography.SHA256]::Create()
        try { $hash = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','') }
        finally { $stream.Dispose(); $sha.Dispose() }
        if ($hash -ne (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash) { throw ('Archive content differs: ' + $relative + '. Existing archive was preserved; use the version policy before repackaging.') }
    }
} finally { $zip.Dispose() }
Write-Output $archive
Write-Output ('VERIFIED: version=' + $manifest.version + '; SHA256=' + (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash)
