import { Mutation } from 'cbioportal-ts-api-client';
import {
    ProteinImpactType,
    getProteinImpactType,
} from 'cbioportal-frontend-commons';
import { ProteinImpactTypeFilter } from '../../lib/react-mutation-mapper/filter/ProteinImpactTypeFilter';
import { DataFilter, DataFilterType } from 'react-mutation-mapper';
import { ApplyFilterFn } from '../../lib/react-mutation-mapper/model/FilterApplier';
import {
    applyDataFilters,
    groupDataByGroupFilters,
} from '../../lib/react-mutation-mapper/util/FilterUtils';

export {
    SELECTOR_VALUE_WITH_VUS,
    getProteinImpactTypeOptionDisplayValueMap,
    getProteinImpactTypeColorMap,
} from './MutationUtils';

export const ANNOTATED_PROTEIN_IMPACT_TYPE_FILTER_ID =
    '_cBioPortalAnnotatedProteinImpactTypeFilter_';
export const ANNOTATED_PROTEIN_IMPACT_FILTER_TYPE =
    'annotatedProteinImpactType';

export function getAnnotatedProteinImpactType(
    mutation: Partial<Mutation>,
    proteinImpactType: string,
    isPutativeDriverFun?: (mutation: Partial<Mutation>) => boolean
) {
    const isPutativeDriver = !!(
        !isPutativeDriverFun || isPutativeDriverFun(mutation)
    );
    switch (proteinImpactType) {
        case ProteinImpactType.MISSENSE:
            return isPutativeDriver
                ? ProteinImpactType.MISSENSE_PUTATIVE_DRIVER
                : ProteinImpactType.MISSENSE_UNKNOWN_SIGNIFICANCE;
        case ProteinImpactType.TRUNCATING:
            return isPutativeDriver
                ? ProteinImpactType.TRUNCATING_PUTATIVE_DRIVER
                : ProteinImpactType.TRUNCATING_UNKNOWN_SIGNIFICANCE;
        case ProteinImpactType.INFRAME:
            return isPutativeDriver
                ? ProteinImpactType.INFRAME_PUTATIVE_DRIVER
                : ProteinImpactType.INFRAME_UNKNOWN_SIGNIFICANCE;
        case ProteinImpactType.FUSION:
            return isPutativeDriver
                ? ProteinImpactType.FUSION_PUTATIVE_DRIVER
                : ProteinImpactType.FUSION_UNKNOWN_SIGNIFICANCE;
        case ProteinImpactType.SPLICE:
            return isPutativeDriver
                ? ProteinImpactType.SPLICE_PUTATIVE_DRIVER
                : ProteinImpactType.SPLICE_UNKNOWN_SIGNIFICANCE;
        case ProteinImpactType.OTHER:
            return isPutativeDriver
                ? ProteinImpactType.OTHER_PUTATIVE_DRIVER
                : ProteinImpactType.OTHER_UNKNOWN_SIGNIFICANCE;
        default:
            return ProteinImpactType.OTHER;
    }
}

export function createAnnotatedProteinImpactTypeFilter(
    isPutativeDriver?: (mutation: Partial<Mutation>) => boolean
) {
    return (filter: ProteinImpactTypeFilter, mutation: Mutation) => {
        return filter.values.includes(
            getAnnotatedProteinImpactType(
                mutation,
                getProteinImpactType(mutation.mutationType || 'other'),
                isPutativeDriver
            )
        );
    };
}

/** Match official MutationMapper: count protein positions, classify by first mutation in each group. */
export function computeMutationCountsByProteinImpactType(
    allData: Mutation[][],
    dataFilters: DataFilter[],
    applyFilter: ApplyFilterFn,
    isPutativeDriver?: (mutation: Partial<Mutation>) => boolean
): { [proteinImpactType: string]: number } {
    const filtersWithoutProteinImpactTypeFilter = dataFilters.filter(
        f =>
            f.type !== DataFilterType.PROTEIN_IMPACT_TYPE &&
            f.type !== ANNOTATED_PROTEIN_IMPACT_FILTER_TYPE
    );

    const sortedFilteredData = applyDataFilters(
        allData,
        filtersWithoutProteinImpactTypeFilter,
        applyFilter
    );

    const groupFilters = Object.values(ProteinImpactType).map(value => ({
        group: value,
        filter: {
            type: DataFilterType.PROTEIN_IMPACT_TYPE,
            values: [value],
        },
    }));

    const groupedData = groupDataByGroupFilters(
        groupFilters,
        sortedFilteredData,
        createAnnotatedProteinImpactTypeFilter(isPutativeDriver)
    );

    const map: { [proteinImpactType: string]: number } = {};
    groupedData.forEach(g => {
        map[g.group] = g.data.length;
    });
    return map;
}

/** @deprecated Use computeMutationCountsByProteinImpactType for official parity. */
export function groupMutationsByProteinImpactTypeForCounts(
    sortedFilteredData: Mutation[][],
    isPutativeDriver?: (mutation: Partial<Mutation>) => boolean
): { [proteinImpactType: string]: number } {
    return computeMutationCountsByProteinImpactType(
        sortedFilteredData,
        [],
        createAnnotatedProteinImpactTypeFilter(isPutativeDriver),
        isPutativeDriver
    );
}
