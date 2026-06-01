import * as React from 'react';
import { Suspense, useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { DEFAULT_PROTEIN_IMPACT_TYPE_COLORS } from 'lib/proteinImpact';
import { sandboxG2SStore } from './store/SandboxG2SStore';
import {
    SANDBOX_HUGO_GENE,
    SANDBOX_REFSEQ_TRANSCRIPT_ID,
    USE_MOCK_G2S_DATA,
    USE_MOCK_MUTATIONS,
} from './api/sandboxApiConfig';
import PdbHeaderCache from 'shared/cache/PdbHeaderCache';
import { isPutativeDriverMutation } from './lib/putativeDriverUtils';
import SandboxMutationMetaColumn from './components/SandboxMutationMetaColumn';
import './App.scss';

const StructureViewerPanel = React.lazy(
    () => import('shared/components/structureViewer/StructureViewerPanel')
);

const SandboxApp = observer(function SandboxApp() {
    const [panelOpen, setPanelOpen] = useState(false);
    const store = sandboxG2SStore;

    useEffect(() => {
        store.initialize();
    }, [store]);

    const dataSourceLabel = USE_MOCK_G2S_DATA
        ? 'mock fixtures'
        : `local G2S :5443 + Genome Nexus (${SANDBOX_HUGO_GENE})`;

    const mutationSourceLabel = USE_MOCK_MUTATIONS
        ? 'mock mutations'
        : 'cBioPortal.org (study-resolved profiles)';

    const canOpenViewer =
        store.status === 'complete' &&
        (store.pdbChainDataStore.allData.length > 0 || !!store.uniprotId);

    return (
        <div className="sandbox-app">
            {(store.status === 'idle' || store.status === 'pending') && (
                <div className="sandbox-status sandbox-status--loading">
                    {store.status === 'idle'
                        ? 'Initializing…'
                        : `Loading ${dataSourceLabel} + ${mutationSourceLabel}…`}
                </div>
            )}

            {store.status === 'error' && (
                <div className="sandbox-status sandbox-status--error">
                    {store.errorMessage}
                </div>
            )}

            {store.status === 'complete' && (
                <div className="sandbox-meta-column-dock">
                    <SandboxMutationMetaColumn
                        store={store.mutationDataStore}
                        hugoGeneSymbol={SANDBOX_HUGO_GENE}
                        ensemblTranscriptId={store.ensemblTranscriptId}
                        uniprotId={store.uniprotId}
                        refseqTranscriptId={SANDBOX_REFSEQ_TRANSCRIPT_ID}
                        mutationCount={store.mutationCount}
                        somaticMutationRatePercent={store.somaticMutationRatePercent}
                        panelOpen={panelOpen}
                        canOpenViewer={canOpenViewer}
                        onView3DStructure={() => setPanelOpen(open => !open)}
                        isPutativeDriver={isPutativeDriverMutation}
                    />
                </div>
            )}

            {panelOpen && store.status === 'complete' && (
                <Suspense fallback={null}>
                    <StructureViewerPanel
                        mutationDataStore={store.mutationDataStore}
                        pdbChainDataStore={store.pdbChainDataStore}
                        pdbAlignmentIndex={store.pdbAlignmentIndex}
                        pdbHeaderCache={
                            store.pdbHeaderCache as PdbHeaderCache
                        }
                        residueMappingCache={store.residueMappingCache}
                        uniprotId={store.uniprotId}
                        indexedVariantAnnotations={
                            store.indexedVariantAnnotations
                        }
                        alphafoldFilesBaseUrl={
                            import.meta.env.DEV
                                ? '/alphafold-files'
                                : 'https://alphafold.ebi.ac.uk/files'
                        }
                        alphafoldApiBaseUrl={
                            import.meta.env.DEV
                                ? '/alphafold-api'
                                : 'https://alphafold.ebi.ac.uk'
                        }
                        onClose={() => setPanelOpen(false)}
                        {...DEFAULT_PROTEIN_IMPACT_TYPE_COLORS}
                    />
                </Suspense>
            )}
        </div>
    );
});

export default SandboxApp;
