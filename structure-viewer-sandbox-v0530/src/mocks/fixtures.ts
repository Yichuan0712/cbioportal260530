import { Alignment, PdbHeader, ResidueMapping } from 'genome-nexus-ts-api-client';
import { Mutation } from 'cbioportal-ts-api-client';
import { IPdbChain, PdbAlignmentIndex } from 'shared/model/Pdb';

/** BRCA1 UniProt accession used in mock mapping queries */
export const MOCK_UNIPROT_ID = 'P38398';

/** PDB structure from the cBioPortal screenshot (BRCA1 BRCT domain) */
export const PDB_4U4A_CHAIN: IPdbChain = {
    pdbId: '4u4a',
    chain: 'A',
    uniprotStart: 1640,
    uniprotEnd: 1863,
    alignment: '',
    identityPerc: 98,
    identity: 224,
};

export const PDB_HEADER_4U4A: PdbHeader = {
    pdbId: '4u4a',
    title: 'complex structure of brca1 brct with singly phospho abraxas',
    compound: [
        {
            chain: ['a'],
            molecule: 'breast cancer type 1 susceptibility protein',
        },
    ],
};

export const MOCK_ALIGNMENTS: Alignment[] = [
    {
        alignmentId: 1,
        pdbId: '4u4a',
        chain: 'A',
        uniprotStart: 1640,
        uniprotEnd: 1863,
    },
];

export const MOCK_ALIGNMENT_INDEX: PdbAlignmentIndex = {
    '4u4a': {
        A: MOCK_ALIGNMENTS,
    },
};

/** Sample mutations within the 4u4a alignment range */
export const MOCK_MUTATIONS: Mutation[][] = [
    [
        {
            proteinPosStart: 1700,
            proteinPosEnd: 1700,
            mutationType: 'Missense_Mutation',
            gene: { hugoGeneSymbol: 'BRCA1' },
        },
    ],
    [
        {
            proteinPosStart: 1750,
            proteinPosEnd: 1750,
            mutationType: 'Frame_Shift_Del',
            gene: { hugoGeneSymbol: 'BRCA1' },
        },
    ],
];

/**
 * Empty by default to reproduce the screenshot warning:
 * "None of the mutations can be mapped onto this structure"
 *
 * Set SANDBOX_RESIDUE_MAPPINGS in App.tsx to SAMPLE_RESIDUE_MAPPINGS to demo colored mutations.
 */
export const SAMPLE_RESIDUE_MAPPINGS: ResidueMapping[] = [
    { queryPosition: 1700, pdbPosition: 45 },
    { queryPosition: 1750, pdbPosition: 95 },
];

export const EMPTY_RESIDUE_MAPPINGS: ResidueMapping[] = [];
