# Replace cBioPortal structureViewer with portable copy (delete target first).
# Run from repo root: .\structure-viewer-sandbox\portable-to-cbioportal\copy-back.ps1
#
# Targets the real frontend fork clone (sibling to this monorepo), not the
# incomplete in-repo cbioportal-frontend/ copy. Override with -FrontendRoot
# if your clone lives elsewhere.

param(
    [string]$FrontendRoot = (Join-Path (Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent) 'cbioportal-frontend')
)

$ErrorActionPreference = 'Stop'

$source = Join-Path $PSScriptRoot 'structureViewer'
$target = Join-Path $FrontendRoot 'src\shared\components\structureViewer'
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

# Sandbox tests use vitest; cbioportal-frontend's ForkTsCheckerWebpackPlugin
# type-checks everything under src/, and vitest's imports don't resolve
# there, so spec files break the host app's build. Drop them post-copy.
Get-ChildItem -Path $target -Recurse -Filter '*.spec.ts*' | Remove-Item -Force

# Sandbox loads Font Awesome 4 (index.html), where fa-expand/fa-compress ARE
# the two-diagonal-arrows glyph. cbioportal-frontend loads Font Awesome 6,
# which repointed those class names at a "fullscreen brackets" glyph instead
# and moved the old diagonal-arrows look to new, longer class names. Swap
# post-copy so the panel's resize icon still looks like two diagonal arrows
# in the host app.
$panelFile = Join-Path $target 'StructureViewerPanel.tsx'
(Get-Content $panelFile -Raw) `
    -replace "'fa-compress': this\.isIncreasedSize", "'fa-down-left-and-up-right-to-center': this.isIncreasedSize" `
    -replace "'fa-expand': !this\.isIncreasedSize", "'fa-up-right-and-down-left-from-center': !this.isIncreasedSize" |
    Set-Content $panelFile -NoNewline

Write-Host "Replaced structureViewer -> $target"
Write-Host "Next: Step 2 in README (MutationMapper from reference)."
