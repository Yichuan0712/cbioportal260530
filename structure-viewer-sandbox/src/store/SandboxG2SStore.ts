import { action, makeObservable, observable } from 'mobx';
import _ from 'lodash';
import PdbChainDataStore from 'shared/components/mutationMapper/PdbChainDataStore';
import MutationMapperDataStore from 'shared/components/mutationMapper/MutationMapperDataStore';
import ResidueMappingCache from 'shared/cache/ResidueMappingCache';
import PdbHeaderCache from 'shared/cache/PdbHeaderCache';
import LivePdbHeaderCache from 'shared/cache/LivePdbHeaderCache';
import {
    indexPdbAlignments,
    mergeIndexedPdbAlignments,
    PDB_IGNORELIST,
    sortMergedPdbChains,
} from 'shared/lib/PdbUtils';
import { Alignment, VariantAnnotation } from 'genome-nexus-ts-api-client';
import { Mutation } from 'cbioportal-ts-api-client';
import { fetchAlignmentsByEnsembl } from '../api/g2sApi';
import { fetchCanonicalTranscriptByHugoSymbol } from '../api/genomeNexusApi';
import { fetchGeneByHugoSymbol, fetchMutationsForGene } from '../api/cbioportalApi';
import { fetchVariantAnnotationsIndexedByGenomicLocation } from '../api/variantAnnotationApi';
import {
    groupMutationsByProteinStart,
    countMutationsInRange,
} from '../api/mutationUtils';
import {
    SANDBOX_HUGO_GENE,
    SANDBOX_PREFERRED_PDB,
    USE_MOCK_G2S_DATA,
    USE_MOCK_MUTATIONS,
} from '../api/sandboxApiConfig';
import {
    MOCK_ALIGNMENT_INDEX,
    MOCK_MUTATIONS,
    MOCK_UNIPROT_ID,
    MOCK_VARIANT_ANNOTATIONS,
    PDB_HEADER_MOCK,
    PDB_MOCK_CHAIN,
} from '../mocks/fixtures';
import { PdbAlignmentIndex } from 'shared/model/Pdb';

export type SandboxLoadStatus = 'idle' | 'pending' | 'complete' | 'error';

function createMockMutationStore() {
    return new MutationMapperDataStore(MOCK_MUTATIONS);
}

function createMockPdbStores() {
    const pdbChainDataStore = new PdbChainDataStore([PDB_MOCK_CHAIN]);
    pdbChainDataStore.selectFirstChain();
    return {
        pdbChainDataStore,
        pdbAlignmentIndex: MOCK_ALIGNMENT_INDEX,
        uniprotId: MOCK_UNIPROT_ID,
        pdbHeaderCache: new PdbHeaderCache({ '1p98': PDB_HEADER_MOCK }),
    };
}

export default class SandboxG2SStore {
    @observable status: SandboxLoadStatus = 'idle';
    @observable errorMessage: string | null = null;
    @observable uniprotId: string = MOCK_UNIPROT_ID;
    @observable ensemblTranscriptId: string = '';
    @observable mutationCount: number = 0;
    @observable mappedMutationCount: number = 0;

    @observable.ref pdbChainDataStore: PdbChainDataStore;
    @observable.ref mutationDataStore: MutationMapperDataStore;
    readonly residueMappingCache: ResidueMappingCache;
    readonly pdbHeaderCache: PdbHeaderCache | LivePdbHeaderCache;

    @observable.ref pdbAlignmentIndex: PdbAlignmentIndex = MOCK_ALIGNMENT_INDEX;
    @observable.ref indexedVariantAnnotations: {
        [genomicLocation: string]: VariantAnnotation;
    } = MOCK_VARIANT_ANNOTATIONS;

    constructor() {
        makeObservable(this);
        const mockPdb = createMockPdbStores();
        this.pdbChainDataStore = mockPdb.pdbChainDataStore;
        this.pdbAlignmentIndex = mockPdb.pdbAlignmentIndex;
        this.uniprotId = mockPdb.uniprotId;
        this.mutationDataStore = createMockMutationStore();
        this.residueMappingCache = new ResidueMappingCache();
        this.pdbHeaderCache = USE_MOCK_G2S_DATA
            ? mockPdb.pdbHeaderCache
            : new LivePdbHeaderCache();
    }

    async initialize(): Promise<void> {
        if (USE_MOCK_G2S_DATA && USE_MOCK_MUTATIONS) {
            this.status = 'complete';
            this.mutationCount = _.flatten(MOCK_MUTATIONS).length;
            return;
        }

        this.status = 'pending';
        this.errorMessage = null;

        try {
            let transcriptId = '';
            let uniprotId = MOCK_UNIPROT_ID;

            if (!USE_MOCK_G2S_DATA) {
                const transcript = await fetchCanonicalTranscriptByHugoSymbol(
                    SANDBOX_HUGO_GENE
                );
                transcriptId = transcript.transcriptId;
                uniprotId = transcript.uniprotId;
                this.ensemblTranscriptId = transcriptId;
                this.uniprotId = uniprotId;

                const alignments = await fetchAlignmentsByEnsembl(transcriptId);
                if (!alignments || alignments.length === 0) {
                    this.pdbChainDataStore = new PdbChainDataStore([]);
                    this.pdbAlignmentIndex = {};
                } else {
                    this.applyAlignments(alignments);
                }
            }

            if (!USE_MOCK_MUTATIONS) {
                await this.loadMutations(uniprotId);
            }

            this.status = 'complete';
        } catch (error) {
            this.status = 'error';
            this.errorMessage =
                error instanceof Error ? error.message : String(error);
        }
    }

    @action
    private async loadMutations(_uniprotId: string) {
        const gene = await fetchGeneByHugoSymbol(SANDBOX_HUGO_GENE);
        const rawMutations = await fetchMutationsForGene(gene.entrezGeneId);
        this.mutationCount = rawMutations.length;

        try {
            this.indexedVariantAnnotations =
                await fetchVariantAnnotationsIndexedByGenomicLocation(
                    rawMutations
                );
        } catch (error) {
            console.warn('Variant annotation fetch failed:', error);
            this.indexedVariantAnnotations = {};
        }

        const chain =
            this.pdbChainDataStore.selectedChain ||
            this.pdbChainDataStore.allData[0];
        const grouped = groupMutationsByProteinStart(rawMutations);

        this.mappedMutationCount = chain
            ? countMutationsInRange(rawMutations, chain)
            : 0;

        this.mutationDataStore = new MutationMapperDataStore(grouped);
    }

    @action
    private applyAlignments(alignments: Alignment[]) {
        const indexed = indexPdbAlignments(alignments);
        this.pdbAlignmentIndex = indexed;

        const chains = sortMergedPdbChains(
            mergeIndexedPdbAlignments(indexed).filter(
                chain => !PDB_IGNORELIST.includes(chain.pdbId.toLowerCase())
            )
        );

        if (chains.length === 0) {
            throw new Error(
                'No usable PDB chains after merging G2S alignments'
            );
        }

        const store = new PdbChainDataStore(chains);
        if (SANDBOX_PREFERRED_PDB) {
            const preferred = chains.find(
                c => c.pdbId.toLowerCase() === SANDBOX_PREFERRED_PDB
            );
            if (preferred) {
                store.selectUid(store.getChainUid(preferred));
            } else {
                store.selectFirstChain();
            }
        } else {
            store.selectFirstChain();
        }
        this.pdbChainDataStore = store;
    }
}

export const sandboxG2SStore = new SandboxG2SStore();
