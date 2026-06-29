# G2S (Genome to Structure)

Local PDB ↔ gene alignment stack for the structure viewer sandbox (`https://localhost:5443`).

| Doc | When |
|-----|------|
| [`../G2S-SETUP.md`](../G2S-SETUP.md) | First time: install tools, build jars, **import dump** |
| [`../START-SERVICES.md`](../START-SERVICES.md) | Daily: Docker + `start-services.ps1` + sandbox `npm run dev` |
| [`yichuan_scripts/pipeline-blast/README.md`](yichuan_scripts/pipeline-blast/README.md) | **Rebuild** the alignment database from scratch |

All commands below assume **`cd g2s`** (folder with `pom.xml`).

---

## Modules

| Folder | Port | Role |
|--------|------|------|
| `pdb-alignment-api/` | 8081 | G2S alignment REST API |
| `pdb/` | 8082 | Core PDB API (+ MongoDB) |
| `pdb-alignment-web/` | 5443 HTTPS | Web UI + `/api/alignments/...` (sandbox proxy target) |
| `pdb-alignment-pipeline/` | — | Upstream Java batch `init` / `update` (legacy) |
| `yichuan_scripts/pipeline-blast/` | — | **Our** BLAST rebuild → `pdb_2026` |

Docker (`docker-compose.yml`):

| Container | Port | Database | Role |
|-----------|------|----------|------|
| **pdb-mariadb** | 3306 | **`pdb_2026`** | Active alignments (pipeline-blast; Java `local` profile) |
| **pdb-mariadb-old** | 3307 | **`pdb`** | Legacy 2025 dump (archive / comparison) |
| **pdb-mongo** | 27017 | — | 8082 PDB header cache only |

Java services run on the host via `yichuan_scripts\start-services.ps1`.

---

## Database — three ways to get data

You need MySQL populated before alignments return results. Pick **one** path.

### A. Import a dump (legacy archive)

Fastest way to get the **2025 official** alignment set. Imports into **`pdb`** on **`pdb-mariadb-old`** (:3307), not the active container.

**Need:**

| Item | Location |
|------|----------|
| Dump file | `g2s\mysqldump_pdb_2025_08_07.sql.gz` (~2.3 GB compressed) |
| Docker | `docker compose up -d mysql-old mongo` |

**Run once** (~30–90 min):

```powershell
.\yichuan_scripts\import-db.ps1
```

Verify:

```powershell
docker exec pdb-mariadb-old mysql -u cbio -pcbio pdb -e "SELECT COUNT(*) FROM pdb_seq_alignment;"
```

Full install/build steps: [`../G2S-SETUP.md`](../G2S-SETUP.md).

**Already have both DBs in one container?** Run the one-time split:

```powershell
.\yichuan_scripts\migrate-db-split.ps1
```

---

### B. Rebuild with `pipeline-blast` → `pdb_2026`

Use when regenerating alignments. Writes to **`pdb_2026`** on **`pdb-mariadb`** (:3306). Legacy **`pdb`** stays on **`pdb-mariadb-old`** if you imported the dump.

**Need to install / prepare:**

| Item | Notes |
|------|--------|
| Java 8, Maven, Docker | Same as [`../G2S-SETUP.md`](../G2S-SETUP.md) |
| **BLAST+** or Docker BLAST | `config.ps1`: `$PipelineUseDockerBlast = $true` uses `ncbi/blast` image |
| **`g2s_pdb/`** | RCSB PDB structure files (`.pdb.gz` tree) |
| **`latest-alignment-inputs/`** | Reference FASTA inputs (Ensembl proteome, UniProt, `pdb_seqres.txt.gz`, …) |
| MySQL | `docker compose up -d mysql mongo` |

**Steps:**

```powershell
. .\yichuan_scripts\env.ps1

# 1) Create schema + prepare FASTA / BLAST DB + gene chunks
.\yichuan_scripts\pipeline-blast\run.ps1 Setup

# 2) Run all BLAST chunks (long; resumable)
.\yichuan_scripts\pipeline-blast\run.ps1 All

# 3) Check progress
.\yichuan_scripts\pipeline-blast\run.ps1 Status
```

`application-local.properties` (already in repo) points Java services at **`pdb_2026`**. `start-services.ps1` uses `--spring.profiles.active=local`.

Small test run: set `$MaxPdbFiles`, `$MaxGeneChunks`, etc. in `yichuan_scripts/pipeline-blast/config.ps1` — details in [`yichuan_scripts/pipeline-blast/README.md`](yichuan_scripts/pipeline-blast/README.md).

Verify:

```powershell
docker exec pdb-mariadb mysql -u cbio -pcbio pdb_2026 -e "SELECT COUNT(*) FROM pdb_seq_alignment;"
```

---

### C. Legacy Java pipeline (`pdb` on old container)

Upstream G2S batch job. Populates **`pdb`** (target **`pdb-mariadb-old`** if you point `db_name` / JDBC there). Needs extra CLI tools; ~**22 hours** for `init`.

**Extra tools:** BLAST+ (`blastp`, `makeblastdb`), `mysql` client, `rsync`, `wget` on PATH. Edit paths in `pdb-alignment-pipeline/src/main/resources/application.properties`.

```powershell
. .\yichuan_scripts\env.ps1
java -Xmx7000m -jar pdb-alignment-pipeline/target/pdb-alignment-pipeline-0.1.0.jar init
# weekly refresh:
java -Xmx7000m -jar pdb-alignment-pipeline/target/pdb-alignment-pipeline-0.1.0.jar update
```

Prefer **A** (import) or **B** (`pipeline-blast`) for this repo.

---

## After the database is ready

1. Finish [`../G2S-SETUP.md`](../G2S-SETUP.md) (keystore + `mvn package` if not done).
2. Follow [`../START-SERVICES.md`](../START-SERVICES.md).

Quick test (API up):

```
http://localhost:8081/swagger-ui.html
http://localhost:8082/swagger-ui.html
https://localhost:5443/   (accept self-signed cert)
```
