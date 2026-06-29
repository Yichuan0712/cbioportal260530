import { Alignment, PdbHeader, ResidueMapping, VariantAnnotation } from 'genome-nexus-ts-api-client';
import { Mutation } from 'cbioportal-ts-api-client';
import { IPdbChain, PdbAlignmentIndex } from 'shared/model/Pdb';
import { PUTATIVE_DRIVER } from '../lib/putativeDriverUtils';

/** SOX9 — official demo: NM_000346 / ENST00000245479.2 / CCDS11689 / SOX9_HUMAN / P48436 */
export const MOCK_UNIPROT_ID = 'P48436';
export const MOCK_REFSEQ_MRNA_ID = 'NM_000346';
export const MOCK_ENSEMBL_TRANSCRIPT_ID = 'ENST00000245479';
export const MOCK_ENSEMBL_TRANSCRIPT_VERSION = '2';
export const MOCK_CCDS_ID = 'CCDS11689';
export const MOCK_UNIPROT_ENTRY_NAME = 'SOX9_HUMAN';

export const PDB_MOCK_CHAIN: IPdbChain = {
    pdbId: '1p98',
    chain: 'A',
    uniprotStart: 200,
    uniprotEnd: 400,
    alignment: '',
    identityPerc: 95,
    identity: 150,
};

export const PDB_HEADER_MOCK: PdbHeader = {
    pdbId: '1p98',
    title: 'mock structure entry (may differ from live G2S top chain)',
    compound: [{ chain: ['a'], molecule: 'sox9' }],
};

export const MOCK_ALIGNMENT_INDEX: PdbAlignmentIndex = {
    '1p98': {
        A: [
            {
                alignmentId: 1,
                pdbId: '1p98',
                chain: 'A',
                uniprotStart: 200,
                uniprotEnd: 400,
            },
        ],
    },
};

export const MOCK_MUTATIONS: Mutation[][] = [
    [
        {
            proteinPosStart: 280,
            proteinPosEnd: 280,
            proteinChange: 'p.R280Q',
            mutationType: 'Missense_Mutation',
            chr: '17',
            startPosition: 70117528,
            endPosition: 70117528,
            referenceAllele: 'G',
            variantAllele: 'A',
            gene: { hugoGeneSymbol: 'SOX9', entrezGeneId: 6662 },
            driverFilter: PUTATIVE_DRIVER,
            driverFilterAnnotation: 'Putative Driver',
        },
    ],
    [
        {
            proteinPosStart: 320,
            proteinPosEnd: 320,
            proteinChange: 'p.K320fs',
            mutationType: 'Frame_Shift_Del',
            chr: '17',
            startPosition: 70117648,
            endPosition: 70117648,
            referenceAllele: 'T',
            variantAllele: '-',
            gene: { hugoGeneSymbol: 'SOX9', entrezGeneId: 6662 },
        },
    ],
];

export const MOCK_VARIANT_ANNOTATIONS: {
    [genomicLocation: string]: VariantAnnotation;
} = {
    '17,70117528,70117528,G,A': {
        originalVariantQuery: '17,70117528,70117528,G,A',
        allele_string: 'G/A',
        seq_region_name: '17',
        start: 70117528,
        end: 70117528,
        hgvsg: '17:g.70117528G>A',
        annotation_summary: {
            transcriptConsequenceSummary: {
                hgvsp: 'p.Arg280Gln',
                hgvspShort: 'p.R280Q',
                hgvsc: 'c.839G>A',
                consequenceTerms: 'missense_variant',
                siftPrediction: 'deleterious',
                siftScore: 0.01,
                polyphenPrediction: 'probably_damaging',
                polyphenScore: 0.98,
            },
        },
        mutation_assessor: {
            functionalImpactPrediction: 'medium',
            functionalImpactScore: 2.1,
            hgvspShort: 'R280Q',
        },
        hotspots: {
            annotation: [{ hugoSymbol: 'SOX9', transcriptId: 'ENST00000245479' }],
        },
        oncokb: {
            annotation: { oncogenic: 'Likely Oncogenic' },
        },
        clinvar: {
            annotation: {
                clinvarEntries: [
                    {
                        clinicalSignificance: 'Uncertain significance',
                    },
                ],
            },
        },
    },
    '17,70117648,70117648,T,-': {
        originalVariantQuery: '17,70117648,70117648,T,-',
        allele_string: 'T/-',
        seq_region_name: '17',
        start: 70117648,
        end: 70117648,
        annotation_summary: {
            transcriptConsequenceSummary: {
                hgvsp: 'p.Lys320Ter',
                hgvspShort: 'p.K320fs',
                hgvsc: 'c.958del',
                consequenceTerms: 'frameshift_variant',
            },
        },
        mutation_assessor: {
            functionalImpactPrediction: 'high',
            functionalImpactScore: 3.5,
            hgvspShort: 'K320fs',
        },
    },
};

export const EMPTY_RESIDUE_MAPPINGS: ResidueMapping[] = [];
