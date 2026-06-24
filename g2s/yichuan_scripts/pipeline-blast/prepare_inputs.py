#!/usr/bin/env python3
"""Prepare BLAST pipeline inputs from raw .gz source files.

Produces:
  - pdb_seqres.fasta   (PDB protein chains, mol:protein only)
  - geneseq.fasta.N    (deduplicated reference proteome query chunks)
  - insert_Sequence.sql (seq_entry / ensembl_entry / uniprot_entry)
  - manifest.json

Rules match G2S pdb-alignment-pipeline init preprocessing.

Stdlib only.
"""

from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path
from typing import Dict, Iterator, List, Tuple


def parse_fasta(path: Path) -> Iterator[Tuple[str, str]]:
    header: str | None = None
    chunks: List[str] = []
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for raw in handle:
            line = raw.strip()
            if not line:
                continue
            if line.startswith(">"):
                if header is not None:
                    yield header, "".join(chunks)
                header = line[1:]
                chunks = []
            else:
                chunks.append(line)
        if header is not None:
            yield header, "".join(chunks)


def gunzip_to(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(src, "rb") as gz_in, dest.open("wb") as out:
        out.write(gz_in.read())


def preprocess_pdb_seqres(in_path: Path, out_path: Path, max_lines: int = 0) -> int:
    """Filter pdb_seqres to mol:protein entries -> FASTA for makeblastdb."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    kept = 0
    with out_path.open("w", encoding="utf-8", newline="\n") as out:
        for header, sequence in parse_fasta(in_path):
            if max_lines and kept >= max_lines:
                break
            parts = header.split()
            if len(parts) > 1 and parts[1] == "mol:protein":
                out.write(f">{header}\n{sequence}\n")
                kept += 1
    return kept


def get_unique_seq_id_ensembl(header: str) -> str:
    parts = header.split()
    gene = ""
    transcript = ""
    for token in parts:
        if token.startswith("gene:"):
            gene = token.split(":", 1)[1]
        if token.startswith("transcript:"):
            transcript = token.split(":", 1)[1]
    if len(parts) >= 5 and not gene:
        try:
            gene = parts[3].split("gene:")[1]
            transcript = parts[4].split("transcript:")[1]
        except (IndexError, ValueError):
            pass
    return f"{parts[0]} {gene} {transcript}"


def get_uniprot_acc_map(swissprot_path: Path) -> Dict[str, str]:
    acc: Dict[str, str] = {}
    for header, _ in parse_fasta(swissprot_path):
        if not header.startswith("sp|") and "|" not in header:
            continue
        parts = header.split("|")
        if len(parts) < 3:
            continue
        uniprot_id = parts[1]
        entry_name = parts[2].split()[0]
        if uniprot_id in acc and acc[uniprot_id] != entry_name:
            print(f"Warning: UniProt ID conflict {uniprot_id}: {acc[uniprot_id]} vs {entry_name}")
        acc[uniprot_id] = entry_name
    return acc


def get_unique_seq_id_uniprot(header: str, acc_map: Dict[str, str]) -> str:
    first = header.split()[0]
    if "|" in first:
        accession = first.split("|")[1] if first.count("|") >= 2 else first
    else:
        accession = first.split("-")[0]
    if "-" in accession:
        uid, iso = accession.split("-", 1)
        return f"{uid}_{iso} {acc_map.get(uid, '')}"
    if "-" in first and "|" not in first:
        uid, iso = first.split("-", 1)
        return f"{uid}_{iso} {acc_map.get(uid, '')}"
    return f"{first}_1 {acc_map.get(first, acc_map.get(accession, ''))}"


def merge_uniprot(in_path: Path, acc_map: Dict[str, str], out: Dict[str, str]) -> None:
    for header, sequence in parse_fasta(in_path):
        label = get_unique_seq_id_uniprot(header, acc_map)
        if sequence in out:
            out[sequence] = out[sequence] + ";" + label
        else:
            out[sequence] = label


def merge_ensembl(in_path: Path, out: Dict[str, str]) -> None:
    for header, sequence in parse_fasta(in_path):
        label = get_unique_seq_id_ensembl(header)
        if sequence in out:
            out[sequence] = out[sequence] + ";" + label
        else:
            out[sequence] = label


def write_gene_fasta_and_sql(
    uniq: Dict[str, str],
    fasta_base: Path,
    sql_path: Path,
    chunk_size: int,
    max_chunks: int,
) -> Tuple[int, int]:
    fasta_base.parent.mkdir(parents=True, exist_ok=True)
    sql_lines = ["SET autocommit = 0;", "start transaction;"]

    seq_items = list(uniq.items())
    seq_count = len(seq_items)
    chunk_count = 0
    chunk_lines: List[str] = []

    for idx, (sequence, labels) in enumerate(seq_items, start=1):
        seq_id = idx
        header = f">{seq_id};{labels}"
        chunk_lines.append(f"{header}\n{sequence}\n")

        for label in labels.split(";"):
            parts = label.split()
            if len(parts) == 3:
                sql_lines.append(
                    "INSERT IGNORE INTO `ensembl_entry`"
                    f"(`ENSEMBL_ID`,`ENSEMBL_GENE`,`ENSEMBL_TRANSCRIPT`,`SEQ_ID`) "
                    f"VALUES('{parts[0]}', '{parts[1]}', '{parts[2]}', '{seq_id}');"
                )
            elif len(parts) >= 2:
                iso_parts = parts[0].split("_")
                if len(iso_parts) == 2:
                    uid, iso = iso_parts
                else:
                    uid, iso = parts[0], "1"
                name = parts[1].replace("'", "''")
                sql_lines.append(
                    "INSERT IGNORE INTO `uniprot_entry`"
                    f"(`UNIPROT_ID_ISO`,`UNIPROT_ID`,`NAME`,`ISOFORM`,`SEQ_ID`) "
                    f"VALUES('{parts[0]}', '{uid}', '{name}', '{iso}', '{seq_id}');"
                )
            sql_lines.append(f"INSERT IGNORE INTO `seq_entry`(`SEQ_ID`) VALUES('{seq_id}');")

        if idx % chunk_size == 0:
            Path(f"{fasta_base}.{chunk_count}").write_text("".join(chunk_lines), encoding="utf-8")
            chunk_lines = []
            chunk_count += 1
            if max_chunks and chunk_count >= max_chunks:
                break

        if max_chunks and chunk_count >= max_chunks and idx % chunk_size != 0:
            break

    if chunk_lines and (not max_chunks or chunk_count < max_chunks):
        Path(f"{fasta_base}.{chunk_count}").write_text("".join(chunk_lines), encoding="utf-8")
        chunk_count += 1

    processed = min(seq_count, (max_chunks * chunk_size) if max_chunks else seq_count)
    with fasta_base.open("w", encoding="utf-8", newline="\n") as combined:
        for i in range(min(processed, seq_count)):
            sequence, labels = seq_items[i]
            combined.write(f">{i + 1};{labels}\n{sequence}\n")

    sql_lines.append("commit;")
    sql_path.write_text("\n".join(sql_lines) + "\n", encoding="utf-8")
    return chunk_count, processed


def write_manifest(
    manifest_path: Path,
    chunk_count: int,
    pdb_fasta_count: int,
    seq_count: int,
    paths: dict,
) -> None:
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    chunks = []
    for i in range(chunk_count):
        chunks.append(
            {
                "index": i,
                "query_fasta": f"{paths['gene_fasta']}.{i}",
                "xml": f"{paths['results_dir']}/chunk-{i:04d}.xml",
                "sql": f"{paths['results_dir']}/chunk-{i:04d}.sql",
                "status": "pending",
            }
        )
    manifest = {
        "version": 1,
        "pipeline": "blast",
        "pdb_fasta_entries": pdb_fasta_count,
        "gene_seq_count": seq_count,
        "chunk_count": chunk_count,
        "chunks": chunks,
        "paths": paths,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inputs-dir", type=Path, required=True)
    parser.add_argument("--workspace", type=Path, required=True)
    parser.add_argument("--state-dir", type=Path, required=True)
    parser.add_argument("--results-dir", type=Path, required=True)
    parser.add_argument("--chunk-size", type=int, default=10000)
    parser.add_argument("--max-gene-chunks", type=int, default=0)
    parser.add_argument("--max-pdb-seqres-lines", type=int, default=0)
    args = parser.parse_args()

    pdb_gz = args.inputs_dir / "pdb_seqres.txt.gz"
    ensembl_gz = args.inputs_dir / "Homo_sapiens.GRCh38.pep.all.fa.gz"
    swissprot_gz = args.inputs_dir / "uniprot_sprot.fasta.gz"
    isoform_gz = args.inputs_dir / "uniprot_sprot_varsplic.fasta.gz"

    for p in (pdb_gz, ensembl_gz, swissprot_gz, isoform_gz):
        if not p.exists():
            raise FileNotFoundError(p)

    args.workspace.mkdir(parents=True, exist_ok=True)
    args.state_dir.mkdir(parents=True, exist_ok=True)
    args.results_dir.mkdir(parents=True, exist_ok=True)

    pdb_txt = args.workspace / "pdb_seqres.txt"
    pdb_fasta = args.workspace / "pdb_seqres.fasta"
    gene_fasta = args.workspace / "geneseq.fasta"
    insert_sql = args.workspace / "insert_Sequence.sql"
    manifest = args.state_dir / "manifest.json"

    print("[1/4] Gunzip pdb_seqres...")
    gunzip_to(pdb_gz, pdb_txt)

    print("[2/4] pdb_seqres -> pdb_seqres.fasta (mol:protein)...")
    pdb_count = preprocess_pdb_seqres(pdb_txt, pdb_fasta, args.max_pdb_seqres_lines)
    print(f"      kept {pdb_count} protein chains")

    print("[3/4] Gunzip reference proteomes...")
    ensembl_fa = args.workspace / "Homo_sapiens.GRCh38.pep.all.fa"
    swissprot_fa = args.workspace / "uniprot_sprot.fasta"
    isoform_fa = args.workspace / "uniprot_sprot_varsplic.fasta"
    gunzip_to(ensembl_gz, ensembl_fa)
    gunzip_to(swissprot_gz, swissprot_fa)
    gunzip_to(isoform_gz, isoform_fa)

    print("[4/4] Merge + dedupe reference sequences...")
    acc_map = get_uniprot_acc_map(swissprot_fa)
    uniq: Dict[str, str] = {}
    merge_uniprot(swissprot_fa, acc_map, uniq)
    merge_uniprot(isoform_fa, acc_map, uniq)
    merge_ensembl(ensembl_fa, uniq)
    chunk_count, seq_count = write_gene_fasta_and_sql(
        uniq, gene_fasta, insert_sql, args.chunk_size, args.max_gene_chunks
    )
    print(f"      {seq_count} unique sequences -> {chunk_count} chunk(s)")

    write_manifest(
        manifest,
        chunk_count,
        pdb_count,
        seq_count,
        {
            "pdb_fasta": str(pdb_fasta),
            "gene_fasta": str(gene_fasta),
            "insert_sequence_sql": str(insert_sql),
            "results_dir": str(args.results_dir),
        },
    )
    print(f"Manifest: {manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
