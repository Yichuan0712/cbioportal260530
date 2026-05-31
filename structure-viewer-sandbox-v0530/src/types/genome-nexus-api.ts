export interface ResidueMapping {
    queryPosition: number;
    pdbPosition: number;
    insertion?: string | null;
}

export interface Alignment {
    alignmentId: number;
    pdbId: string;
    chain: string;
    uniprotStart?: number;
    uniprotEnd?: number;
}

export interface PdbHeader {
    pdbId: string;
    title: string;
    compound?: Array<{
        chain?: string[];
        molecule?: string;
    }>;
}
