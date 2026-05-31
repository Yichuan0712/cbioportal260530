import { CacheData } from 'shared/lib/LazyMobXCache';
import { ResidueMapping } from 'genome-nexus-ts-api-client';

export type ResidueMappingQuery = {
    uniprotId: string;
    pdbId: string;
    chainId: string;
    uniprotPositions: number[];
};

export default class ResidueMappingCache {
    private mappings: ResidueMapping[];

    constructor(mappings: ResidueMapping[] = []) {
        this.mappings = mappings;
    }

    public get(query: ResidueMappingQuery): { result?: Array<CacheData<ResidueMapping> | null> } {
        const filtered = this.mappings.filter(mapping =>
            query.uniprotPositions.includes(mapping.queryPosition)
        );

        return {
            result: filtered.map(data => ({
                status: 'complete' as const,
                data,
            })),
        };
    }
}
