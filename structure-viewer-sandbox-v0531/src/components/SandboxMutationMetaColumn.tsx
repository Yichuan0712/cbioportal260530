import * as React from 'react';
import { action, computed, makeObservable } from 'mobx';
import { observer } from 'mobx-react';
import _ from 'lodash';
import { DEFAULT_PROTEIN_IMPACT_TYPE_COLORS } from 'lib/proteinImpact';
import { onFilterOptionSelect } from 'lib/react-mutation-mapper/util/FilterUtils';
import { DefaultTooltip } from 'cbioportal-frontend-commons';
import DriverAnnotationProteinImpactTypeBadgeSelector from './mutationMapper/DriverAnnotationProteinImpactTypeBadgeSelector';
import MutationMapperDataStore, {
    findAnnotatedProteinImpactTypeFilter,
    findProteinImpactTypeFilter,
} from 'shared/components/mutationMapper/MutationMapperDataStore';
import {
    ANNOTATED_PROTEIN_IMPACT_FILTER_TYPE,
    ANNOTATED_PROTEIN_IMPACT_TYPE_FILTER_ID,
    groupMutationsByProteinImpactTypeForCounts,
} from 'shared/lib/MutationMapperFilterUtils';
import { SANDBOX_HUGO_GENE } from '../api/sandboxApiConfig';
import './mutationMapper/mutations.scss';
import styles from './SandboxMutationMetaColumn.module.scss';

export interface ISandboxMutationMetaColumnProps {
    store: MutationMapperDataStore;
    hugoGeneSymbol?: string;
    ensemblTranscriptId?: string;
    uniprotId?: string;
    refseqTranscriptId?: string;
    mutationCount?: number;
    somaticMutationRatePercent?: number | null;
    panelOpen: boolean;
    canOpenViewer: boolean;
    onView3DStructure: () => void;
    isPutativeDriver?: (mutation: Partial<import('cbioportal-ts-api-client').Mutation>) => boolean;
}

@observer
class SandboxMutationMetaColumn extends React.Component<ISandboxMutationMetaColumnProps> {
    constructor(props: ISandboxMutationMetaColumnProps) {
        super(props);
        makeObservable(this);
    }

    @computed
    get mutationCountsByProteinImpactType(): {
        [proteinImpactType: string]: number;
    } {
        return groupMutationsByProteinImpactTypeForCounts(
            this.props.store.allData,
            this.props.isPutativeDriver
        );
    }

    @computed
    get proteinImpactTypeFilter() {
        return findProteinImpactTypeFilter(this.props.store.dataFilters);
    }

    @computed
    get annotatedProteinImpactTypeFilter() {
        return findAnnotatedProteinImpactTypeFilter(this.props.store.dataFilters);
    }

    @computed
    get mutationFrequencyPercent(): string | null {
        if (this.props.somaticMutationRatePercent != null) {
            return this.props.somaticMutationRatePercent.toFixed(1);
        }

        const mutations = _.flatten(this.props.store.allData);
        if (mutations.length === 0) {
            return null;
        }

        const patients = _.uniq(mutations.map(m => m.patientId).filter(Boolean));
        if (patients.length === 0) {
            return null;
        }

        const mutatedPatients = _.uniq(
            mutations
                .filter(m => m.mutationStatus?.toLowerCase() !== 'germline')
                .map(m => m.patientId)
                .filter(Boolean)
        );

        return ((mutatedPatients.length / patients.length) * 100).toFixed(1);
    }

    @action.bound
    protected onProteinImpactTypeSelect(
        selectedMutationTypeIds: string[],
        allValuesSelected: boolean
    ) {
        onFilterOptionSelect(
            selectedMutationTypeIds.map(v => v.toLowerCase()),
            allValuesSelected,
            this.props.store,
            ANNOTATED_PROTEIN_IMPACT_FILTER_TYPE,
            ANNOTATED_PROTEIN_IMPACT_TYPE_FILTER_ID
        );
    }

    render() {
        const {
            ensemblTranscriptId,
            uniprotId,
            refseqTranscriptId,
            hugoGeneSymbol,
            mutationCount,
            panelOpen,
            canOpenViewer,
            onView3DStructure,
        } = this.props;

        return (
            <div className={styles['mutation-meta-column']}>
                <div className={styles['transcript-row']}>
                    <select
                        className="form-control input-sm"
                        value={refseqTranscriptId || 'NM_000346'}
                        disabled
                    >
                        <option value={refseqTranscriptId || 'NM_000346'}>
                            {refseqTranscriptId || 'NM_000346'}
                        </option>
                    </select>
                </div>

                <div className={styles['gene-links']}>
                    <span>{refseqTranscriptId || 'NM_000346'}</span>
                    {ensemblTranscriptId && (
                        <>
                            {' '}
                            | <span>{ensemblTranscriptId}</span>
                        </>
                    )}
                </div>
                <div className={styles['gene-links']}>
                    <span>{hugoGeneSymbol || SANDBOX_HUGO_GENE}_HUMAN</span>
                    {uniprotId && (
                        <>
                            {' '}
                            | <span>{uniprotId}</span>
                        </>
                    )}
                </div>

                {this.mutationFrequencyPercent != null && (
                    <div className={styles['mutation-rate']}>
                        Somatic Mutation Frequency{' '}
                        <DefaultTooltip
                            overlay={
                                <span>
                                    Percentage of samples with a somatic mutation
                                    in {hugoGeneSymbol}.
                                </span>
                            }
                        >
                            <i className="fa fa-info-circle" />
                        </DefaultTooltip>{' '}
                        <strong>{this.mutationFrequencyPercent}%</strong>
                    </div>
                )}

                <div className={`legendPanel ${styles['legend-panel']}`}>
                    <DriverAnnotationProteinImpactTypeBadgeSelector
                        filter={this.proteinImpactTypeFilter}
                        counts={this.mutationCountsByProteinImpactType}
                        onSelect={this.onProteinImpactTypeSelect}
                        annotatedProteinImpactTypeFilter={
                            this.annotatedProteinImpactTypeFilter
                        }
                        disableAnnotationSettings={true}
                        colors={DEFAULT_PROTEIN_IMPACT_TYPE_COLORS}
                    />
                </div>

                {mutationCount != null && mutationCount > 0 && (
                    <div className={styles['mutation-count-note']}>
                        {mutationCount} mutation records loaded
                    </div>
                )}

                <button
                    type="button"
                    className="btn btn-default btn-sm"
                    disabled={!canOpenViewer && !panelOpen}
                    onClick={onView3DStructure}
                    data-test="view3DStructure"
                >
                    {panelOpen ? 'Close 3D Structure' : 'View 3D Structure'}
                </button>
            </div>
        );
    }
}

export default SandboxMutationMetaColumn;
