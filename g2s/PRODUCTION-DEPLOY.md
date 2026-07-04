# Deploying G2S to a Linux server

Mirrors the local Windows dev setup (`G2S-SETUP.md` / `START-SERVICES.md`):
docker-compose runs the databases, the three Java services run directly on the
host, and `blastp` runs via a Docker sidecar container instead of a native
install. Does **not** use the `Dockerfile` / `pdb-app` compose service (that
path has its own unrelated bugs and is out of scope here).

## What has to move, and how big it is

| Item | Size | How it travels |
|------|------|----------------|
| Code (this repo + the fixes/scripts from this session) | tiny | `git clone` / `git pull` |
| `ncbi/blast:2.16.0` image | 1.68GB | `docker pull ncbi/blast:2.16.0` on the server — do **not** transfer manually |
| Prebuilt BLAST index (`pdb_seqres.db.*` + `.fasta`) | 97MB compressed (`deploy-package/blast-index.tar.gz`) | copy the tarball over (scp/rsync/shared storage), extract into `workdir/` |
| `pdb_2026` MySQL data (the actual alignment results) | dump compresses to roughly 10-15% of the 25.9GB live size (`deploy-package/pdb_2026.sql.gz`) | copy the dump over, import into the server's MySQL container |

`g2s_pdb/` (51GB raw PDB structures) and `workdir/pipeline-blast/` (70GB build
scratch) are **not** needed to serve requests — only to rebuild the alignment
DB from scratch. Don't copy those unless you intend to re-run the pipeline.

## Prerequisites on the server

- Docker + Docker Compose
- JDK 8 and Maven (to build the jars/war on the server itself)
- Same `latest-alignment-inputs/`-style layout is **not** needed — only
  `workdir/pdb_seqres.db.*` and `workdir/pdb_seqres.fasta` are required.

## Steps

Run everything below from the `g2s/` folder on the server (adjust
`DEPLOY_ROOT` to wherever you clone the repo, e.g. `/opt/g2s`).

### 1. Get the code

```bash
git clone <this-repo-url> g2s   # or git pull if already cloned
cd g2s
```

### 2. Start the databases

```bash
docker compose up -d mysql mysql-old mongo
```

### 3. Import the `pdb_2026` dump

```bash
# copy deploy-package/pdb_2026.sql.gz to the server first, then:
gunzip -c pdb_2026.sql.gz | docker exec -i pdb-mariadb mysql -u cbio -pcbio pdb_2026
```

Verify:

```bash
docker exec pdb-mariadb mysql -u cbio -pcbio pdb_2026 -e "SELECT COUNT(*) FROM pdb_seq_alignment;"
```

Expect a large row count (millions) — same check as `G2S-SETUP.md`.

### 4. Place the BLAST index

```bash
mkdir -p workdir
tar -xzf blast-index.tar.gz -C workdir
```

### 5. Pull the BLAST image

```bash
docker pull ncbi/blast:2.16.0
```

### 6. Configure `application-local.properties`

Create `pdb-alignment-web/src/main/resources/application-local.properties`
(gitignored, machine-specific — same convention as the Windows dev box):

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/pdb_2026?useSSL=false

workspace=/opt/g2s/workdir/
uploaddir=/opt/g2s/tmp/upload

# No native BLAST+ install on this box either - run blastp via the
# ncbi/blast Docker image. See yichuan_scripts/blastp-docker.sh.
blastp=/opt/g2s/yichuan_scripts/blastp-docker.sh
```

Adjust the `/opt/g2s` paths to match `DEPLOY_ROOT` on this server.

`mkdir -p tmp/upload` if it doesn't already exist.

### 7. HTTPS keystore (for port 5443)

Same as `G2S-SETUP.md`, step 1 — not in git:

```bash
mkdir -p tmp
export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
"$JAVA_HOME/bin/keytool" -genkeypair -alias tomcat -storetype PKCS12 -keyalg RSA -keysize 2048 \
    -keystore pdb-alignment-web/src/main/resources/keystore.p12 -storepass 123456 -keypass 123456 -validity 3650 \
    -dname "CN=localhost, OU=Dev, O=G2S, L=NA, ST=NA, C=US"
```

Consider a real cert + reverse proxy instead of self-signed for anything
reachable outside the server — see hardening notes below.

### 8. Build

```bash
mvn clean package -DskipTests
```

### 9. Start the services

```bash
chmod +x yichuan_scripts/start-services.sh yichuan_scripts/stop-services.sh yichuan_scripts/blastp-docker.sh
./yichuan_scripts/start-services.sh
```

Logs land in `g2s/logs/*.log`. Stop with `./yichuan_scripts/stop-services.sh`.

Quick check:

```
http://<server>:8081/swagger-ui.html
http://<server>:8082/swagger-ui.html
https://<server>:5443/
```

## Production-hardening — not done automatically, review before exposing this publicly

These are all still set to the local-dev defaults and were out of scope for
"get it running" — flagging them rather than silently changing behavior:

- **DB credentials**: `cbio/cbio` and MySQL root password `root` are the
  dev defaults baked into `docker-compose.yml`. Change them for anything
  beyond an internal/firewalled box.
- **Exposed ports**: `docker-compose.yml` publishes 3306/3307/27017 on all
  interfaces (`ports: "3306:3306"`). On a real server, bind these to
  localhost only (`127.0.0.1:3306:3306`) unless something outside the box
  genuinely needs direct DB access.
- **Self-signed cert on 5443**: fine for internal use; browsers will warn
  external users. Put a real cert (Let's Encrypt, internal CA) behind a
  reverse proxy if this is public-facing.
- **The by-sequence BLAST endpoints**: now fixed to not crash the JVM on
  error (this session's `CommandProcessUtil.java` fix), but they still spin
  up a Docker container per request — fine for the traffic this endpoint
  actually gets (the 3D viewer doesn't call it), but not something to put
  under real load without re-checking the ephemeral-container overhead
  discussed earlier in this session.
