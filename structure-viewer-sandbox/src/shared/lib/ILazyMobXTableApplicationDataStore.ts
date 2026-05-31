import { observable, computed, action, makeObservable } from 'mobx';

export interface ILazyMobXTableApplicationDataStore<T> {
    setFilter: (
        fn: (
            d: T,
            filterString?: string,
            filterStringUpper?: string,
            filterStringLower?: string
        ) => boolean
    ) => void;
    allData: T[];
    sortedData: T[];
    sortedFilteredData: T[];
    sortedFilteredSelectedData: T[];
    tableData: T[];
    visibleData: T[];
    isHighlighted: (d: T) => boolean;
    filterString: string;
    sortAscending: boolean | undefined;
    sortMetric: ((d: T) => number | number[]) | undefined;
    itemsPerPage: number;
    page: number;
}

export type DataFilterFunction<T> = (
    d: T,
    filterString?: string,
    filterStringUpper?: string,
    filterStringLower?: string
) => boolean;

export function getSortedData<T>(
    data: T[],
    _sortMetric?: (d: T) => number | number[],
    _sortAscending?: boolean
): T[] {
    return data;
}

export function getSortedFilteredData<T>(
    sortedData: T[],
    filterString: string,
    dataFilter: DataFilterFunction<T>
): T[] {
    const filterStringUpper = filterString.toUpperCase();
    const filterStringLower = filterString.toLowerCase();
    return sortedData.filter((d: T) =>
        dataFilter(d, filterString, filterStringUpper, filterStringLower)
    );
}

export function getVisibileData<T>(
    tableData: T[],
    itemsPerPage: number,
    page: number
): T[] {
    if (itemsPerPage <= 0) {
        return tableData;
    }
    return tableData.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
}

export function getTableData<T>(
    sortedFilteredData: T[],
    sortedFilteredSelectedData: T[]
): T[] {
    if (sortedFilteredSelectedData.length) {
        return sortedFilteredSelectedData;
    }
    return sortedFilteredData;
}

export class SimpleGetterLazyMobXTableApplicationDataStore<T>
    implements ILazyMobXTableApplicationDataStore<T>
{
    @observable protected dataFilter: DataFilterFunction<T>;
    @observable protected dataSelector: (d: T) => boolean;
    @observable public dataHighlighter: (d: T) => boolean;

    @observable.ref public filterString: string;
    @observable public sortMetric: ((d: T) => number | number[]) | undefined;
    @observable public sortAscending: boolean | undefined;
    @observable public page: number;
    @observable public itemsPerPage: number;

    @computed get allData() {
        return this.getData();
    }

    @computed get sortedData() {
        return getSortedData(this.allData, this.sortMetric, this.sortAscending);
    }

    @computed get sortedFilteredData() {
        return getSortedFilteredData(
            this.sortedData,
            this.filterString,
            this.dataFilter
        );
    }

    @computed get sortedFilteredSelectedData() {
        return this.sortedFilteredData.filter(this.dataSelector);
    }

    @computed get tableData() {
        return getTableData(
            this.sortedFilteredData,
            this.sortedFilteredSelectedData
        );
    }

    @computed get visibleData(): T[] {
        return getVisibileData(this.tableData, this.itemsPerPage, this.page);
    }

    @action public setFilter(
        fn: (
            d: T,
            filterString?: string,
            filterStringUpper?: string,
            filterStringLower?: string
        ) => boolean
    ) {
        this.dataFilter = fn;
    }

    public isHighlighted(d: T) {
        return this.dataHighlighter(d);
    }

    constructor(private getData: () => T[]) {
        this.filterString = '';
        this.dataHighlighter = () => false;
        this.dataSelector = () => false;
        this.dataFilter = () => true;
        this.page = 0;
        this.itemsPerPage = -1;
        makeObservable(this);
    }
}

export class SimpleLazyMobXTableApplicationDataStore<
    T
> extends SimpleGetterLazyMobXTableApplicationDataStore<T> {
    constructor(data: T[]) {
        super(() => data);
    }
}
