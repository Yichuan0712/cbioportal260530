import _ from 'lodash';
import { action, computed, makeObservable, observable, override } from 'mobx';
import autobind from 'autobind-decorator';
import {
    applyDataFiltersOnDatum,
    DataFilter,
    DataFilterType,
    DataStore,
    FilterApplier,
    findAllUniquePositions,
    groupDataByGroupFilters,
} from 'react-mutation-mapper';
import { SimpleLazyMobXTableApplicationDataStore } from 'shared/lib/ILazyMobXTableApplicationDataStore';
import { Mutation } from 'cbioportal-ts-api-client';
import {
    ANNOTATED_PROTEIN_IMPACT_TYPE_FILTER_ID,
    ANNOTATED_PROTEIN_IMPACT_FILTER_TYPE,
} from 'shared/lib/MutationMapperFilterUtils';

type GroupedData = { group: string; data: Mutation[][] }[];

export const PROTEIN_IMPACT_TYPE_FILTER_ID =
    '_cBioPortalProteinImpactTypeFilter_';

export function findProteinImpactTypeFilter(dataFilters: DataFilter[]) {
    return dataFilters.find(
        f =>
            f.id === PROTEIN_IMPACT_TYPE_FILTER_ID ||
            f.id === ANNOTATED_PROTEIN_IMPACT_TYPE_FILTER_ID
    );
}

export function findAnnotatedProteinImpactTypeFilter(dataFilters: DataFilter[]) {
    return dataFilters.find(
        f => f.id === ANNOTATED_PROTEIN_IMPACT_TYPE_FILTER_ID
    );
}

export default class MutationMapperDataStore
    extends SimpleLazyMobXTableApplicationDataStore<Mutation[]>
    implements DataStore
{
    @observable public dataFilters: DataFilter[] = [];
    @observable public selectionFilters: DataFilter[] = [];
    @observable public highlightFilters: DataFilter[] = [];
    @observable.ref public groupFilters: {
        group: string;
        filter: DataFilter;
    }[] = [];
    public isDataMerged: boolean = false;

    private lazyMobXTableFilter:
        | ((
              d: Mutation[],
              filterString?: string,
              filterStringUpper?: string,
              filterStringLower?: string
          ) => boolean)
        | undefined;

    protected customFilterApplier: FilterApplier | undefined;

    @computed
    public get sortedFilteredGroupedData(): GroupedData {
        return groupDataByGroupFilters(
            this.groupFilters,
            this.isDataMerged
                ? _.flatten(this.sortedFilteredData).map(mutation => [mutation])
                : this.sortedFilteredData,
            this.applyFilter
        );
    }

    @computed
    public get selectedPositions() {
        return _.keyBy(
            findAllUniquePositions(this.selectionFilters).map(p => ({
                position: p,
            })),
            'position'
        );
    }

    @computed
    public get highlightedPositions() {
        return _.keyBy(
            findAllUniquePositions(this.highlightFilters).map(p => ({
                position: p,
            })),
            'position'
        );
    }

    @computed
    get hasPositionSelection(): boolean {
        return Object.keys(this.selectedPositions).length > 0;
    }

    @action
    public clearDataFilters() {
        this.dataFilters = [];
    }

    @action
    public clearHighlightFilters() {
        this.highlightFilters = [];
    }

    @action
    public clearSelectionFilters() {
        this.selectionFilters = [];
    }

    @action
    public setDataFilters(filters: DataFilter[]) {
        this.dataFilters = filters;
    }

    @action
    public setHighlightFilters(filters: DataFilter[]) {
        this.highlightFilters = filters;
    }

    @action
    public setSelectionFilters(filters: DataFilter[]) {
        this.selectionFilters = filters;
    }

    @action
    public setGroupFilters(filters: { group: string; filter: DataFilter }[]) {
        this.groupFilters = filters;
    }

    public isPositionSelected(position: number) {
        return !!this.selectedPositions[position + ''];
    }

    public isPositionHighlighted(position: number) {
        return !!this.highlightedPositions[position + ''];
    }

    @action
    public togglePositionSelection(position: number) {
        const positions = findAllUniquePositions(this.selectionFilters);

        const next = positions.includes(position)
            ? positions.filter(p => p !== position)
            : [...positions, position];

        if (next.length === 0) {
            this.clearSelectionFilters();
        } else {
            this.setSelectionFilters([
                {
                    type: DataFilterType.POSITION,
                    values: next,
                },
            ]);
        }
    }

    @action
    public clearPositionSelection() {
        this.clearSelectionFilters();
    }

    @override
    public setFilter(
        fn?: (
            d: Mutation[],
            filterString?: string,
            filterStringUpper?: string,
            filterStringLower?: string
        ) => boolean
    ) {
        super.setFilter(
            (
                d: Mutation[],
                filterString?: string,
                filterStringUpper?: string,
                filterStringLower?: string
            ) =>
                (!fn ||
                    fn(
                        d,
                        filterString,
                        filterStringUpper,
                        filterStringLower
                    )) &&
                (this.dataFilters.length === 0 || this.dataMainFilter(d))
        );

        this.lazyMobXTableFilter = fn;
    }

    @override
    public resetFilter() {
        super.resetFilter();
        this.dataFilter = (d: Mutation[]) =>
            this.dataFilters.length === 0 || this.dataMainFilter(d);
        this.lazyMobXTableFilter = undefined;
    }

    @action
    public resetDataFilters() {
        this.clearDataFilters();
        this.clearHighlightFilters();
        this.clearSelectionFilters();
    }

    constructor(
        data: Mutation[][],
        customFilterApplier?: FilterApplier,
        dataFilters: DataFilter[] = [],
        selectionFilters: DataFilter[] = [],
        highlightFilters: DataFilter[] = [],
        groupFilters: { group: string; filter: DataFilter }[] = []
    ) {
        super(data);

        makeObservable(this);

        this.dataFilters = dataFilters;
        this.selectionFilters = selectionFilters;
        this.highlightFilters = highlightFilters;
        this.groupFilters = groupFilters;

        this.dataSelector = (d: Mutation[]) => this.dataSelectFilter(d);
        this.dataHighlighter = (d: Mutation[]) => this.dataHighlightFilter(d);
        this.customFilterApplier = customFilterApplier;
        this.setFilter();
    }

    /** Per-mutation filtering for strict 3D colors matching badge selection. */
    @override
    get sortedFilteredData(): Mutation[][] {
        const base = super.sortedFilteredData;

        if (this.dataFilters.length === 0) {
            return base;
        }

        return base
            .map(group =>
                group.filter(mutation =>
                    applyDataFiltersOnDatum(
                        mutation,
                        this.dataFilters,
                        this.applyFilter
                    )
                )
            )
            .filter(group => group.length > 0);
    }

    @autobind
    public dataMainFilter(d: Mutation[]): boolean {
        if (this.dataFilters.length === 0) {
            return true;
        }

        return d.some(mutation =>
            applyDataFiltersOnDatum(
                mutation,
                this.dataFilters,
                this.applyFilter
            )
        );
    }

    @autobind
    public dataSelectFilter(d: Mutation[]): boolean {
        if (this.selectionFilters.length === 0) {
            return false;
        }

        return d.some(mutation =>
            applyDataFiltersOnDatum(
                mutation,
                this.selectionFilters,
                this.applyFilter
            )
        );
    }

    @autobind
    public dataHighlightFilter(d: Mutation[]): boolean {
        return applyDataFiltersOnDatum(
            d,
            this.highlightFilters,
            this.applyFilter
        );
    }

    @autobind
    public applyFilter(filter: DataFilter, d: Mutation | Mutation[]): boolean {
        const mutation = _.flatten([d])[0];

        if (this.customFilterApplier) {
            return this.customFilterApplier.applyFilter(filter, mutation);
        }

        return (
            filter.type !== DataFilterType.POSITION ||
            filter.values.includes(mutation.proteinPosStart)
        );
    }
}
