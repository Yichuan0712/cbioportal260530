# G2S (Genome to Structure) — Local Development Setup

Monorepo path: `g2s/` (formerly `pdb_annotation`). Java packages and HTTP API paths still use `pdb_annotation` for compatibility with upstream G2S.

This guide covers running MySQL and MongoDB in Docker while running the application services (pipeline, API, web) locally on your machine.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Java (OpenJDK) | 1.8 | Must be in PATH |
| Maven | 3.x | Must be in PATH |
| BLAST+ | 2.4.0+ | `blastp` and `makeblastdb` must be in PATH |
| Docker Desktop | latest | For MySQL and MongoDB |
| MySQL client | any | `mysql` CLI must be in PATH (used by pipeline to run SQL scripts) |
| rsync | any | `rsync` CLI must be in PATH (used by pipeline to run SQL scripts) |
| wget | any | `wget` CLI must be in PATH (used by pipeline to run SQL scripts) |

> **Windows users:** 

Java — (Amazon Corretto 8 — the easiest JDK 1.8 via winget): winget install Amazon.Corretto.8.JDK

Maven — install manually:
Download the binary zip from https://maven.apache.org/download.cgi (e.g. apache-maven-3.9.x-bin.zip)
Extract to a folder like C:\Program Files\Apache\Maven
Add C:\Program Files\Apache\Maven\bin to your system PATH


MYSQL — Install the [MySQL Community Server](https://dev.mysql.com/downloads/mysql/) or standalone MySQL client tools to get the `mysql` CLI, even if you are not running MySQL locally.
Or winget install Oracle.MySQL
Add C:\Program Files\MySQL\MySQL Server 8.4\bin to your system PATH

rsync — Download from: https://itefix.net/cwrsync (free version)
Extract and add the bin folder to PATH.
---

## Project Structure

```
g2s/
├── pdb/                        # Core API (port 8082)
├── pdb-alignment-api/          # Alignment REST API (port 8081)
├── pdb-alignment-pipeline/     # DB init & update batch job
├── pdb-alignment-web/          # Web UI (port 5443, HTTPS)
├── docker-compose.yml          # MySQL + MongoDB only
└── workdir/                    # Pipeline working directory (created on first run)
```

---

## Step 1 — Configure Paths

Before building, update the path properties in two files to match your local environment.

### 1a. Pipeline — `pdb-alignment-pipeline/src/main/resources/application.properties`

```properties
# Set these to local paths on your machine
workspace=C:/path/to/your/workdir
resource_dir=C:/path/to/g2s/pdb-alignment-pipeline/src/main/resources/
tmpdir=C:/path/to/tmp
pdbRepo=C:/path/to/g2s_pdb

# DB connection — keep as localhost since MySQL runs in Docker with port 3306 exposed
db_host=localhost
username=cbio
password=cbio
db_name=pdb

# mysql CLI binary name — keep as-is if mysql is in PATH
mysql=mysql
```

Create the `workdir`, `tmp`, and `pdbRepo` directories if they don't exist:
```bash
mkdir -p C:/path/to/your/workdir
mkdir -p C:/path/to/tmp
mkdir -p C:/path/to/g2s_pdb
```

### 1b. Web — `pdb-alignment-web/src/main/resources/application.properties`

```properties
# Must match the same workspace set in the pipeline properties above
workspace=C:/path/to/your/workdir
# pdb_seqres_fasta_file should be the same as in the project of pdb-pipeline
pdb_seqres_fasta_file=pdb_seqres.fasta
# upload folder to contain the upload dir
uploaddir=/tmp/upload
```

---

## Step 2 — Start MySQL and MongoDB via Docker

```bash
cd g2s
docker compose up -d mysql mongo
```

This starts:
- **MySQL (MariaDB 10.0)** on port `3306` — user `cbio`, password `cbio`, database `pdb`
- **MongoDB 4.4** on port `27017`

Verify they are running:
```bash
docker ps
```

---

## Step 3 — Build All Modules

```bash
cd g2s
mvn clean package -DskipTests
```

---

## Step 4 — Initialize the Database (first time only)

This runs BLAST alignment against all PDB and Ensembl sequences and populates MySQL. It takes approximately **22 hours**.

```bash
java -Xmx7000m -jar pdb-alignment-pipeline/target/pdb-alignment-pipeline-0.1.0.jar init
```

> This only needs to be run once. After init, use `update` for weekly refreshes (see Step 6).

---

## Step 5 — Run the Application Services

Run each service in a separate terminal:

**Alignment API** (port 8081):
```bash
java -Xmx7000m -jar pdb-alignment-api/target/pdb-alignment-api-0.1.0.jar
```

**Core PDB API** (port 8082):
```bash
java -Xmx7000m -jar pdb/target/pdb-0.1.0.war --server.port=8082
```

**Web UI** (port 5443, HTTPS):
```bash
java -Xmx7000m -jar pdb-alignment-web/target/pdb-alignment-web-0.1.0.war
```

---

## Step 6 — Weekly Database Update

Run this after the initial `init` to sync new/modified PDB entries (takes ~20 minutes):

```bash
java -Xmx7000m -jar pdb-alignment-pipeline/target/pdb-alignment-pipeline-0.1.0.jar update
```

---

## Verify

Once the API is running, test it via Swagger UI or directly:

```
http://localhost:8081/swagger-ui.html
http://localhost:8081/pdb_annotation/StructureMappingQuery?ensemblId=ENSP00000483207.2
```

---

## Stopping the Databases

```bash
docker-compose down
```

To also remove stored data:
```bash
docker-compose down -v
```

---

## Database Connection URLs Reference

All places where MySQL/MongoDB connection info is configured. Update these if you change the host, port, credentials, or database name.

### MySQL

| File | Property | Default Value |
|------|----------|---------------|
| `pdb-alignment-pipeline/src/main/resources/application.properties` | `db_host` | `localhost` |
| `pdb-alignment-pipeline/src/main/resources/application.properties` | `username` | `cbio` |
| `pdb-alignment-pipeline/src/main/resources/application.properties` | `password` | `cbio` |
| `pdb-alignment-pipeline/src/main/resources/application.properties` | `db_name` | `pdb` |
| `pdb-alignment-api/src/main/resources/application.properties` | `spring.datasource.url` | `jdbc:mysql://localhost:3306/pdb?useSSL=false` |
| `pdb-alignment-api/src/main/resources/application.properties` | `spring.datasource.username` | `cbio` |
| `pdb-alignment-api/src/main/resources/application.properties` | `spring.datasource.password` | `cbio` |
| `pdb/src/main/resources/application.properties` | `spring.datasource.url` | `jdbc:mysql://localhost:3306/pdb` |
| `pdb/src/main/resources/application.properties` | `spring.datasource.username` | `cbio` |
| `pdb/src/main/resources/application.properties` | `spring.datasource.password` | `cbio` |
| `pdb-alignment-web/src/main/resources/application.properties` | `spring.datasource.url` | `jdbc:mysql://localhost:3306/g2smutation?useSSL=false` |
| `pdb-alignment-web/src/main/resources/application.properties` | `spring.datasource.username` | `cbio` |
| `pdb-alignment-web/src/main/resources/application.properties` | `spring.datasource.password` | `cbio` |

> Note: the pipeline uses individual properties (`db_host`, `username`, etc.) while the Spring modules use a full JDBC URL in `spring.datasource.url`.

### MongoDB

| File | Property | Default Value |
|------|----------|---------------|
| `pdb/src/main/resources/application.properties` | `spring.data.mongodb.uri` | `mongodb://localhost:27017/pdb_annotation` |

> Only the `pdb` module connects to MongoDB.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `mysql: command not found` | Install MySQL client tools and add to PATH |
| `blastp: command not found` | Install BLAST+ and add to PATH |
| Pipeline can't connect to MySQL | Confirm Docker is running: `docker ps`. Check `db_host=localhost` and port `3306` is not blocked |
| Out of memory during init | Increase `-Xmx` value, e.g. `-Xmx12000m` |
| `workdir` errors | Make sure the `workspace` path exists and the process has write permission |

---

## Performance Reference

Tested on Intel Core i7-3770 @ 3.40GHz, 8 cores, 8GB RAM:

| Operation | Time |
|-----------|------|
| Pipeline init | ~22 hours |
| Pipeline update | ~20 minutes |
