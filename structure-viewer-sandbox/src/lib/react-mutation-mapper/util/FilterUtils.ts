import _ from 'lodash';
import { getProteinImpactType } from 'cbioportal-frontend-commons';
import { Mutation } from 'cbioportal-ts-api-client';
import { DataFilter, DataFilterType } from '../model/DataFilter';
import { ApplyFilterFn } from '../model/FilterApplier';
import { ProteinImpactTypeFilter } from '../filter/ProteinImpactTypeFilter';

export function findAllUniquePositions(filters: DataFilter[]): number[] {
    return _.uniq(
        _.flatten(
            filters
                .filter(f => f.type === DataFilterType.POSITION)
                .map(f => [...f.values])
        )
    );
}

export function applyDataFiltersOnDatum(
    datum: Mutation | Mutation[],
    dataFilters: DataFilter[],
    applyFilter: ApplyFilterFn
) {
    const mutation = _.flatten([datum])[0];
    return (
        dataFilters.length > 0 &&
        !dataFilters
            .map(dataFilter => applyFilter(dataFilter, mutation))
            .includes(false)
    );
}

export function groupDataByGroupFilters(
    groupFilters: { group: string; filter: DataFilter }[],
    sortedFilteredData: Mutation[][],
    applyFilter: ApplyFilterFn
) {
    return groupFilters.map(groupFilter => ({
        group: groupFilter.group,
        data: sortedFilteredData.filter(m =>
            applyFilter(
                groupFilter.filter,
                _.flatten([m])[0]
            )
        ),
    }));
}

export function onFilterOptionSelect(
    selectedValues: string[],
    allValuesSelected: boolean,
    dataStore: { dataFilters: DataFilter[]; setDataFilters: (f: DataFilter[]) => void },
    dataFilterType: string,
    dataFilterId: string
) {
    const otherFilters = dataStore.dataFilters.filter(
        (f: DataFilter) => f.id !== dataFilterId
    );

    if (allValuesSelected) {
        dataStore.setDataFilters(otherFilters);
    } else {
        dataStore.setDataFilters([
            ...otherFilters,
            {
                id: dataFilterId,
                type: dataFilterType,
                values: selectedValues,
            },
        ]);
    }
}

export function applyDefaultProteinImpactTypeFilter(
    filter: ProteinImpactTypeFilter,
    mutation: Mutation
) {
    return filter.values.includes(
        getProteinImpactType(mutation.mutationType || 'other')
    );
}

export function applyDataFilters(
    data: Mutation[][],
    dataFilters: DataFilter[],
    applyFilter: ApplyFilterFn
) {
    return dataFilters.length > 0
        ? data.filter(m => applyDataFiltersOnDatum(m, dataFilters, applyFilter))
        : data;
}
