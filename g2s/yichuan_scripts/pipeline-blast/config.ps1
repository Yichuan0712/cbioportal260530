# Shared config - loaded by run.ps1 (edit paths/params here).
$ErrorActionPreference = "Stop"

if (-not $PipelineRoot) {
    $PipelineRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if (-not $G2sRoot) {
    $G2sRoot = Split-Path -Parent (Split-Path -Parent $PipelineRoot)
}

# --- Input sources (already downloaded) ---
$PipelineInputsDir   = Join-Path $G2sRoot "latest-alignment-inputs"
$PipelinePdbRepo     = Join-Path $G2sRoot "g2s_pdb"
$PipelineWorkspace  = Join-Path $G2sRoot "workdir"
$PipelineStateDir    = Join-Path $PipelineWorkspace "pipeline-blast"
$PipelineResultsDir  = Join-Path $PipelineStateDir "results"
$PipelineManifest    = Join-Path $PipelineStateDir "manifest.json"

$PipelinePdbSeqresGz     = Join-Path $PipelineInputsDir "pdb_seqres.txt.gz"
$PipelinePdbPreparePom = Join-Path $PipelineRoot "pdb-prepare/pom.xml"
$PipelineEnsemblGz       = Join-Path $PipelineInputsDir "Homo_sapiens.GRCh38.pep.all.fa.gz"
$PipelineSwissprotGz     = Join-Path $PipelineInputsDir "uniprot_sprot.fasta.gz"
$PipelineIsoformGz       = Join-Path $PipelineInputsDir "uniprot_sprot_varsplic.fasta.gz"

# --- Prepared files (workdir) ---
$PipelinePdbSeqresTxt    = Join-Path $PipelineWorkspace "pdb_seqres.txt"
$PipelinePdbSeqresFasta  = Join-Path $PipelineWorkspace "pdb_seqres.fasta"
$PipelinePdbBlastDb      = Join-Path $PipelineWorkspace "pdb_seqres.db"
$PipelineGeneFasta       = Join-Path $PipelineWorkspace "geneseq.fasta"
$PipelineInsertSeqSql    = Join-Path $PipelineWorkspace "insert_Sequence.sql"

# --- Match old application.properties (NCBI BLAST+) ---
$PipelineGeneChunkSize     = 10000   # ensembl_input_interval
$PipelineBlastThreads      = 6
$PipelineBlastEvalue       = "1"
$PipelineBlastMaxTargets   = 50
$PipelineBlastWordSize     = 3

# --- Target MySQL database for NEW build ---
$PipelineDbName = "pdb_2026"
$PipelineDbHost = "localhost"
$PipelineDbUser = "cbio"
$PipelineDbPass = "cbio"
$PipelineDbContainer = "pdb-mariadb"
$PipelineDbRootPass = "root"
$PipelineSqlSchema   = Join-Path $PipelineRoot "resources/pdb_2026.sql"

# --- Small-scale test knobs ---
$MaxGeneChunks = 0
$MaxPdbSeqresLines = 0
$MaxPdbFiles = 0

# --- BLAST execution (local blastp needs VC++ redistributable on Windows) ---
$PipelineBlastDockerImage = "ncbi/blast:2.16.0"
$PipelineUseDockerBlast = $true
