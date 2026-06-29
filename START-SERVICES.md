# Start services (daily)

Assumes first-time setup is done — see **`G2S-SETUP.md`**.

---

## 1. G2S (PDB alignments for 3D viewer)

From the **`g2s/`** folder (contains `pom.xml`):

```powershell
docker compose up -d mysql mysql-old mongo
.\yichuan_scripts\start-services.ps1
```

Opens three Java windows: API **8081**, PDB **8082**, Web **5443** (HTTPS).  
Java services use **`pdb_2026`** on **pdb-mariadb :3306** (`local` profile). Legacy **`pdb`** is on **pdb-mariadb-old :3307** (archive only).

Quick check in the browser:

| Port | URL |
|------|-----|
| 8081 | http://localhost:8081/swagger-ui.html |
| 8082 | http://localhost:8082/swagger-ui.html |
| 5443 | https://localhost:5443/ (accept self-signed cert) |

After changing DB name or JDBC settings, **restart** the three Java windows (`start-services.ps1`). If you changed `application-local.properties`, run `mvn package -DskipTests` first (stop Java services so jars are not locked).

8082 has no home page at `/` or `/pdb_annotation/` — use Swagger or a concrete API path (e.g. `/pdb_annotation/header/1p98`).

> **Docker Desktop** must be running. First-time DB import: see `G2S-SETUP.md`.

---

## 2. Structure viewer sandbox

From **`structure-viewer-sandbox/`** (first time: `npm install`):

```powershell
npm run dev
```

Open **http://localhost:5173** → **View 3D Structure**.

Mutations / Genome Nexus / AlphaFold use public APIs; G2S is only needed for **PDB chains**. Without G2S, AlphaFold mode still works.

---

## Stop

- Close the Java service windows (or Ctrl+C in each).
- `docker compose down` in `g2s/` to stop databases.
