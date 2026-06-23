#!/usr/bin/env python3
"""Prepare DIAMOND-ready FASTA inputs from local G2S alignment downloads.

The script intentionally avoids the legacy Java/MySQL pipeline. It creates two
sets of files:

  A_pdb_structures/       PDB structure-derived protein segment FASTA + mapping
  B_reference_sequences/  deduplicated Ensembl/UniProt protein FASTA + mapping

Only Python's standard library is required.
"""

from __future__ import annotations

import argparse
import gzip
import re
from collections import OrderedDict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional, Sequence, TextIO, Tuple


AA3_TO_1 = {
    "ALA": "A",
    "ARG": "R",
    "ASN": "N",
    "ASP": "D",
    "CYS": "C",
    "GLN": "Q",
    "GLU": "E",
    "GLY": "G",
    "HIS": "H",
    "ILE": "I",
    "LEU": "L",
    "LYS": "K",
    "MET": "M",
    "PHE": "F",
    "PRO": "P",
    "SER": "S",
    "THR": "T",
    "TRP": "W",
    "TYR": "Y",
    "VAL": "V",
    # Common non-standard protein residues.
    "MSE": "M",
    "SEC": "U",
    "PYL": "O",
    "ASX": "B",
    "GLX": "Z",
    "UNK": "X",
}


def write_fasta_record(handle: TextIO, header: str, sequence: str, width: int = 80) -> None:
    handle.write(f">{header}\n")
    for i in range(0, len(sequence), width):
        handle.write(sequence[i : i + width] + "\n")


def parse_fasta_gz(path: Path) -> Iterator[Tuple[str, str]]:
    header: Optional[str] = None
    chunks: List[str] = []
    with gzip.open(path, "rt", encoding="utf-8", errors="replace") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line:
                continue
            if line.startswith(">"):
                if header is not None:
                    yield header, "".join(chunks).upper()
                header = line[1:]
                chunks = []
            else:
                chunks.append(line)
        if header is not None:
            yield header, "".join(chunks).upper()


def clean_sequence(sequence: str) -> str:
    return re.sub(r"[^A-Z*]", "", sequence.upper()).replace("*", "")


def tsv(value: object) -> str:
    return str(value).replace("\t", " ").replace("\r", " ").replace("\n", " ")


def parse_key_value(header: str, key: str) -> str:
    match = re.search(rf"(?:^|\s){re.escape(key)}:([^\s]+)", header)
    return match.group(1) if match else ""


def parse_ensembl_header(header: str) -> Tuple[str, str, str, str]:
    fields = header.split()
    ensembl_id = fields[0] if fields else ""
    gene = parse_key_value(header, "gene")
    transcript = parse_key_value(header, "transcript")
    gene_symbol = parse_key_value(header, "gene_symbol")
    return ensembl_id, gene, transcript, gene_symbol


def parse_uniprot_header(header: str) -> Tuple[str, str, str, str, str]:
    first = header.split()[0] if header.split() else ""
    parts = first.split("|")
    accession = parts[1] if len(parts) > 1 else first
    entry_name = parts[2] if len(parts) > 2 else ""
    if "-" in accession:
        uniprot_id, isoform = accession.split("-", 1)
    else:
        uniprot_id, isoform = accession, "1"
    organism = ""
    match = re.search(r"\bOS=(.*?)(?:\sOX=|\sGN=|\sPE=|\sSV=|$)", header)
    if match:
        organism = match.group(1)
    return accession, uniprot_id, entry_name, isoform, organism


def prepare_reference_sequences(inputs_dir: Path, output_dir: Path, chunk_size: int) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    chunks_dir = output_dir / "chunks"
    chunks_dir.mkdir(parents=True, exist_ok=True)

    ensembl_path = inputs_dir / "Homo_sapiens.GRCh38.pep.all.fa.gz"
    swissprot_path = inputs_dir / "uniprot_sprot.fasta.gz"
    isoform_path = inputs_dir / "uniprot_sprot_varsplic.fasta.gz"
    required = [ensembl_path, swissprot_path, isoform_path]
    missing = [str(p) for p in required if not p.exists()]
    if missing:
        raise FileNotFoundError("Missing reference FASTA inputs: " + ", ".join(missing))

    seq_to_id: "OrderedDict[str, int]" = OrderedDict()
    seq_source_counts: Dict[int, int] = {}

    def get_seq_id(sequence: str) -> int:
        existing = seq_to_id.get(sequence)
        if existing is not None:
            seq_source_counts[existing] += 1
            return existing
        seq_id = len(seq_to_id) + 1
        seq_to_id[sequence] = seq_id
        seq_source_counts[seq_id] = 1
        return seq_id

    with (
        (output_dir / "ensembl_mapping.tsv").open("w", encoding="utf-8", newline="\n") as ensembl_out,
        (output_dir / "uniprot_mapping.tsv").open("w", encoding="utf-8", newline="\n") as uniprot_out,
    ):
        ensembl_out.write(
            "seq_id\tensembl_id\tensembl_gene\tensembl_transcript\tgene_symbol\toriginal_header\n"
        )
        uniprot_out.write(
            "seq_id\tuniprot_id_iso\tuniprot_id\tentry_name\tisoform\torganism\toriginal_header\n"
        )

        for header, raw_sequence in parse_fasta_gz(ensembl_path):
            sequence = clean_sequence(raw_sequence)
            if not sequence:
                continue
            seq_id = get_seq_id(sequence)
            ensembl_id, gene, transcript, gene_symbol = parse_ensembl_header(header)
            ensembl_out.write(
                "\t".join(map(tsv, [seq_id, ensembl_id, gene, transcript, gene_symbol, header])) + "\n"
            )

        for source_path in [swissprot_path, isoform_path]:
            for header, raw_sequence in parse_fasta_gz(source_path):
                sequence = clean_sequence(raw_sequence)
                if not sequence:
                    continue
                seq_id = get_seq_id(sequence)
                accession, uniprot_id, entry_name, isoform, organism = parse_uniprot_header(header)
                uniprot_out.write(
                    "\t".join(map(tsv, [seq_id, accession, uniprot_id, entry_name, isoform, organism, header]))
                    + "\n"
                )

    fasta_path = output_dir / "gene_sequences.fasta"
    with (
        fasta_path.open("w", encoding="utf-8", newline="\n") as fasta_out,
        (output_dir / "seq_mapping.tsv").open("w", encoding="utf-8", newline="\n") as seq_out,
    ):
        seq_out.write("seq_id\tlength\tsource_count\n")
        chunk_index = -1
        chunk_out: Optional[TextIO] = None
        try:
            for sequence, seq_id in seq_to_id.items():
                if (seq_id - 1) % chunk_size == 0:
                    if chunk_out is not None:
                        chunk_out.close()
                    chunk_index += 1
                    chunk_out = (chunks_dir / f"gene_sequences.{chunk_index}.fasta").open(
                        "w", encoding="utf-8", newline="\n"
                    )
                header = str(seq_id)
                write_fasta_record(fasta_out, header, sequence)
                if chunk_out is not None:
                    write_fasta_record(chunk_out, header, sequence)
                seq_out.write(f"{seq_id}\t{len(sequence)}\t{seq_source_counts[seq_id]}\n")
        finally:
            if chunk_out is not None:
                chunk_out.close()

    print(f"[B] Wrote {len(seq_to_id)} deduplicated reference sequences to {output_dir}")


@dataclass
class Residue:
    number: int
    insertion_code: str
    aa: str


@dataclass
class Segment:
    start: int
    end: int
    sequence: str


def parse_pdb_ca_residues(path: Path) -> Tuple[str, Dict[str, Dict[int, Residue]]]:
    pdb_id = path.name
    if pdb_id.startswith("pdb"):
        pdb_id = pdb_id[3:]
    if pdb_id.endswith(".ent.gz"):
        pdb_id = pdb_id[: -len(".ent.gz")]
    elif pdb_id.endswith(".gz"):
        pdb_id = pdb_id[: -len(".gz")]
    pdb_id = pdb_id[:4].lower()

    chains: Dict[str, Dict[int, Residue]] = {}
    with gzip.open(path, "rt", encoding="latin-1", errors="replace") as handle:
        for line in handle:
            if not (line.startswith("ATOM  ") or line.startswith("HETATM")):
                continue
            if len(line) < 27:
                continue
            atom_name = line[12:16].strip()
            if atom_name != "CA":
                continue
            alt_loc = line[16:17]
            if alt_loc not in (" ", "A", "1"):
                continue
            res_name = line[17:20].strip().upper()
            aa = AA3_TO_1.get(res_name)
            if aa is None:
                continue
            chain = line[21:22].strip() or "_"
            try:
                res_no = int(line[22:26].strip())
            except ValueError:
                continue
            insertion_code = line[26:27].strip()
            residues = chains.setdefault(chain, {})
            existing = residues.get(res_no)
            if existing is None or (existing.insertion_code and not insertion_code):
                residues[res_no] = Residue(res_no, insertion_code, aa)
    return pdb_id, chains


def build_segments(
    residues_by_number: Dict[int, Residue],
    min_multi_segment_length: int,
    min_single_segment_length: int,
    gap_threshold: int,
) -> List[Segment]:
    if not residues_by_number:
        return []

    sorted_numbers = sorted(residues_by_number)
    raw_segments: List[Segment] = []
    start = sorted_numbers[0]
    previous = sorted_numbers[0]
    for number in sorted_numbers[1:]:
        if number - previous > 1:
            sequence = "".join(residues_by_number[i].aa for i in sorted_numbers if start <= i <= previous)
            if previous - start >= min_multi_segment_length:
                raw_segments.append(Segment(start, previous, sequence))
            start = number
        previous = number

    sequence = "".join(residues_by_number[i].aa for i in sorted_numbers if start <= i <= previous)
    if previous - start >= min_single_segment_length:
        raw_segments.append(Segment(start, previous, sequence))

    if not raw_segments:
        return []

    merged = [raw_segments[0]]
    for segment in raw_segments[1:]:
        prior = merged[-1]
        gap = segment.start - prior.end - 1
        if gap <= gap_threshold:
            prior.sequence = prior.sequence + ("X" * gap) + segment.sequence
            prior.end = segment.end
        else:
            merged.append(segment)
    return merged


def iter_pdb_files(pdb_dir: Path) -> Iterator[Path]:
    yield from sorted(pdb_dir.rglob("*.ent.gz"))


def prepare_pdb_structure_sequences(
    inputs_dir: Path,
    output_dir: Path,
    limit: Optional[int],
    min_multi_segment_length: int,
    min_single_segment_length: int,
    gap_threshold: int,
) -> None:
    pdb_dir = inputs_dir / "pdb-coordinates"
    if not pdb_dir.exists():
        raise FileNotFoundError(f"Missing PDB coordinate directory: {pdb_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)

    fasta_path = output_dir / "pdb_segments.fasta"
    mapping_path = output_dir / "pdb_segments.tsv"

    pdb_files_seen = 0
    segment_count = 0
    with (
        fasta_path.open("w", encoding="utf-8", newline="\n") as fasta_out,
        mapping_path.open("w", encoding="utf-8", newline="\n") as mapping_out,
    ):
        mapping_out.write("pdb_no\tpdb_id\tchain\tpdb_seg\tseg_start\tseg_end\tsequence_length\tsource_file\n")
        for path in iter_pdb_files(pdb_dir):
            if limit is not None and pdb_files_seen >= limit:
                break
            pdb_files_seen += 1
            try:
                pdb_id, chains = parse_pdb_ca_residues(path)
            except OSError as exc:
                print(f"[A] Skipping unreadable gzip {path}: {exc}")
                continue

            for chain in sorted(chains):
                segments = build_segments(
                    chains[chain],
                    min_multi_segment_length=min_multi_segment_length,
                    min_single_segment_length=min_single_segment_length,
                    gap_threshold=gap_threshold,
                )
                for seg_index, segment in enumerate(segments, start=1):
                    pdb_no = f"{pdb_id}_{chain}_{seg_index}"
                    write_fasta_record(fasta_out, pdb_no, segment.sequence)
                    mapping_out.write(
                        "\t".join(
                            map(
                                tsv,
                                [
                                    pdb_no,
                                    pdb_id,
                                    chain,
                                    seg_index,
                                    segment.start,
                                    segment.end,
                                    len(segment.sequence),
                                    path,
                                ],
                            )
                        )
                        + "\n"
                    )
                    segment_count += 1

    print(f"[A] Wrote {segment_count} PDB structure segments from {pdb_files_seen} files to {output_dir}")


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--inputs-dir",
        type=Path,
        default=Path("latest-alignment-inputs"),
        help="Directory containing downloaded G2S inputs, relative to cwd by default.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("diamond-inputs"),
        help="Directory where DIAMOND-ready inputs will be written.",
    )
    parser.add_argument("--mode", choices=["all", "a", "b"], default="all")
    parser.add_argument("--chunk-size", type=int, default=10000, help="B FASTA records per chunk file.")
    parser.add_argument("--limit-pdb", type=int, default=None, help="Only process this many PDB files for testing.")
    parser.add_argument("--min-multi-segment-length", type=int, default=5)
    parser.add_argument("--min-single-segment-length", type=int, default=10)
    parser.add_argument("--gap-threshold", type=int, default=10)
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    inputs_dir = args.inputs_dir.resolve()
    output_dir = args.output_dir.resolve()

    if args.mode in ("all", "a"):
        prepare_pdb_structure_sequences(
            inputs_dir=inputs_dir,
            output_dir=output_dir / "A_pdb_structures",
            limit=args.limit_pdb,
            min_multi_segment_length=args.min_multi_segment_length,
            min_single_segment_length=args.min_single_segment_length,
            gap_threshold=args.gap_threshold,
        )

    if args.mode in ("all", "b"):
        prepare_reference_sequences(
            inputs_dir=inputs_dir,
            output_dir=output_dir / "B_reference_sequences",
            chunk_size=args.chunk_size,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
