# Frozen snapshot — 2026-06-01 (v0601)

This directory is a **read-only archive** of `structure-viewer-sandbox/` at the 6/1 milestone.

Do not edit here. Active development continues in `structure-viewer-sandbox/`.

## What this snapshot includes

Everything from the 5/31 portable viewer baseline, plus:

- **PAE heatmap** overlay on 3D (AlphaFold): click any `(i, j)` cell, crosshair + cell box, summary under heatmap (`(i, j) · X.X Å PAE`)
- **PAE pair 3D highlight**: yellow on aligned + partner residues; coexists with mutation pin / hover / detail panel
- **pLDDT** moved into **Protein Style → Color** (`pLDDT` option) instead of a separate checkbox
- **Cartoon / trace / ribbon**: hover and pin show yellow side chains **and** matching yellow backbone segment
- PAE hover no longer clears pair highlight; PAE selection persists when clicking 3D residues
- PAE tooltip on “Display PAE heatmap” includes color-scale legend (no separate overlay legend)

## Restore / compare

Copy **from this archive to** `structure-viewer-sandbox/` only when explicitly restoring.
Never copy from the live sandbox back into this folder.
