# Deploy structure viewer into cBioPortal

Edit **only** files under `structureViewer/` here. Sandbox demo code (`App.tsx`, mocks, meta column) stays in `structure-viewer-sandbox/` and is **not** copied to the main app.

**Source of truth:** `portable-to-cbioportal/structureViewer/` → copy into `cbioportal-frontend/src/shared/components/structureViewer/`.

---

## Step 1 — Copy into cBioPortal frontend

`copy-back.ps1` **deletes** `cbioportal-frontend/.../structureViewer/` first, then copies portable in.

```powershell
# from repo root
.\structure-viewer-sandbox\portable-to-cbioportal\copy-back.ps1
```

---

## Step 2 — Copy `reference/MutationMapper.tsx`

`copy-back.ps1` does not include this file. Copy it over the live host file so the 3D panel can show full residue detail (HGVSp, SIFT, PolyPhen, ClinVar, …):

```
reference/MutationMapper.tsx
    →  cbioportal-frontend/src/shared/components/mutationMapper/MutationMapper.tsx
```

Then start `cbioportal-frontend` and test **View 3D Structure** (see that repo’s README).
