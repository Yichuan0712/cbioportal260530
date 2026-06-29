# Deploy structure viewer into cBioPortal

Edit **only** files under `structureViewer/` here. Sandbox demo code (`App.tsx`, mocks, meta column) stays in `structure-viewer-sandbox/` and is **not** copied to the main app.

---

## What gets deployed

```
portable-to-cbioportal/structureViewer/
    →  cbioportal-frontend/src/shared/components/structureViewer/
```

---

## Step 1 — Sync from upstream (optional)

Refresh portable files from the current `cbioportal-frontend` tree before you merge your changes:

```powershell
# from repo root
.\structure-viewer-sandbox\portable-to-cbioportal\sync-from-official.ps1
```

---

## Step 2 — Copy into cBioPortal frontend

```powershell
# from repo root
.\structure-viewer-sandbox\portable-to-cbioportal\copy-back.ps1
```

Manual equivalent:

```powershell
Copy-Item -Recurse -Force `
  structure-viewer-sandbox\portable-to-cbioportal\structureViewer\* `
  cbioportal-frontend\src\shared\components\structureViewer\
```

---

## Step 3 — Run cBioPortal frontend

From `cbioportal-frontend/` (see that repo’s README for full setup):

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run buildModules
pnpm run start
```

Open **http://localhost:3000**, go to Results → Mutations → **View 3D Structure**, and confirm PDB / AlphaFold / labels.

---

## One host wiring step (Genome Nexus label details)

`copy-back.ps1` does **not** update `MutationMapper.tsx`. For rich 3D mutation labels (HGVSp, SIFT, PolyPhen, …), pass existing annotations into the panel:

```tsx
indexedVariantAnnotations={
    this.props.store.indexedVariantAnnotations.result
}
```

Add that prop on `<StructureViewerPanel />` in  
`cbioportal-frontend/src/shared/components/mutationMapper/MutationMapper.tsx`.

Full notes and a reference snapshot: **[INTEGRATION.md](./INTEGRATION.md)** (`reference/MutationMapper.tsx`).

---

## Not deployed by copy-back

| Path | Reason |
|------|--------|
| `structure-viewer-sandbox/src/` | Sandbox shell and demo UI |
| `portable-to-cbioportal/PdbChainInfo.tsx` | Sandbox re-export only |
| `portable-to-cbioportal/reference/` | Merge reference, not runtime code |
| `vite.config.ts` SCSS inject | Sandbox build workaround |
