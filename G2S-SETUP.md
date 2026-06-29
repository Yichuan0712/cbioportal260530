# G2S setup (first time)

One-time install and build for local G2S (PDB alignments used by the structure viewer sandbox).  
Daily startup: **`START-SERVICES.md`**.

All commands below run from the **`g2s/`** folder (contains `pom.xml` and `yichuan_scripts\`).

---

## Install these tools

| Tool | Version | Why |
|------|---------|-----|
| **Java JDK** | **1.8 only** | Build and run the three Java services (not Java 11+) |
| **Maven** | 3.9.x | Build `.jar` / `.war` artifacts |
| **Docker Desktop** | latest | MariaDB + MongoDB in containers |

**Not needed** for running the 3D viewer: BLAST+ (only for regenerating alignment data via the pipeline).

### Java 8

```powershell
winget install Amazon.Corretto.8.JDK
```

`yichuan_scripts\env.ps1` auto-detects Corretto 8 (or `C:\Program Files\Java\jdk1.8.0_202`).

### Maven

Either install system-wide:

```powershell
winget install Apache.Maven
```

Or unpack into the repo (what `env.ps1` expects):

```powershell
# from g2s/
New-Item -ItemType Directory -Path tools -Force | Out-Null
Invoke-WebRequest -Uri "https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip" -OutFile tools\maven.zip
Expand-Archive tools\maven.zip tools -Force
Remove-Item tools\maven.zip
# → g2s\tools\apache-maven-3.9.6\bin\mvn.cmd
```

### Docker

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/), start it, then:

```powershell
docker --version
```

---

## One-time: create / build

Run once per fresh clone (order matters for the keystore).

### 1. HTTPS keystore (for port 5443)

Not in git. Required for `pdb-alignment-web`:

```powershell
# from g2s/, after: . .\yichuan_scripts\env.ps1
$ks = "pdb-alignment-web\src\main\resources\keystore.p12"
& "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -alias tomcat -storetype PKCS12 -keyalg RSA -keysize 2048 `
    -keystore $ks -storepass 123456 -keypass 123456 -validity 3650 `
    -dname "CN=localhost, OU=Dev, O=G2S, L=NA, ST=NA, C=US"
```

Browser will warn on `https://localhost:5443` (self-signed) — proceed anyway.

### 2. Build Java artifacts

```powershell
. .\yichuan_scripts\env.ps1
mvn clean package -DskipTests
```

Creates the jars/wars used by `start-services.ps1`:

| Output | Service |
|--------|---------|
| `pdb-alignment-api\target\pdb-alignment-api-0.1.0.jar` | G2S API :8081 |
| `pdb\target\pdb-0.1.0.war` | PDB API :8082 |
| `pdb-alignment-web\target\pdb-alignment-web-0.1.0.jar` | Web / alignments :5443 |

### 3. Database (first time only)

Start DB containers:

```powershell
docker compose up -d mysql mysql-old mongo
```

**Active alignments:** `pipeline-blast` → **`pdb_2026`** on **pdb-mariadb** (:3306). See **`g2s/README.md`** section B.

**Legacy 2025 dump (optional archive):** import into **`pdb`** on **pdb-mariadb-old** (:3307). File:

`g2s\mysqldump_pdb_2025_08_07.sql.gz`

```powershell
.\yichuan_scripts\import-db.ps1
```

**Already loaded both `pdb` and `pdb_new` in one container?** One-time split:

```powershell
.\yichuan_scripts\migrate-db-split.ps1
```

Quick check (active DB):

```powershell
docker exec pdb-mariadb mysql -u cbio -pcbio pdb_2026 -e "SELECT COUNT(*) FROM pdb_seq_alignment;"
```

Expect a large row count (millions). Empty or missing table → run pipeline-blast Setup/All or migrate script.

---

## Checklist

| Item | Check |
|------|--------|
| Java 8 | `. .\yichuan_scripts\env.ps1` then `java -version` → `1.8.0_xxx` (red stderr text is normal) |
| Maven | `mvn -version` → Maven 3.9 + Java 1.8 |
| Docker | `docker ps` → `pdb-mariadb`, `pdb-mariadb-old`, `pdb-mongo` |
| Keystore | `pdb-alignment-web\src\main\resources\keystore.p12` exists |
| Build | three `target\` artifacts above exist |
| Data | `pdb_seq_alignment` row count is large |

Done → **`START-SERVICES.md`**.
