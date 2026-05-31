import * as React from 'react';
import { useState } from 'react';
import { observer } from 'mobx-react';
import StructureViewerPanel from 'shared/components/structureViewer/StructureViewerPanel';
import PdbChainDataStore from 'shared/components/mutationMapper/PdbChainDataStore';
import MutationMapperDataStore from 'shared/components/mutationMapper/MutationMapperDataStore';
import PdbHeaderCache from 'shared/cache/PdbHeaderCache';
import ResidueMappingCache from 'shared/cache/ResidueMappingCache';
import { DEFAULT_PROTEIN_IMPACT_TYPE_COLORS } from 'react-mutation-mapper';
import {
    EMPTY_RESIDUE_MAPPINGS,
    MOCK_ALIGNMENT_INDEX,
    MOCK_MUTATIONS,
    MOCK_UNIPROT_ID,
    PDB_4U4A_CHAIN,
    PDB_HEADER_4U4A,
    SAMPLE_RESIDUE_MAPPINGS,
} from './mocks/fixtures';
import './App.scss';

/**
 * Toggle to true to demo mutation coloring on the 3D structure.
 * false reproduces the screenshot warning (unmapped mutations).
 */
const SHOW_MAPPED_MUTATIONS = false;

const pdbChainDataStore = new PdbChainDataStore([PDB_4U4A_CHAIN]);
pdbChainDataStore.selectFirstChain();

const mutationDataStore = new MutationMapperDataStore(MOCK_MUTATIONS, [1700]);
const pdbHeaderCache = new PdbHeaderCache({ '4u4a': PDB_HEADER_4U4A });
const residueMappingCache = new ResidueMappingCache(
    SHOW_MAPPED_MUTATIONS ? SAMPLE_RESIDUE_MAPPINGS : EMPTY_RESIDUE_MAPPINGS
);

const SandboxApp = observer(function SandboxApp() {
    const [panelOpen, setPanelOpen] = useState(false);

    return (
        <div className="sandbox-app">
            <div className="sandbox-viewport">
                {panelOpen && (
                    <StructureViewerPanel
                        mutationDataStore={mutationDataStore}
                        pdbChainDataStore={pdbChainDataStore}
                        pdbAlignmentIndex={MOCK_ALIGNMENT_INDEX}
                        pdbHeaderCache={pdbHeaderCache}
                        residueMappingCache={residueMappingCache}
                        uniprotId={MOCK_UNIPROT_ID}
                        onClose={() => setPanelOpen(false)}
                        {...DEFAULT_PROTEIN_IMPACT_TYPE_COLORS}
                    />
                )}

                <div className="sandbox-button-center">
                    <button
                        className="btn btn-default btn-sm"
                        disabled={pdbChainDataStore.allData.length === 0}
                        onClick={() => setPanelOpen(open => !open)}
                        data-test="view3DStructure"
                    >
                        View 3D Structure
                    </button>
                </div>
            </div>
        </div>
    );
});

export default SandboxApp;
