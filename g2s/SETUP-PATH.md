# 本地环境说明（Windows）

## 已完成的配置

- `docker-compose.yml`：数据卷改为 `./mysql_data`、`./mongo_data`
- Pipeline / Web 的 `application.properties`：相对路径（本机绝对路径见 `application-local.properties.example`）
- Web 数据库改为 `pdb`（与 dump 一致）
- JDK 8：已安装 Amazon Corretto 8（也可用已有 `jdk1.8.0_202`）
- Maven 3.9.6：位于 `tools/apache-maven-3.9.6`
- 项目已 `mvn clean package -DskipTests` 编译成功
- Docker：MySQL + MongoDB 容器 `pdb-mariadb`、`pdb-mongo`

## 每次使用前（新终端）

```powershell
cd C:\CursorProjects\cbioportal260530\g2s
. .\scripts\env.ps1
```

确保 **Docker Desktop 正在运行**。

## 1. 启动数据库

```powershell
.\scripts\setup-path-a.ps1
```

或：

```powershell
docker compose up -d mysql mongo
```

## 2. 导入数据库（首次，约 30–90 分钟）

dump 约 **2.3GB 压缩包**，在容器内解压导入：

```powershell
.\scripts\import-db.ps1
```

日志：`import-db.log`。导入完成后可检查：

```powershell
docker exec pdb-mariadb mysql -u cbio -pcbio pdb -e "SHOW TABLES;"
```

## 3. 启动三个 Java 服务

```powershell
.\scripts\start-services.ps1
```

仅重启 Web 站（修复 Thymeleaf 后需重新 `mvn package -pl pdb-alignment-web`）：

```powershell
.\scripts\start-web.ps1
```

或手动（先 `. .\scripts\env.ps1`）：

```powershell
java -Xmx4096m -jar pdb-alignment-api\target\pdb-alignment-api-0.1.0.jar
java -Xmx2048m -Dorg.springframework.boot.logging.LoggingSystem=org.springframework.boot.logging.java.JavaLoggingSystem -jar pdb\target\pdb-0.1.0.war --server.port=8082
java -Xmx4096m -jar pdb-alignment-web\target\pdb-alignment-web-0.1.0.jar
```

## 4. 验证

| 服务 | URL |
|------|-----|
| G2S API | http://localhost:8081/swagger-ui.html |
| PDB API | http://localhost:8082/pdb_annotation/alignment/byUniprot/P53_HUMAN |
| Web | https://localhost:5443 |

## 常见问题

- **`docker` 找不到**：先开 Docker Desktop，再执行 `. .\scripts\env.ps1`
- **拉镜像失败**：已去掉 Docker `credsStore`；若仍失败，在 Docker Desktop 登录或重试 `docker compose pull`
- **导入很慢**：正常，请等 `import-db.ps1` 窗口完成
- **Web 序列 BLAST**：需要 `workdir/pdb_seqres.fasta`（仅跑 API 查 Ensembl/UniProt 可不依赖）

## 未安装（完整 Pipeline 才需要）

- BLAST+、wget、rsync、Pipeline `init`
