import autobind from 'autobind-decorator';
import { Mutation } from 'cbioportal-ts-api-client';
import { DataFilter, DataFilterType } from '../../../lib/react-mutation-mapper/model/DataFilter';
import { FilterApplier } from '../../../lib/react-mutation-mapper/model/FilterApplier';
import {
    ANNOTATED_PROTEIN_IMPACT_FILTER_TYPE,
    createAnnotatedProteinImpactTypeFilter,
} from '../../lib/MutationMapperFilterUtils';
import { applyDefaultProteinImpactTypeFilter } from '../../../lib/react-mutation-mapper/util/FilterUtils';
import { ProteinImpactTypeFilter } from '../../../lib/react-mutation-mapper/filter/ProteinImpactTypeFilter';

export default class SandboxMutationMapperFilterApplier implements FilterApplier {
    constructor(
        private isPutativeDriver?: (mutation: Partial<Mutation>) => boolean
    ) {}

    @autobind
    public applyFilter(filter: DataFilter, mutation: Mutation) {
        switch (filter.type) {
            case DataFilterType.PROTEIN_IMPACT_TYPE:
                return applyDefaultProteinImpactTypeFilter(
                    filter as ProteinImpactTypeFilter,
                    mutation
                );
            case ANNOTATED_PROTEIN_IMPACT_FILTER_TYPE:
                return createAnnotatedProteinImpactTypeFilter(
                    this.isPutativeDriver
                )(filter as ProteinImpactTypeFilter, mutation);
            case DataFilterType.POSITION:
                return filter.values.includes(mutation.proteinPosStart);
            default:
                return true;
        }
    }
}
