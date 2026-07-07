# G2S

PDB ↔ gene alignment backend for the 3D structure viewer. Three Java
services (API :8081, PDB :8082, Web :5443) backed by MySQL (`pdb_2026`) and
MongoDB, all via Docker for the databases.

- Daily start/stop: [`../START-SERVICES.md`](../START-SERVICES.md)
- Setting up on a new machine: [`PRODUCTION-DEPLOY.md`](PRODUCTION-DEPLOY.md)
- Helper scripts: [`yichuan_scripts/README.md`](yichuan_scripts/README.md)
- Rebuilding the alignment DB from scratch: [`yichuan_scripts/pipeline-blast/README.md`](yichuan_scripts/pipeline-blast/README.md)
