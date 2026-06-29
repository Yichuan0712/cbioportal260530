# Replace cBioPortal structureViewer with portable copy (delete target first).
# Run from repo root: .\structure-viewer-sandbox\portable-to-cbioportal\copy-back.ps1

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$source = Join-Path $PSScriptRoot 'structureViewer'
$target = Join-Path $repoRoot 'cbioportal-frontend\src\shared\components\structureViewer'
$targetParent = Split-Path $target -Parent

if (-not (Test-Path $source)) {
    Write-Error "Source not found: $source"
}

if (-not (Test-Path $targetParent)) {
    Write-Error "Target parent not found: $targetParent"
}

if (Test-Path $target) {
    Write-Host "Removing $target"
    Remove-Item -Path $target -Recurse -Force
}

Copy-Item -Path $source -Destination $targetParent -Recurse -Force

Write-Host "Replaced structureViewer -> $target"
Write-Host "Next: Step 2 in README (MutationMapper from reference)."
