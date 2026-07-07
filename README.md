# cbioportal260530

Adding an AlphaFold-enriched 3D protein structure viewer to cBioPortal.

## Layout

- [`cbioportal/`](cbioportal/) — cBioPortal backend fork
- [`cbioportal-frontend/`](cbioportal-frontend/) — cBioPortal frontend fork (where the 3D viewer ships)
- [`g2s/`](g2s/) — PDB ↔ gene alignment backend the 3D viewer depends on for PDB structures: `pdb-alignment-api` (G2S API, :8081), `pdb` (PDB API, :8082), `pdb-alignment-web` (Web UI + sequence search, :5443)
- [`structure-viewer-sandbox/`](structure-viewer-sandbox/) — standalone dev sandbox for the 3D viewer component, before porting into `cbioportal-frontend/` (dated snapshots of it are kept alongside, e.g. `structure-viewer-sandbox-v0602/`)

## Daily local startup

[`START-SERVICES.md`](START-SERVICES.md) — G2S services + the structure viewer sandbox.
