# Structure viewer integration (copy-back + one host change)

`copy-back.ps1` copies **only** `structureViewer/` into cBioPortal. Most 3D features work without touching other folders.

## 3D mutation labels + Genome Nexus detail

Rich label text (HGVSp, SIFT, PolyPhen, Mutation Assessor, ClinVar, …) needs the **same** Genome Nexus index the Mutation Mapper table already fetches. The panel does **not** call Genome Nexus itself.

### What copy-back includes

| Location | Role |
|----------|------|
| `structureViewer/GenomicLocationUtils.ts` | Match mutation → annotation by genomic location |
| `structureViewer/VariantAnnotationFormatting.ts` | Label + detail line formatting |
| `structureViewer/MutationLabelUtils.ts` | Build `IMutationLabelSpec[]` for 3D |
| `structureViewer/StructureViewerPanel.tsx` | Optional prop `indexedVariantAnnotations` |

If the prop is **omitted**, labels still work using cBioPortal mutation fields only (`proteinChange`, `mutationType`, …).

### Required change outside copy-back (cBioPortal host)

**Live file:** `cbioportal-frontend/src/shared/components/mutationMapper/MutationMapper.tsx`  
**Reference snapshot:** `portable-to-cbioportal/reference/MutationMapper.tsx` (not deployed by copy-back)

**Method:** `structureViewerPanel` getter (where `<StructureViewerPanel … />` is rendered)

Add (or keep after merge):

```tsx
indexedVariantAnnotations={
    this.props.store.indexedVariantAnnotations.result
}
```

This passes the in-memory map from `MutationMapperStore` — **no extra network request**. Affects only the 3D panel when View 3D Structure is open; lollipop, mutation table, and filters are unchanged.

### Sandbox

`structure-viewer-sandbox/src/App.tsx` passes `store.indexedVariantAnnotations` the same way for local dev.

### After merging upstream MutationMapper

If `MutationMapper.tsx` is replaced during a cBioPortal upgrade, re-apply the `indexedVariantAnnotations` line above (search for `StructureViewerPanel` in that file).
