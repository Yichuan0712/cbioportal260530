# G2S BLAST+ pipeline - single entry point (same params as old Java init).
#
#   Setup   - prepare sequences, makeblastdb, create pdb_2026, import reference IDs
#   Chunk   - blastp (outfmt 5) + SQL import for one chunk
#   All     - every pending chunk (resumable)
#   Status  - manifest progress
#
# Requires NCBI BLAST+ on PATH (see README - g2s/tools/ncbi-blast).

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet("Setup", "Chunk", "All", "Status")]
    [string]$Action,

    [int]$ChunkIndex = -1,
    [int]$MaxChunks = 0,
    [switch]$Force,
    [switch]$DropDb,
    [switch]$SkipImport
)

$ErrorActionPreference = "Stop"
$G2sRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Set-Location $G2sRoot
. (Join-Path $G2sRoot "yichuan_scripts\env.ps1")
. (Join-Path $G2sRoot "yichuan_scripts\pipeline-blast\config.ps1")

function Assert-BlastTools {
    if ($PipelineUseDockerBlast) { return }
    foreach ($cmd in @("makeblastdb", "blastp")) {
        if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
            throw @"
$cmd not found on PATH.

Install NCBI BLAST+ and extract to:
  g2s\tools\ncbi-blast\
so that g2s\tools\ncbi-blast\blastp.exe exists, then re-run:
  . .\yichuan_scripts\env.ps1
"@
        }
    }
}

function Assert-DockerMysql {
    $running = docker ps --filter "name=$PipelineDbContainer" --format "{{.Names}}" 2>$null
    if ($running -notmatch $PipelineDbContainer) {
        throw "Container $PipelineDbContainer not running. Start services first."
    }
}

function Get-Manifest {
    if (-not (Test-Path $PipelineManifest)) {
        throw "Missing manifest at $PipelineManifest - run: run.ps1 Setup"
    }
    return Get-Content $PipelineManifest -Raw | ConvertFrom-Json
}

function Save-Manifest($manifest) {
    $manifest | ConvertTo-Json -Depth 6 | Set-Content $PipelineManifest -Encoding UTF8
}

function Test-ChunkAligned([string]$Status) {
    return $Status -eq "align_done" -or $Status -eq "blast_done"
}

function Get-ChunkXml($chunk) {
    if ($chunk.xml) { return $chunk.xml }
    if ($chunk.PSObject.Properties.Name -contains "xml") { return $chunk.xml }
    throw "Manifest chunk missing 'xml' path - re-run Setup with pipeline-blast"
}

function Invoke-PreparePdb {
    if (-not (Test-Path $PipelinePdbRepo)) {
        throw @"
Missing PDB repo directory: $PipelinePdbRepo

Download PDB structures into g2s_pdb/ first (rsync or mirror of RCSB divided/pdb).
"@
    }

    $pdbFiles = @(Get-ChildItem -Path $PipelinePdbRepo -Recurse -File -ErrorAction SilentlyContinue)
    if ($pdbFiles.Count -eq 0) {
        throw @"
g2s_pdb/ is empty: $PipelinePdbRepo

Download PDB .pdb.gz structure files before running Setup.
"@
    }

    New-Item -ItemType Directory -Path $PipelineWorkspace, (Join-Path $G2sRoot "tmp") -Force | Out-Null

    $execArgLine = "--pdb-repo `"$PipelinePdbRepo`" --workspace `"$PipelineWorkspace`" --g2s-root `"$G2sRoot`""
    if ($MaxPdbFiles -gt 0) {
        $execArgLine += " --max-files $MaxPdbFiles"
    }

    if ((Test-Path $PipelinePdbSeqresFasta) -and -not $Force) {
        $existing = Get-Item $PipelinePdbSeqresFasta
        if ($existing.Length -gt 50MB) {
            Write-Host "[prepare-pdb] Skip - existing FASTA ($([math]::Round($existing.Length/1GB,2)) GB): $PipelinePdbSeqresFasta"
            return
        }
    }

    Write-Host "[prepare-pdb] Step 1+2 (yichuan pdb-prepare): $($pdbFiles.Count) file(s) -> pdb_seqres.fasta ..."
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & mvn -f $PipelinePdbPreparePom -q compile exec:java "-Dexec.args=$execArgLine" 2>&1 | ForEach-Object { Write-Host $_ }
    $ErrorActionPreference = $prevEAP
    if ($LASTEXITCODE -ne 0) { throw "PdbPrepareMain failed (exit $LASTEXITCODE)" }

    if (-not (Test-Path $PipelinePdbSeqresFasta)) {
        throw "Missing $PipelinePdbSeqresFasta after Java PDB prepare"
    }
    Write-Host "[prepare-pdb] OK: $PipelinePdbSeqresFasta"
}

function Invoke-Prepare {
    foreach ($gz in @($PipelineEnsemblGz, $PipelineSwissprotGz, $PipelineIsoformGz)) {
        if (-not (Test-Path $gz)) { throw "Missing input: $gz" }
    }

    New-Item -ItemType Directory -Path $PipelineWorkspace, $PipelineStateDir, $PipelineResultsDir -Force | Out-Null

    Invoke-PreparePdb

    $pyArgs = @(
        (Join-Path $PipelineRoot "prepare_inputs.py"),
        "--inputs-dir", $PipelineInputsDir,
        "--workspace", $PipelineWorkspace,
        "--state-dir", $PipelineStateDir,
        "--results-dir", $PipelineResultsDir,
        "--chunk-size", $PipelineGeneChunkSize
    )
    if ($MaxGeneChunks -gt 0) { $pyArgs += @("--max-gene-chunks", $MaxGeneChunks) }
    if ($MaxPdbSeqresLines -gt 0) { $pyArgs += @("--max-pdb-seqres-lines", $MaxPdbSeqresLines) }

    Write-Host "[prepare] Running prepare_inputs.py ..."
    python @pyArgs
    if ($LASTEXITCODE -ne 0) { throw "prepare_inputs.py failed" }
}

function Invoke-Makedb {
    Assert-BlastTools
    if (-not (Test-Path $PipelinePdbSeqresFasta)) {
        throw "Missing $PipelinePdbSeqresFasta - run Setup first"
    }
    $pinFile = "$PipelinePdbBlastDb.pin"
    $fastaNewer = $false
    if ((Test-Path $pinFile) -and (Test-Path $PipelinePdbSeqresFasta)) {
        $fastaNewer = (Get-Item $PipelinePdbSeqresFasta).LastWriteTime -gt (Get-Item $pinFile).LastWriteTime
    }
    if ((Test-Path $pinFile) -and -not $Force -and -not $fastaNewer) {
        Write-Host "[makedb] BLAST DB exists - skip (use -Force to rebuild)"
        return
    }
    Write-Host "[makedb] makeblastdb on pdb_seqres.fasta ..."
    & makeblastdb -in $PipelinePdbSeqresFasta -dbtype prot -out $PipelinePdbBlastDb
    if ($LASTEXITCODE -ne 0) { throw "makeblastdb failed" }
}

function Invoke-InitDb {
    if (-not (Test-Path $PipelineSqlSchema)) {
        throw "Missing schema: $PipelineSqlSchema"
    }
    Assert-DockerMysql

    if ($DropDb) {
        Write-Host "[init-db] Dropping database $PipelineDbName ..."
        docker exec -e "MYSQL_PWD=$PipelineDbRootPass" $PipelineDbContainer mysql -u root -e "DROP DATABASE IF EXISTS ``$PipelineDbName``;"
        if ($LASTEXITCODE -ne 0) { throw "Drop database failed" }
    }

    Write-Host "[init-db] Creating schema on $PipelineDbName ..."
    $createSql = @"
CREATE DATABASE IF NOT EXISTS ``$PipelineDbName`` CHARACTER SET utf8 COLLATE utf8_general_ci;
GRANT ALL PRIVILEGES ON ``$PipelineDbName``.* TO '$PipelineDbUser'@'%';
FLUSH PRIVILEGES;
"@
    $createSql | docker exec -i -e "MYSQL_PWD=$PipelineDbRootPass" $PipelineDbContainer mysql -u root
    if ($LASTEXITCODE -ne 0) { throw "Create database failed" }

    Get-Content $PipelineSqlSchema -Raw | docker exec -i -e "MYSQL_PWD=$PipelineDbPass" $PipelineDbContainer mysql -u $PipelineDbUser $PipelineDbName
    if ($LASTEXITCODE -ne 0) { throw "Schema import failed" }
}

function Invoke-ImportReference {
    if (-not (Test-Path $PipelineInsertSeqSql)) {
        throw "Missing $PipelineInsertSeqSql - run Setup first"
    }
    Assert-DockerMysql

    if (-not $Force) {
        $count = docker exec -e "MYSQL_PWD=$PipelineDbPass" $PipelineDbContainer mysql -N -u $PipelineDbUser $PipelineDbName -e "SELECT COUNT(*) FROM seq_entry;" 2>$null
        if ($count -and [int]$count -gt 0) {
            Write-Host "[import-ref] seq_entry already has $count rows - skip (use -Force)"
            return
        }
    }

    Write-Host "[import-ref] Loading reference IDs ..."
    Get-Content $PipelineInsertSeqSql -Raw | docker exec -i -e "MYSQL_PWD=$PipelineDbPass" $PipelineDbContainer mysql -u $PipelineDbUser $PipelineDbName
    if ($LASTEXITCODE -ne 0) { throw "Reference import failed" }
}

function Get-DockerPath([string]$WinPath) {
    $resolved = [System.IO.Path]::GetFullPath($WinPath) -replace '\\', '/'
    if ($resolved -match '^([A-Za-z]):(.*)$') {
        return "/$($Matches[1].ToLower())$($Matches[2])"
    }
    return $resolved
}

function Get-WorkdirDockerPath([string]$Path) {
    $full = [System.IO.Path]::GetFullPath($Path)
    $work = [System.IO.Path]::GetFullPath($PipelineWorkspace)
    if (-not $full.StartsWith($work, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Path not under workdir: $Path"
    }
    $rel = $full.Substring($work.Length).TrimStart('\').Replace('\', '/')
    return "/workdir/$rel"
}

function Invoke-BlastChunk {
    param([int]$Index, [switch]$ForceAlign)

    if (-not $PipelineUseDockerBlast) { Assert-BlastTools }
    $manifest = Get-Manifest
    $pinFile = "$PipelinePdbBlastDb.pin"
    if (-not (Test-Path $pinFile)) {
        throw "Missing BLAST DB - run Setup first"
    }

    $chunk = $manifest.chunks | Where-Object { $_.index -eq $Index } | Select-Object -First 1
    if (-not $chunk) {
        throw "ChunkIndex $Index not in manifest (0..$($manifest.chunk_count - 1))"
    }
    $xmlOut = Get-ChunkXml $chunk
    if (-not (Test-Path $chunk.query_fasta)) {
        throw "Missing query chunk: $($chunk.query_fasta)"
    }
    if ((Test-ChunkAligned $chunk.status) -and (Test-Path $xmlOut) -and -not $ForceAlign) {
        Write-Host "[blast] Chunk $Index already aligned - skip (use -Force)"
        return
    }

    Write-Host "[blast] blastp chunk $Index (outfmt 5 XML) ..."
    Write-Host "  query: $($chunk.query_fasta)"
    Write-Host "  xml:   $xmlOut"

    if ($PipelineUseDockerBlast) {
        $mountRoot = Get-DockerPath $PipelineWorkspace
        $dbIn = Get-WorkdirDockerPath $PipelinePdbBlastDb
        $queryIn = Get-WorkdirDockerPath $chunk.query_fasta
        $xmlIn = Get-WorkdirDockerPath $xmlOut
        Write-Host "  via docker: $PipelineBlastDockerImage"
        docker run --rm -v "${mountRoot}:/workdir" $PipelineBlastDockerImage blastp `
            -db $dbIn `
            -query $queryIn `
            -word_size $PipelineBlastWordSize `
            -evalue $PipelineBlastEvalue `
            -max_target_seqs $PipelineBlastMaxTargets `
            -num_threads $PipelineBlastThreads `
            -outfmt 5 `
            -out $xmlIn
    } else {
        & blastp `
            -db $PipelinePdbBlastDb `
            -query $chunk.query_fasta `
            -word_size $PipelineBlastWordSize `
            -evalue $PipelineBlastEvalue `
            -max_target_seqs $PipelineBlastMaxTargets `
            -num_threads $PipelineBlastThreads `
            -outfmt 5 `
            -out $xmlOut
    }
    if ($LASTEXITCODE -ne 0) { throw "blastp failed for chunk $Index" }

    $raw = Get-Manifest
    foreach ($c in $raw.chunks) {
        if ($c.index -eq $Index) {
            $c.status = "align_done"
            $c | Add-Member -NotePropertyName align_finished -NotePropertyValue (Get-Date).ToString("o") -Force
        }
    }
    Save-Manifest $raw
    Write-Host "[blast] Chunk $Index align_done."
}

function Invoke-ImportChunk {
    param([int]$Index, [switch]$SkipDbImport, [switch]$Force)

    $manifest = Get-Manifest
    $chunk = $manifest.chunks | Where-Object { $_.index -eq $Index } | Select-Object -First 1
    if (-not $chunk) { throw "Unknown chunk $Index" }
    if ($chunk.status -eq "import_done" -and -not $Force) {
        Write-Host "[import] Chunk $Index already import_done - skip (use -Force to re-import)"
        return
    }
    if (-not (Test-ChunkAligned $chunk.status) -and $chunk.status -ne "import_done") {
        throw "Chunk $Index status is '$($chunk.status)' - run blast first"
    }

    $xmlPath = Get-ChunkXml $chunk
    if (-not (Test-Path $xmlPath)) {
        throw "Missing BLAST XML: $xmlPath"
    }

    $converter = Join-Path $PipelineRoot "blast_to_sql.py"
    Write-Host "[import] Converting BLAST XML -> SQL for chunk $Index ..."
    & python $converter --xml $xmlPath --sql $chunk.sql
    if ($LASTEXITCODE -ne 0) { throw "blast_to_sql.py failed for chunk $Index" }

    if ($SkipDbImport) {
        Write-Host "[import] SkipImport - SQL only: $($chunk.sql)"
        return
    }

    Assert-DockerMysql
    Write-Host "[import] Loading SQL into $PipelineDbName ..."
    Get-Content $chunk.sql -Raw | docker exec -i -e "MYSQL_PWD=$PipelineDbPass" $PipelineDbContainer mysql -u $PipelineDbUser $PipelineDbName
    if ($LASTEXITCODE -ne 0) { throw "MySQL import failed for chunk $Index" }

    $raw = Get-Manifest
    foreach ($c in $raw.chunks) {
        if ($c.index -eq $Index) {
            $c.status = "import_done"
            $c | Add-Member -NotePropertyName import_finished -NotePropertyValue (Get-Date).ToString("o") -Force
        }
    }
    Save-Manifest $raw
    Write-Host "[import] Chunk $Index import_done."
}

function Invoke-Status {
    if (-not (Test-Path $PipelineManifest)) {
        Write-Host "No manifest - run Setup first."
        exit 1
    }
    $m = Get-Manifest
    $lastIndex = [Math]::Max(0, $m.chunk_count - 1)
    $pending = ($m.chunks | Where-Object { $_.status -eq "pending" }).Count
    $aligned = ($m.chunks | Where-Object { (Test-ChunkAligned $_.status) -and $_.status -ne "import_done" }).Count
    $imported = ($m.chunks | Where-Object { $_.status -eq "import_done" }).Count

    Write-Host "Pipeline: $($m.pipeline)"
    Write-Host "PDB FASTA entries: $($m.pdb_fasta_entries)"
    Write-Host "Gene sequences:    $($m.gene_seq_count)"
    Write-Host ""
    Write-Host "Chunks: $($m.chunk_count) total  (index 0 .. $lastIndex)"
    Write-Host "  pending:  $pending"
    Write-Host "  aligned:  $aligned"
    Write-Host "  imported: $imported"
    Write-Host ""
    Write-Host "Per chunk:"
    $m.chunks | ForEach-Object {
        Write-Host ("  [{0}] {1}" -f $_.index, $_.status)
    }
}

switch ($Action) {
    "Setup" {
        Invoke-Prepare
        Invoke-Makedb
        Invoke-InitDb
        Invoke-ImportReference
        $m = Get-Manifest
        $lastIndex = [Math]::Max(0, $m.chunk_count - 1)
        Write-Host ""
        Write-Host "Setup complete."
        Write-Host "  Chunks: $($m.chunk_count)  (run Chunk -ChunkIndex 0..$lastIndex, or run All)"
        Write-Host "  Status: run.ps1 Status"
    }
    "Chunk" {
        if ($ChunkIndex -lt 0) { throw "Chunk requires -ChunkIndex N" }
        Invoke-BlastChunk -Index $ChunkIndex -ForceAlign:$Force
        Invoke-ImportChunk -Index $ChunkIndex -SkipDbImport:$SkipImport -Force:$Force
    }
    "All" {
        $m = Get-Manifest
        $limit = if ($MaxChunks -gt 0) { [Math]::Min($MaxChunks, $m.chunk_count) } else { $m.chunk_count }
        if ($MaxChunks -gt 0) {
            Write-Host "Processing chunks 0 .. $($limit - 1) ($limit total, then stop)"
        }
        for ($i = 0; $i -lt $limit; $i++) {
            $c = $m.chunks | Where-Object { $_.index -eq $i } | Select-Object -First 1
            if (-not (Test-ChunkAligned $c.status) -and $c.status -ne "import_done") {
                Invoke-BlastChunk -Index $i -ForceAlign:$Force
            }
            if (-not $SkipImport) {
                $m2 = Get-Manifest
                $c2 = $m2.chunks | Where-Object { $_.index -eq $i } | Select-Object -First 1
                if ((Test-ChunkAligned $c2.status) -and $c2.status -ne "import_done") {
                    Invoke-ImportChunk -Index $i -Force:$Force
                }
            }
        }
        Write-Host ""
        Write-Host "All chunks processed."
    }
    "Status" {
        Invoke-Status
    }
}
