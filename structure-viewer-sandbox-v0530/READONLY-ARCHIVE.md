# Frozen snapshot — 2026-05-30 (v0530)

This directory is a **read-only archive** of `structure-viewer-sandbox/` at the time of the 5/30 milestone.

Do not edit here. Active development continues in `structure-viewer-sandbox/`.

## What this snapshot includes

- **Portable 3D viewer** (`portable-to-cbioportal/structureViewer/`) — **byte-identical** to
  `cbioportal-frontend/src/shared/components/structureViewer/` (7 core files)
- `sync-from-official.ps1` / `copy-back.ps1` for official ↔ portable ↔ main project
- Sandbox demo: official backends (G2S, Genome Nexus, cBioPortal API), no auto-select highlights
- Official-aligned `getColorForProteinImpactType` in `src/lib/` + `src/shared/lib/MutationUtils.tsx`
- Sandbox shims only: `portable-to-cbioportal/PdbChainInfo.tsx`, Vite SCSS variables in `vite.config.ts`

## Restore / compare

Copy **from this archive to** `structure-viewer-sandbox/` only when explicitly restoring.
Never copy from the live sandbox back into this folder.
