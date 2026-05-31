import { Alignment, PdbHeader, ResidueMapping } from 'genome-nexus-ts-api-client';
import { Mutation } from 'cbioportal-ts-api-client';
import { IPdbChain, PdbAlignmentIndex } from 'shared/model/Pdb';

/** SOX9 — matches screenshot transcript NM_000346 / ENST00000245479 */
export const MOCK_UNIPROT_ID = 'P48436';

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
    title: 'mock sox9 structure entry',
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
            mutationType: 'Missense_Mutation',
            gene: { hugoGeneSymbol: 'SOX9', entrezGeneId: 6662 },
        },
    ],
    [
        {
            proteinPosStart: 320,
            proteinPosEnd: 320,
            mutationType: 'Frame_Shift_Del',
            gene: { hugoGeneSymbol: 'SOX9', entrezGeneId: 6662 },
        },
    ],
];

export const EMPTY_RESIDUE_MAPPINGS: ResidueMapping[] = [];
