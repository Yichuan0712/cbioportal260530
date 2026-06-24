# G2S Pipeline — NCBI BLAST+

Same logic as the original G2S init pipeline (`pdb-alignment-pipeline`):

- **prepare** → **makeblastdb** → **blastp** (outfmt 5 XML) → **SQL** → **pdb_new**

## BLAST+ location

Installed under `g2s/tools/ncbi-blast/` (gitignored). After:

```powershell
cd g2s
. .\yichuan_scripts\env.ps1
```

`makeblastdb` and `blastp` are on PATH.

## Scripts

| File | Purpose |
|------|---------|
| **`run.ps1`** | Single entry — Setup / Chunk / All / Status |
| `config.ps1` | Paths and BLAST params (edit, do not run alone) |
| `prepare_inputs.py` | Raw .gz → FASTA + insert_Sequence.sql |
| `blast_to_sql.py` | BLAST XML → pdb_entry + pdb_seq_alignment SQL |

## BLAST parameters (match old `application.properties`)

| Param | Value |
|-------|-------|
| `-evalue` | `1` |
| `-max_target_seqs` | `50` |
| `-word_size` | `3` |
| `-num_threads` | `6` |
| `-outfmt` | `5` (XML) |

## Commands

```powershell
cd g2s
. .\yichuan_scripts\env.ps1

.\yichuan_scripts\pipeline-blast\run.ps1 Setup
.\yichuan_scripts\pipeline-blast\run.ps1 Chunk -ChunkIndex 0
.\yichuan_scripts\pipeline-blast\run.ps1 All
.\yichuan_scripts\pipeline-blast\run.ps1 Status
```

State directory: `workdir/pipeline-blast/`.

Small test: `config.ps1` → `$MaxGeneChunks = 1`.

## Outputs

```
workdir/
  pdb_seqres.fasta
  pdb_seqres.db.{pin,phr,psq,...}
  geneseq.fasta.N
  insert_Sequence.sql
  pipeline-blast/
    manifest.json
    results/chunk-0000.xml
    results/chunk-0000.sql
```

After `All` completes, export one file for Docker like the old dump:

```powershell
docker exec pdb-mariadb mysqldump -u cbio -pcbio pdb_new | gzip > mysqldump_pdb_new.sql.gz
```
