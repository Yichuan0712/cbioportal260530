# G2S Start Services (Windows / PowerShell)

How to start the G2S databases and services. This assumes the environment is already set up
and the project is already built — if not, do `G2S-SETUP.md` first.

> All commands run from the **g2s project root** (the folder with `pom.xml` and `scripts\`).
> `cd` into that folder first. All paths below are relative to it.

**Prerequisites (from `G2S-SETUP.md`):** Java 1.8, Maven, Docker Desktop running, and the
four build artifacts present under the `target\` folders.

Services overview:

| Port | Service | Artifact | Path prefix |
|------|---------|----------|-------------|
| 3306 | MariaDB (Docker) | — | database |
| 27017 | MongoDB (Docker) | — | database |
| 8081 | pdb-alignment-api | `pdb-alignment-api-0.1.0.jar` | `/g2s/...` |
| 8082 | pdb | `pdb-0.1.0.war` | `/pdb_annotation/...` |
| 5443 | pdb-alignment-web | `pdb-alignment-web-0.1.0.jar` | website + `/api/alignments/...` (HTTPS) |

---

## Step 0 — Load the environment (every new PowerShell window)

```powershell
. .\scripts\env.ps1
```

> Make sure **Docker Desktop** is running first.
> The red `java -version` text from `env.ps1` is normal (it writes to stderr) — ignore it.

---

## Step 1 — Start the databases (MySQL + MongoDB)

```powershell
docker compose up -d mysql mongo
```

Check they are up:

```powershell
docker ps
```

You should see `pdb-mariadb` (3306) and `pdb-mongo` (27017) running.

### First time only — import data

The database needs data, or API queries return empty. If the `pdb` database is empty,
import the dump (`mysqldump_pdb_2025_08_07.sql.gz` must be in the `g2s\` root):

```powershell
.\scripts\import-db.ps1
```

Check whether data already exists (skip the import if the count is large):

```powershell
docker exec pdb-mariadb mysql -u cbio -pcbio pdb -e "SELECT COUNT(*) FROM pdb_seq_alignment;"
```

> A populated database has ~22.7M rows in `pdb_seq_alignment`. If you already see a large
> count, the data is imported and you do NOT need to run `import-db.ps1`.

---

## Step 2 — Start the three Java services

### Option A: one-click (recommended)

Opens 3 separate windows for 8081 / 8082 / 5443:

```powershell
.\scripts\start-services.ps1
```

### Option B: start each manually (one terminal each; run `. .\scripts\env.ps1` first)

**8081 — G2S alignment API**

```powershell
java -Xmx4096m -jar pdb-alignment-api\target\pdb-alignment-api-0.1.0.jar
```

**8082 — Core PDB API** (in PowerShell the `-D` argument must be quoted)

```powershell
java -Xmx2048m "-Dorg.springframework.boot.logging.LoggingSystem=org.springframework.boot.logging.java.JavaLoggingSystem" -jar pdb\target\pdb-0.1.0.war --server.port=8082
```

**5443 — Web UI (HTTPS, self-signed certificate)**

```powershell
java -Xmx4096m -jar pdb-alignment-web\target\pdb-alignment-web-0.1.0.jar
```

Start only the Web service (auto-builds the web module if the jar is missing):

```powershell
.\scripts\start-web.ps1
```

---

## Step 3 — Verify

- Alignment API (Swagger): http://localhost:8081/swagger-ui.html
- Alignment API example: http://localhost:8081/g2s/EnsemblStructureMappingQuery?ensemblId=ENSP00000483207.2
- Core PDB API: http://localhost:8082/pdb_annotation/
- Web home: https://localhost:5443/ (browser must trust the self-signed certificate)
- Web API page: https://localhost:5443/pageapi
- Web alignment endpoint example: https://localhost:5443/api/alignments/...

---

## Daily minimal steps (already built, data already imported)

```powershell
. .\scripts\env.ps1
docker compose up -d mysql mongo
.\scripts\start-services.ps1
```

> If you only need the G2S API, keep the **8081** window and close 8082 / 5443.

---

## Stopping

```powershell
docker compose down        # stop the database containers
docker compose down -v     # also delete stored database data
```

Close the service windows (or Ctrl+C in each) to stop the Java services.

---

## Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| `Unable to access jarfile ...` | (1) Not inside the `g2s` folder (`cd` there first); (2) not built — see `G2S-SETUP.md` |
| `mvn` / `java` not recognized | Run `. .\scripts\env.ps1` in this window; if still missing, redo `G2S-SETUP.md` |
| `env.ps1` shows red `NativeCommandError` | Normal — `java -version` writes to stderr. Environment is fine. |
| `Container pdb-mariadb is not running` | `docker compose up -d mysql mongo`; make sure Docker Desktop is open |
| API returns empty results | Database has no data — import it (see Step 1, first-time only) |
| 8082 startup argument error | In PowerShell the `-D...` argument must be quoted (see Step 2 Option B) |
| Browser blocks https://localhost:5443 | Self-signed cert — click "Advanced → proceed" to trust it |
