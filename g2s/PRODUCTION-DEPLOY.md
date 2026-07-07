# Deploying G2S to a Linux server

Mirrors the local Windows dev setup (`START-SERVICES.md`):
docker-compose runs the databases, the three Java services run directly on the
host, and `blastp` runs via a Docker sidecar container instead of a native
install.

## Prerequisites on the server

- Docker + Docker Compose
- JDK 8 and Maven (to build the jars/war on the server itself)

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
docker compose up -d mysql mongo
```

(`mysql-old` in `docker-compose.yml` is a legacy archive DB that nothing in
the app connects to — no need to start it.)

### 3. Import the `pdb_2026` dump

```bash
gunzip -c pdb_2026.sql.gz | docker exec -i pdb-mariadb mysql -u cbio -pcbio pdb_2026
```

Verify:

```bash
docker exec pdb-mariadb mysql -u cbio -pcbio pdb_2026 -e "SELECT COUNT(*) FROM pdb_seq_alignment;"
```

Expect a large row count (millions).

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

This file is gitignored, so it won't exist after `git clone` — create it yourself:

`pdb-alignment-web/src/main/resources/application-local.properties`
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/pdb_2026?useSSL=false

workspace=/opt/g2s/workdir/
uploaddir=/opt/g2s/tmp/upload

blastp=/opt/g2s/yichuan_scripts/blastp-docker.sh
```

Adjust `/opt/g2s` to match `DEPLOY_ROOT`, and `mkdir -p tmp/upload` if needed.

> `pdb` and `pdb-alignment-api` have the same kind of file too, but you don't
> need to touch them for a standard setup like this. Only edit them if you
> later change the DB host, port, name, or credentials.

### 7. HTTPS keystore (for port 5443)

Not in git — generate a self-signed cert:

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
./yichuan_scripts/start-services.sh
```

Logs land in `g2s/logs/*.log`. Stop with `./yichuan_scripts/stop-services.sh`.

Quick check:

```
http://<server>:8081/swagger-ui.html
http://<server>:8082/swagger-ui.html
https://<server>:5443/
```
