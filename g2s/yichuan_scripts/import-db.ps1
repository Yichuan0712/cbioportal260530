# Import mysqldump_pdb_2025_08_07.sql.gz into Docker MySQL (database: pdb)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Gz = Join-Path $Root "mysqldump_pdb_2025_08_07.sql.gz"
$Log = Join-Path $Root "import-db.log"

$dockerBin = "C:\Program Files\Docker\Docker\resources\bin"
if (Test-Path $dockerBin) { $env:Path = "$dockerBin;$env:Path" }

if (-not (Test-Path $Gz)) {
    throw "Dump not found: $Gz"
}

$running = docker ps --filter "name=pdb-mariadb" --format "{{.Names}}" 2>$null
if ($running -notmatch "pdb-mariadb") {
    throw "Container pdb-mariadb is not running. Run .\yichuan_scripts\setup-path-a.ps1 first."
}

Write-Host "Copying dump into container (2.3GB, may take several minutes)..."
docker cp $Gz pdb-mariadb:/tmp/mysqldump.sql.gz
if ($LASTEXITCODE -ne 0) { throw "docker cp failed" }

Write-Host "Importing inside container (gunzip | mysql). See $Log for progress..."
$importCmd = "gunzip -c /tmp/mysqldump.sql.gz | mysql -u cbio -pcbio pdb && rm -f /tmp/mysqldump.sql.gz"
docker exec pdb-mariadb bash -c $importCmd 2>&1 | Tee-Object -FilePath $Log
if ($LASTEXITCODE -ne 0) { throw "Import failed. See $Log" }

Write-Host "Verifying tables..."
docker exec pdb-mariadb mysql -u cbio -pcbio pdb -e "SHOW TABLES LIKE 'pdb_seq_alignment'; SHOW TABLES LIKE 'pdb_uniprot_alignment'; SELECT COUNT(*) AS alignments FROM pdb_seq_alignment;"
Write-Host "Import finished."
