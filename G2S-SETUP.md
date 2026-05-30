# G2S Environment Setup (Windows / PowerShell)

How to set up everything needed to **build** the G2S project. Once this is done, see
`START-SERVICES.md` for how to run the services.

> All commands run from the **g2s project root** — the folder that contains `pom.xml` and
> the `scripts\` directory. `cd` into that folder first. All paths below are relative to it.

---

## What you need to install

| Tool | Version | Required for | Notes |
|------|---------|--------------|-------|
| Java JDK | **1.8** (exactly) | building & running | Amazon Corretto 8 recommended |
| Maven | 3.9.x | building | Can be dropped into `g2s\tools\` (auto-detected) |
| Docker Desktop | latest | MySQL + MongoDB | Databases run in containers |
| BLAST+ | 2.4.0+ | **only** the data pipeline (`init`/`update`) | Not needed just to run the services |

> The day-to-day services (APIs + web) only need **Java + Maven + Docker**. BLAST+ is only
> required if you regenerate the alignment data from scratch with the pipeline.

---

## 1. Java JDK 1.8

Install Amazon Corretto 8 (easiest JDK 1.8 on Windows):

```powershell
winget install Amazon.Corretto.8.JDK
```

This installs to something like `C:\Program Files\Amazon Corretto\jdk1.8.0_xxx`.
`scripts\env.ps1` looks for it automatically (see section 4).

> Java 1.8 is mandatory — the project does **not** build on Java 11+.

---

## 2. Maven 3.9.x

`scripts\env.ps1` automatically adds Maven to PATH **if** it finds it at
`g2s\tools\apache-maven-3.9.6`. The simplest setup is to put it exactly there:

```powershell
# from the g2s root
New-Item -ItemType Directory -Path tools -Force | Out-Null
$url = "https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip"
Invoke-WebRequest -Uri $url -OutFile tools\maven.zip
Expand-Archive -Path tools\maven.zip -DestinationPath tools -Force
Remove-Item tools\maven.zip
```

Resulting path: `g2s\tools\apache-maven-3.9.6\bin\mvn.cmd`.

> Alternative: install system-wide (`winget install Apache.Maven`) and ensure `mvn` is on PATH.

---

## 3. Docker Desktop

Install Docker Desktop and start it (the whale icon must be running before you start the
databases). Verify:

```powershell
docker --version
```

The databases (MariaDB + MongoDB) are defined in `g2s\docker-compose.yml`; you do not
install MySQL/MongoDB manually.

---

## 4. Load the environment (`scripts\env.ps1`)

Run this **once per new PowerShell window** before building or running:

```powershell
. .\scripts\env.ps1
```

It does three things:
- Sets `JAVA_HOME` to a detected JDK 1.8 (Corretto 8 or `jdk1.8.0_202`) and puts it on PATH.
- Adds `tools\apache-maven-3.9.6\bin` to PATH if present.
- Adds Docker's bin folder to PATH if present.

> It prints `java -version` and you will see it in **red text** with `NativeCommandError`.
> This is NOT an error — `java -version` writes to stderr and PowerShell renders it red.
> As long as you see `1.8.0_xxx`, the environment is correct.

Verify both tools resolve:

```powershell
java -version      # expect 1.8.0_xxx (shown in red, that's fine)
mvn -version       # expect Apache Maven 3.9.6, Java version 1.8.0_xxx
```

---

## 5. Generate the HTTPS keystore (for the 5443 web UI)

The `pdb-alignment-web` module serves HTTPS on port 5443 and is configured to load a
keystore from the classpath:

```
server.ssl.key-store: classpath:keystore.p12
server.ssl.key-store-password: 123456
server.ssl.keyStoreType: PKCS12
server.ssl.keyAlias: tomcat
```

This `keystore.p12` file is **not** committed to the repo, so a fresh clone is missing it
and the web service fails to start (the 8081 and 8082 services are unaffected). Generate a
self-signed one with the JDK's `keytool` — the alias/password/type below must match the
config above:

```powershell
$ks = "pdb-alignment-web\src\main\resources\keystore.p12"
& "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -alias tomcat -storetype PKCS12 -keyalg RSA -keysize 2048 `
    -keystore $ks -storepass 123456 -keypass 123456 -validity 3650 `
    -dname "CN=localhost, OU=Dev, O=G2S, L=NA, ST=NA, C=US"
```

> This is a one-time step per clone. Generate it **before** building (Step 6) so it gets
> bundled into the web jar. It produces a self-signed certificate, so browsers will show a
> warning at https://localhost:5443 — click "Advanced → proceed" to trust it.

---

## 6. Build the project

"Build" = use Maven to compile the `.java` source code and package it into runnable
`.jar` / `.war` files under each module's `target\` folder. You must build before you can
run the services.

```powershell
. .\scripts\env.ps1
mvn clean package -DskipTests
```

A successful build produces four artifacts:

| Artifact | Module |
|----------|--------|
| `pdb\target\pdb-0.1.0.war` | core PDB API |
| `pdb-alignment-api\target\pdb-alignment-api-0.1.0.jar` | G2S alignment API |
| `pdb-alignment-web\target\pdb-alignment-web-0.1.0.jar` | web UI |
| `pdb-alignment-pipeline\target\pdb-alignment-pipeline-0.1.0.jar` | data pipeline |

> Rebuild only after changing code. Rebuild a single module, e.g. web:
> `mvn package -pl pdb-alignment-web -am -DskipTests`

---

## 7. Environment checklist

| Item | Verify with | Expected |
|------|-------------|----------|
| Java 1.8 | `java -version` | `1.8.0_xxx` |
| Maven | `mvn -version` | `Apache Maven 3.9.6` + Java 1.8 |
| Docker | `docker --version` | a version string |
| Keystore | check `pdb-alignment-web\src\main\resources\keystore.p12` | file exists |
| Build artifacts | check `target\` folders | 4 jar/war files exist |

Once all pass, continue with **`START-SERVICES.md`**.
