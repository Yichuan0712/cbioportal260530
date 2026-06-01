# Refresh portable structureViewer from cBioPortal frontend (byte-identical core files).
# Run from repo root: .\structure-viewer-sandbox\portable-to-cbioportal\sync-from-official.ps1

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$source = Join-Path $repoRoot 'cbioportal-frontend\src\shared\components\structureViewer'
$target = Join-Path $PSScriptRoot 'structureViewer'

$coreFiles = @(
    'StructureViewerPanel.tsx',
    'StructureViewer.tsx',
    'StructureVisualizer.ts',
    'StructureVisualizer3D.ts',
    'PyMolScriptGenerator.ts',
    'PdbResidueUtils.ts',
    'structureViewer.module.scss'
)

if (-not (Test-Path $source)) {
    Write-Error "Official source not found: $source"
}

if (-not (Test-Path $target)) {
    New-Item -ItemType Directory -Force -Path $target | Out-Null
}

foreach ($file in $coreFiles) {
    Copy-Item -Path (Join-Path $source $file) -Destination (Join-Path $target $file) -Force
    Write-Host "Synced $file"
}

Write-Host "Done. portable structureViewer matches official core files (excludes *.spec.ts)."
