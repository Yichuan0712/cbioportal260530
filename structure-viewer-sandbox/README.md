# 3D Structure Viewer Sandbox

Standalone dev environment for the cBioPortal Mutation Mapper **View 3D Structure** panel.  
This app is **not** deployed to cBioPortal.org. To ship changes to the main site, copy `portable-to-cbioportal/structureViewer/` into `cbioportal-frontend` — see [portable-to-cbioportal/README.md](./portable-to-cbioportal/README.md).

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js 18+** | Matches Vite 5 |
| **npm** | Project uses `.npmrc` with `legacy-peer-deps=true` if peer conflicts appear |
| **Network** | Default mode calls cBioPortal.org, Genome Nexus, OncoKB, AlphaFold (EBI) |
| **Local G2S** (optional) | Vite proxies `/g2s-api` → `https://localhost:5443`. Without it, PDB chains may be empty; AlphaFold still works |

---

## Run locally (development)

From the repo root:

```powershell
cd structure-viewer-sandbox
npm install
npm run dev
```

Open **http://localhost:5173** (port is fixed in `vite.config.ts`).

1. Wait for loading to finish.
2. Use the left meta column (sandbox-only demo UI).
3. Click **View 3D Structure**.

---

## Production build

```powershell
cd structure-viewer-sandbox
npm install
npm run build
npm run preview
```

- `npm run build` — TypeScript check + Vite production bundle (`dist/`)
- `npm run preview` — Serve the built app locally

Deploy `dist/` to any static host. Set the `VITE_*` URLs below if the host cannot use the dev proxies in `vite.config.ts`.

---

## Configuration

Copy `.env.example` to `.env.local` (or `.env.development`).

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_HUGO_GENE` | `SOX9` | Gene to load |
| `VITE_CBIOPORTAL_STUDY_IDS` | `msk_impact_50k_2026` | Study list |
| `VITE_CBIOPORTAL_CASE_SET` | `msk_impact_50k_2026_cnaseq` | Sample list for mutations / frequency |
| `VITE_USE_MOCK_DATA` | unset | `true` = offline G2S/PDB fixtures |
| `VITE_USE_MOCK_MUTATIONS` | unset | `true` = offline mutation fixtures |
| `VITE_CBIOPORTAL_URL` | `/cbioportal-api` | cBioPortal REST base |
| `VITE_GENOMENEXUS_URL` | `/genomenexus-api` | Genome Nexus base |
| `VITE_G2S_URL` | `/g2s-api` | G2S alignment service |

**Offline mode:** set both mock flags to `true` (see `.env.example`).

**Dev proxies** (no env change needed): `/cbioportal-api`, `/genomenexus-api`, `/oncokb-api`, `/g2s-api`, `/alphafold-files`, `/alphafold-api` — configured in `vite.config.ts`.

---

## Deploy into cBioPortal frontend

After changing files under `portable-to-cbioportal/structureViewer/`:

```powershell
# from repo root
.\structure-viewer-sandbox\portable-to-cbioportal\copy-back.ps1
```

Then start `cbioportal-frontend` and verify **View 3D Structure** on Mutation Mapper. Details: [portable-to-cbioportal/README.md](./portable-to-cbioportal/README.md).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port 5173 in use | Stop the other process or change `server.port` in `vite.config.ts` |
| Stuck on Loading | Check network access to cbioportal.org / genomenexus.org; or enable mock mode |
| Empty PDB list | Start local G2S on `:5443`, or rely on AlphaFold |
