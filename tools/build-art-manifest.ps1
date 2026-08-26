# Regenerates images/endgame/manifest.json from whatever image files exist
# in images/endgame/monsters/ and images/endgame/items/.
#
# The game reads this manifest instead of blind-probing file extensions,
# which previously caused GitHub Pages rate limiting.
#
# Run after adding or removing endgame art:
#   powershell -ExecutionPolicy Bypass -File tools/build-art-manifest.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$base = Join-Path $root 'images\endgame'

$manifest = [ordered]@{
    monster = [ordered]@{}
    item    = [ordered]@{}
}

$folders = @{
    'monsters' = 'monster'
    'items'    = 'item'
}

foreach ($dir in $folders.Keys) {
    $full = Join-Path $base $dir
    if (-not (Test-Path -LiteralPath $full)) { continue }
    Get-ChildItem -LiteralPath $full -File | ForEach-Object {
        $id = $_.BaseName
        $ext = $_.Extension.TrimStart('.').ToLowerInvariant()
        $manifest[$folders[$dir]][$id] = $ext
    }
}

$outPath = Join-Path $base 'manifest.json'
$json = ConvertTo-Json -InputObject $manifest -Depth 5
# Write without BOM so fetch().json() never chokes on it.
[System.IO.File]::WriteAllText($outPath, $json + "`n", (New-Object System.Text.UTF8Encoding($false)))

$count = ($manifest['monster'].Keys.Count) + ($manifest['item'].Keys.Count)
Write-Host "Wrote $outPath ($count entries)"
