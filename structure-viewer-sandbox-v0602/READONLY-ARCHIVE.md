# Frozen snapshot — 2026-06-02 (v0602)

This directory is a **read-only archive** of `structure-viewer-sandbox/` at the 6/2 milestone.

Do not edit here. Active development continues in `structure-viewer-sandbox/`.

## What this snapshot includes

Everything from **v0601**, plus:

- **3D mutation label Genome Nexus detail restored** (`indexedVariantAnnotations` prop on `StructureViewerPanel`; HGVSp, SIFT, PolyPhen, Mutation Assessor, Hotspot, ClinVar in detail panel)
- **`GenomicLocationUtils.ts`** — match mutations to GN annotations by genomic location
- **Deploy docs:** `portable-to-cbioportal/INTEGRATION.md`, README integration section
- **Host reference (not copy-back):** `portable-to-cbioportal/reference/MutationMapper.tsx` — snapshot showing `indexedVariantAnnotations` wiring in `structureViewerPanel`
- **`cbioportal-frontend/` left untouched** in the main repo; production deploy = copy-back `structureViewer/` + one-line (or merge) change in live `MutationMapper.tsx` per INTEGRATION.md

## Restore / compare

Copy **from this archive to** `structure-viewer-sandbox/` only when explicitly restoring.
Never copy from the live sandbox back into this folder.
