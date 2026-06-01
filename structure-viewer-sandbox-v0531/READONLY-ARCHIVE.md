# Frozen snapshot — 2026-05-31 (v0531)

This directory is a **read-only archive** of `structure-viewer-sandbox/` at the 5/31 milestone.

Do not edit here. Active development continues in `structure-viewer-sandbox/`.

## What this snapshot includes

- **Portable 3D viewer** (`portable-to-cbioportal/structureViewer/`) with **PDB + AlphaFold** (`StructureSource`, EBI mmCIF, pLDDT coloring, isoform selector)
- `sync-from-official.ps1` / `copy-back.ps1` for official ↔ portable ↔ main project
- Sandbox defaults aligned with [MSK Impact 50k + SOX9 Mutations](https://www.cbioportal.org/results/mutations?cancer_study_list=msk_impact_50k_2026&mutations_gene=SOX9&mutations_transcript_id=ENST00000245479): `SOX9`, study `msk_impact_50k_2026`, canonical ENST via Genome Nexus, no forced PDB (`SANDBOX_PREFERRED_PDB` empty)
- Live APIs via Vite proxy: cBioPortal, Genome Nexus, local G2S `:5443`, AlphaFold EBI
- Demo shell only (not copy-back): `src/App.tsx`, `src/store/SandboxG2SStore.ts`, `SandboxMutationMetaColumn`, mocks

## Restore / compare

Copy **from this archive to** `structure-viewer-sandbox/` only when explicitly restoring.
Never copy from the live sandbox back into this folder.
