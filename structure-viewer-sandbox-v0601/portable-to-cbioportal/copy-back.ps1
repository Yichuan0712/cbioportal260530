# Copy portable structure viewer code into cBioPortal frontend.
# Run from repo root: .\structure-viewer-sandbox\portable-to-cbioportal\copy-back.ps1

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$source = Join-Path $PSScriptRoot 'structureViewer'
$target = Join-Path $repoRoot 'cbioportal-frontend\src\shared\components\structureViewer'

if (-not (Test-Path $source)) {
    Write-Error "Source not found: $source"
}

if (-not (Test-Path $target)) {
    New-Item -ItemType Directory -Force -Path $target | Out-Null
}

Copy-Item -Path (Join-Path $source '*') -Destination $target -Recurse -Force

Write-Host "Copied structureViewer -> $target"
Write-Host "Next: run cBioPortal frontend and test View 3D Structure in Mutation Mapper."
