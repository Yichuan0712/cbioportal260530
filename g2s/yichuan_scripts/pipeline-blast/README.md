# G2S Pipeline — NCBI BLAST+

Self-contained rebuild path under `yichuan_scripts/pipeline-blast/` (target DB: **`pdb_2026`** on **`pdb-mariadb`** :3306).

Does **not** modify `pdb-alignment-pipeline` (legacy dump path unchanged on **`pdb-mariadb-old`**).

- **pdb-prepare** (Java fork) → **prepare_inputs.py** → **makeblastdb** → **blastp** → **SQL** → **pdb_2026**

## PDB structures (`g2s_pdb/`)

Setup requires local PDB `.pdb.gz` under `g2s/g2s_pdb/`.

`run.ps1 Setup` runs `pdb-prepare/PdbPrepareMain` (BioJava segmentation fork) before gene FASTA prep.

Headers: `>101m_A_1 mol:protein length:154 0 154`

## BLAST+ location

After:

```powershell
cd g2s
. .\yichuan_scripts\env.ps1
```

`makeblastdb` / `blastp` on PATH, or set `$PipelineUseDockerBlast = $true` in `config.ps1`.

## Layout

| Path | Purpose |
|------|---------|
| **`run.ps1`** | Setup / Chunk / All / Status |
| `config.ps1` | Paths and BLAST params |
| **`pdb-prepare/`** | Java Step 1+2 fork (`PdbPrepareMain`) |
| `resources/pdb_2026.sql` | Schema for `pdb_2026` only |
| `prepare_inputs.py` | Reference proteome → gene FASTA + SQL |
| `blast_to_sql.py` | BLAST XML → alignment SQL |

## Commands

```powershell
cd g2s
. .\yichuan_scripts\env.ps1
.\yichuan_scripts\pipeline-blast\run.ps1 Setup
.\yichuan_scripts\pipeline-blast\run.ps1 Chunk -ChunkIndex 0
.\yichuan_scripts\pipeline-blast\run.ps1 All
.\yichuan_scripts\pipeline-blast\run.ps1 Status
```

Small test: `$MaxPdbFiles = 10`, `$MaxPdbSeqresLines = 100`, `$MaxGeneChunks = 1` in `config.ps1`.

## Schema (`pdb_2026` only)

- `seq_entry.SEQUENCE` (TEXT NOT NULL)
- Wider UniProt/Ensembl VARCHAR
- Legacy `pdb` dump schema unchanged on **`pdb-mariadb-old`**
