import { action, makeObservable, observable, runInAction } from 'mobx';
import _ from 'lodash';
import PdbChainDataStore from 'shared/components/mutationMapper/PdbChainDataStore';
import MutationMapperDataStore from 'shared/components/mutationMapper/MutationMapperDataStore';
import SandboxMutationMapperFilterApplier from 'shared/components/mutationMapper/SandboxMutationMapperFilterApplier';
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
import { fetchUniprotEntryNameForGene } from '../api/geneAnnotationApi';
import { fetchGeneByHugoSymbol, fetchMutationsForGene, fetchMutationMolecularProfilesForStudies, fetchSamplesForStudies } from '../api/cbioportalApi';
import { fetchVariantAnnotationsIndexedByGenomicLocation } from '../api/variantAnnotationApi';
import { fetchHotspotIndexForMutations } from '../api/hotspotApi';
import {
    groupMutationsByProteinStart,
    groupMutationsForMutationMapper,
    countMutationsInRange,
} from '../api/mutationUtils';
import {
    annotateMutationsWithPutativeDriver,
    isPutativeDriverMutation,
} from '../lib/putativeDriverUtils';
import { somaticMutationRate } from '../lib/mutationRateUtils';
import {
    SANDBOX_HUGO_GENE,
    SANDBOX_PREFERRED_PDB,
    CBIOPORTAL_STUDY_IDS,
    USE_MOCK_G2S_DATA,
    USE_MOCK_MUTATIONS,
} from '../api/sandboxApiConfig';
import {
    MOCK_ALIGNMENT_INDEX,
    MOCK_CCDS_ID,
    MOCK_ENSEMBL_TRANSCRIPT_ID,
    MOCK_ENSEMBL_TRANSCRIPT_VERSION,
    MOCK_MUTATIONS,
    MOCK_REFSEQ_MRNA_ID,
    MOCK_UNIPROT_ENTRY_NAME,
    MOCK_UNIPROT_ID,
    MOCK_VARIANT_ANNOTATIONS,
    PDB_HEADER_MOCK,
    PDB_MOCK_CHAIN,
} from '../mocks/fixtures';
import { PdbAlignmentIndex } from 'shared/model/Pdb';

export type SandboxLoadStatus = 'idle' | 'pending' | 'complete' | 'error';

function createMockMutationStore(
    indexedVariantAnnotations: {
        [genomicLocation: string]: VariantAnnotation;
    } = MOCK_VARIANT_ANNOTATIONS
) {
    const flatMutations = _.flatten(MOCK_MUTATIONS);
    const annotated = annotateMutationsWithPutativeDriver(
        flatMutations,
        indexedVariantAnnotations,
        {}
    );
    const grouped = groupMutationsByProteinStart(annotated);

    return new MutationMapperDataStore(
        grouped,
        new SandboxMutationMapperFilterApplier(isPutativeDriverMutation)
    );
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
    @observable uniprotEntryName: string = MOCK_UNIPROT_ENTRY_NAME;
    @observable ensemblTranscriptId: string = MOCK_ENSEMBL_TRANSCRIPT_ID;
    @observable ensemblTranscriptVersion: string = MOCK_ENSEMBL_TRANSCRIPT_VERSION;
    @observable refseqMrnaId: string = MOCK_REFSEQ_MRNA_ID;
    @observable ccdsId: string = MOCK_CCDS_ID;
    @observable mutationCount: number = 0;
    @observable mappedMutationCount: number = 0;
    @observable somaticMutationRatePercent: number | null = null;

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

    @action.bound
    async initialize(): Promise<void> {
        if (USE_MOCK_G2S_DATA && USE_MOCK_MUTATIONS) {
            this.mutationCount = _.flatten(MOCK_MUTATIONS).length;
            this.status = 'complete';
            return;
        }

        this.status = 'pending';
        this.errorMessage = null;

        try {
            const gene = await fetchGeneByHugoSymbol(SANDBOX_HUGO_GENE);

            let transcriptId = this.ensemblTranscriptId;
            let uniprotId = this.uniprotId;

            if (!USE_MOCK_G2S_DATA) {
                const [transcript, uniprotEntryName] = await Promise.all([
                    fetchCanonicalTranscriptByHugoSymbol(SANDBOX_HUGO_GENE),
                    fetchUniprotEntryNameForGene(gene.entrezGeneId),
                ]);
                transcriptId = transcript.transcriptId;
                uniprotId = transcript.uniprotId;

                runInAction(() => {
                    this.ensemblTranscriptId = transcript.transcriptId;
                    this.ensemblTranscriptVersion =
                        transcript.transcriptIdVersion || '';
                    this.refseqMrnaId = transcript.refseqMrnaId || '';
                    this.ccdsId = transcript.ccdsId || '';
                    this.uniprotId = uniprotId;
                    this.uniprotEntryName = uniprotEntryName;
                });

                const alignments = await fetchAlignmentsByEnsembl(transcriptId);
                runInAction(() => {
                    if (!alignments || alignments.length === 0) {
                        this.pdbChainDataStore = new PdbChainDataStore([]);
                        this.pdbAlignmentIndex = {};
                    } else {
                        this.applyAlignments(alignments);
                    }
                });
            } else {
                const uniprotEntryName = await fetchUniprotEntryNameForGene(
                    gene.entrezGeneId
                );
                runInAction(() => {
                    this.uniprotEntryName = uniprotEntryName;
                });
            }

            if (!USE_MOCK_MUTATIONS) {
                await this.loadMutations(gene, uniprotId);
            }

            runInAction(() => {
                this.status = 'complete';
            });
        } catch (error) {
            runInAction(() => {
                this.status = 'error';
                this.errorMessage =
                    error instanceof Error ? error.message : String(error);
            });
        }
    }

    private async loadMutations(
        gene: Awaited<ReturnType<typeof fetchGeneByHugoSymbol>>,
        _uniprotId: string
    ) {
        const [rawMutations, molecularProfiles, cohortSamples] =
            await Promise.all([
                fetchMutationsForGene(gene.entrezGeneId),
                fetchMutationMolecularProfilesForStudies(CBIOPORTAL_STUDY_IDS),
                fetchSamplesForStudies(CBIOPORTAL_STUDY_IDS),
            ]);

        let indexedVariantAnnotations: {
            [genomicLocation: string]: VariantAnnotation;
        } = {};
        let hotspotIndex = {};
        try {
            [indexedVariantAnnotations, hotspotIndex] = await Promise.all([
                fetchVariantAnnotationsIndexedByGenomicLocation(rawMutations),
                fetchHotspotIndexForMutations(rawMutations),
            ]);
        } catch (error) {
            console.warn('Mutation annotation fetch failed:', error);
            try {
                indexedVariantAnnotations =
                    await fetchVariantAnnotationsIndexedByGenomicLocation(
                        rawMutations
                    );
            } catch (innerError) {
                console.warn('Variant annotation fetch failed:', innerError);
            }
            try {
                hotspotIndex = await fetchHotspotIndexForMutations(
                    rawMutations
                );
            } catch (innerError) {
                console.warn('Hotspot annotation fetch failed:', innerError);
            }
        }

        const annotatedMutations = annotateMutationsWithPutativeDriver(
            rawMutations,
            indexedVariantAnnotations,
            hotspotIndex
        );

        const chain =
            this.pdbChainDataStore.selectedChain ||
            this.pdbChainDataStore.allData[0];
        const grouped = groupMutationsForMutationMapper(annotatedMutations);
        const mappedMutationCount = chain
            ? countMutationsInRange(annotatedMutations, chain)
            : 0;
        const mutationDataStore = new MutationMapperDataStore(
            grouped,
            new SandboxMutationMapperFilterApplier(isPutativeDriverMutation)
        );
        const profileMap = _.keyBy(
            molecularProfiles,
            profile => profile.molecularProfileId
        );
        const rate = somaticMutationRate(
            SANDBOX_HUGO_GENE,
            annotatedMutations,
            profileMap,
            cohortSamples
        );

        runInAction(() => {
            this.mutationCount = annotatedMutations.length;
            this.indexedVariantAnnotations = indexedVariantAnnotations;
            this.mappedMutationCount = mappedMutationCount;
            this.mutationDataStore = mutationDataStore;
            this.somaticMutationRatePercent = rate;
        });
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
                console.warn(
                    `[sandbox] Preferred PDB ${SANDBOX_PREFERRED_PDB} not in G2S alignments for ${SANDBOX_HUGO_GENE}; using top-ranked chain (${chains[0]?.pdbId}).`
                );
                store.selectFirstChain();
            }
        } else {
            store.selectFirstChain();
        }
        this.pdbChainDataStore = store;
    }
}

export const sandboxG2SStore = new SandboxG2SStore();
