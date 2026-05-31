export interface ResidueMapping {
    queryPosition: number;
    pdbPosition: number;
    queryAminoAcid?: string;
    pdbAminoAcid?: string;
    insertion?: string | null;
}

export interface Alignment {
    alignmentId: number;
    pdbId: string;
    chain: string;
    uniprotStart?: number;
    uniprotEnd?: number;
    seqFrom?: number;
    seqTo?: number;
    pdbFrom?: number;
    pdbTo?: number;
    seqAlign?: string;
    pdbAlign?: string;
    midlineAlign?: string;
    identity?: number;
    identityPositive?: number;
    residueMapping?: ResidueMapping[];
}

export interface PdbHeader {
    pdbId: string;
    title: string;
    compound?: Array<{
        chain?: string[];
        molecule?: string;
    }>;
}

export interface EnsemblTranscript {
    uniprotId: string;
    transcriptId: string;
    transcriptIdVersion?: string;
    geneId?: string;
    proteinId?: string;
    hugoSymbols?: string[];
}
