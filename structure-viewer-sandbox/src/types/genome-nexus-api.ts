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
    refseqMrnaId?: string;
    ccdsId?: string;
    geneId?: string;
    proteinId?: string;
    hugoSymbols?: string[];
}

export interface GenomicLocation {
    chromosome: string;
    start: number;
    end: number;
    referenceAllele: string;
    variantAllele: string;
}

export interface TranscriptConsequenceSummary {
    hgvsc?: string;
    hgvsp?: string;
    hgvspShort?: string;
    consequenceTerms?: string;
    siftPrediction?: string;
    siftScore?: number;
    polyphenPrediction?: string;
    polyphenScore?: number;
    hugoGeneSymbol?: string;
}

export interface VariantAnnotationSummary {
    transcriptConsequenceSummary?: TranscriptConsequenceSummary;
    variantType?: string;
}

export interface MutationAssessor {
    functionalImpactPrediction?: string;
    functionalImpactScore?: number;
    hgvspShort?: string;
}

export interface HotspotAnnotation {
    annotation?: Array<{ hugoSymbol?: string; transcriptId?: string }>;
}

export interface Hotspot {
    type: string;
    proteinPosStart?: number;
    proteinPosEnd?: number;
    hugoSymbol?: string;
    transcriptId?: string;
}

export interface AggregatedHotspots {
    genomicLocation: GenomicLocation;
    hotspots: Hotspot[];
    variant?: string;
}

export type IHotspotIndex = {
    [genomicLocation: string]: AggregatedHotspots;
};

export interface IndicatorQueryResp {
    oncogenic?: string;
}

export interface OncokbAnnotation {
    annotation?: IndicatorQueryResp;
    license?: string;
}

export interface ClinvarAnnotation {
    annotation?: {
        clinvarEntries?: Array<{
            clinicalSignificance?: string;
            title?: string;
        }>;
    };
}

export interface VariantAnnotation {
    allele_string?: string;
    annotation_summary?: VariantAnnotationSummary;
    clinvar?: ClinvarAnnotation;
    hotspots?: HotspotAnnotation;
    oncokb?: OncokbAnnotation;
    mutation_assessor?: MutationAssessor;
    originalVariantQuery?: string;
    seq_region_name?: string;
    start?: number;
    end?: number;
    hgvsg?: string;
    successfully_annotated?: boolean;
}
