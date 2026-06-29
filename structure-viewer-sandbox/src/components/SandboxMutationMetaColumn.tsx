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
    computeMutationCountsByProteinImpactType,
} from 'shared/lib/MutationMapperFilterUtils';
import {
    getNCBIlink,
    getTranscriptSummaryUrl,
    getVersionedEnsemblTranscriptId,
} from '../lib/geneSummaryLinks';
import geneSummaryStyles from './mutationMapper/geneSummary.module.scss';
import './mutationMapper/mutations.scss';
import styles from './SandboxMutationMetaColumn.module.scss';

export interface ISandboxMutationMetaColumnProps {
    store: MutationMapperDataStore;
    hugoGeneSymbol?: string;
    ensemblTranscriptId?: string;
    ensemblTranscriptVersion?: string;
    refseqMrnaId?: string;
    ccdsId?: string;
    uniprotEntryName?: string;
    mutationCount?: number;
    somaticMutationRatePercent?: number | null;
    panelOpen: boolean;
    canOpenViewer: boolean;
    onView3DStructure: () => void;
    isPutativeDriver?: (mutation: Partial<import('cbioportal-ts-api-client').Mutation>) => boolean;
}

function renderCompactGeneSummary(props: {
    refseqMrnaId?: string;
    ensemblTranscriptId?: string;
    ensemblTranscriptVersion?: string;
    ccdsId?: string;
    uniprotEntryName?: string;
}) {
    const {
        refseqMrnaId,
        ensemblTranscriptId,
        ensemblTranscriptVersion,
        ccdsId,
        uniprotEntryName,
    } = props;

    const versionedTranscriptId = getVersionedEnsemblTranscriptId(
        ensemblTranscriptId || '',
        ensemblTranscriptVersion
    );

    const refSeq = refseqMrnaId ? (
        <a href={getNCBIlink(`/nuccore/${refseqMrnaId}`)} target="_blank">
            {refseqMrnaId}
        </a>
    ) : (
        '-'
    );

    const ensembl =
        ensemblTranscriptId && versionedTranscriptId ? (
            <a
                href={getTranscriptSummaryUrl(ensemblTranscriptId)}
                target="_blank"
            >
                {versionedTranscriptId}
            </a>
        ) : (
            '-'
        );

    const ccds = ccdsId ? (
        <a
            href={getNCBIlink({
                pathname: '/CCDS/CcdsBrowse.cgi',
                query: {
                    REQUEST: 'CCDS',
                    DATA: ccdsId,
                },
            })}
            target="_blank"
        >
            {ccdsId}
        </a>
    ) : (
        '-'
    );

    const uniprot = uniprotEntryName ? (
        <a
            href={`https://www.uniprot.org/uniprot/${uniprotEntryName}`}
            target="_blank"
        >
            {uniprotEntryName}
        </a>
    ) : (
        '-'
    );

    return (
        <div className={geneSummaryStyles.geneSummaryCompact}>
            <span data-test="compactGeneSummaryRefSeq">{refSeq}</span>
            {' | '}
            {ensembl}
            <br />
            <span data-test="compactGeneSummaryCCDS">{ccds}</span>
            {' | '}
            <span data-test="compactGeneSummaryUniProt">{uniprot}</span>
        </div>
    );
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
        return computeMutationCountsByProteinImpactType(
            this.props.store.allData,
            this.props.store.dataFilters,
            this.props.store.applyFilter.bind(this.props.store),
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
            refseqMrnaId,
            ensemblTranscriptId,
            ensemblTranscriptVersion,
            ccdsId,
            uniprotEntryName,
            hugoGeneSymbol,
            mutationCount,
            panelOpen,
            canOpenViewer,
            onView3DStructure,
        } = this.props;

        const dropdownValue = refseqMrnaId || '-';

        return (
            <div className={styles['mutation-meta-column']}>
                <div className={styles['transcript-row']}>
                    <select
                        className="form-control input-sm"
                        value={dropdownValue}
                        disabled
                    >
                        <option value={dropdownValue}>{dropdownValue}</option>
                    </select>
                </div>

                <div className={styles['gene-links']}>
                    {renderCompactGeneSummary({
                        refseqMrnaId,
                        ensemblTranscriptId,
                        ensemblTranscriptVersion,
                        ccdsId,
                        uniprotEntryName,
                    })}
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
