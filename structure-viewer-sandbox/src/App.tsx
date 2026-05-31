import * as React from 'react';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import StructureViewerPanel from 'shared/components/structureViewer/StructureViewerPanel';
import { DEFAULT_PROTEIN_IMPACT_TYPE_COLORS } from 'react-mutation-mapper';
import { sandboxG2SStore } from './store/SandboxG2SStore';
import {
    SANDBOX_HUGO_GENE,
    USE_MOCK_G2S_DATA,
    USE_MOCK_MUTATIONS,
} from './api/sandboxApiConfig';
import PdbHeaderCache from 'shared/cache/PdbHeaderCache';
import './App.scss';

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

    return (
        <div className="sandbox-app">
            <div className="sandbox-viewport">
                {store.status === 'pending' && (
                    <div className="sandbox-status sandbox-status--loading">
                        Loading {dataSourceLabel} + {mutationSourceLabel}…
                    </div>
                )}

                {store.status === 'error' && (
                    <div className="sandbox-status sandbox-status--error">
                        {store.errorMessage}
                    </div>
                )}

                {panelOpen && store.status === 'complete' && (
                    <StructureViewerPanel
                        mutationDataStore={store.mutationDataStore}
                        pdbChainDataStore={store.pdbChainDataStore}
                        pdbAlignmentIndex={store.pdbAlignmentIndex}
                        pdbHeaderCache={
                            store.pdbHeaderCache as PdbHeaderCache
                        }
                        residueMappingCache={store.residueMappingCache}
                        uniprotId={store.uniprotId}
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
                )}

                <div className="sandbox-button-center">
                    <button
                        className="btn btn-default btn-sm"
                        disabled={
                            store.status !== 'complete' ||
                            (store.pdbChainDataStore.allData.length === 0 &&
                                !store.uniprotId)
                        }
                        onClick={() => setPanelOpen(open => !open)}
                        data-test="view3DStructure"
                    >
                        View 3D Structure
                    </button>
                </div>

                {store.status === 'complete' && (
                    <div className="sandbox-meta">
                        {store.ensemblTranscriptId && (
                            <span>{store.ensemblTranscriptId} · </span>
                        )}
                        {store.pdbChainDataStore.allData.length} PDB chain(s)
                        · UniProt {store.uniprotId}
                        {store.pdbChainDataStore.selectedChain &&
                            ` · ${store.pdbChainDataStore.selectedChain.pdbId}/${store.pdbChainDataStore.selectedChain.chain}`}
                        {!USE_MOCK_MUTATIONS && store.mutationCount > 0 && (
                            <span>
                                {' '}
                                · {store.mutationCount} mutations (
                                {mutationSourceLabel})
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

export default SandboxApp;
