import { action, makeObservable, observable } from 'mobx';
import { Mutation } from 'cbioportal-ts-api-client';
import { SimpleLazyMobXTableApplicationDataStore } from 'shared/lib/ILazyMobXTableApplicationDataStore';

/**
 * Minimal MutationMapperDataStore for the structure viewer sandbox.
 * Only implements the subset used by StructureViewerPanel.
 */
export default class MutationMapperDataStore extends SimpleLazyMobXTableApplicationDataStore<
    Mutation[]
> {
    @observable private selectedPositions: { [key: string]: boolean } = {};
    @observable private highlightedPositions: { [key: string]: boolean } = {};

    constructor(
        data: Mutation[][],
        selectedPositions: number[] = [],
        highlightedPositions: number[] = []
    ) {
        super(data);
        makeObservable(this);
        selectedPositions.forEach(position => {
            this.selectedPositions[`${position}`] = true;
        });
        highlightedPositions.forEach(position => {
            this.highlightedPositions[`${position}`] = true;
        });
    }

    public isPositionSelected(position: number) {
        return !!this.selectedPositions[`${position}`];
    }

    public isPositionHighlighted(position: number) {
        return !!this.highlightedPositions[`${position}`];
    }

    @action
    public setSelectedPositions(positions: number[]) {
        this.selectedPositions = {};
        positions.forEach(position => {
            this.selectedPositions[`${position}`] = true;
        });
    }
}
