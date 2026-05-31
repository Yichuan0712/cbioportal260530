import { Alignment, ResidueMapping } from 'genome-nexus-ts-api-client';
import { CacheData } from 'shared/lib/LazyMobXCache';
import { remoteData } from 'cbioportal-frontend-commons';
import { MobxPromise } from 'cbioportal-frontend-commons';
import { fetchResidueMappingByPdb } from '../../api/g2sApi';

export type ResidueMappingQuery = {
    uniprotId: string;
    pdbId: string;
    chainId: string;
    uniprotPositions: number[];
};

export async function fetchAlignments(
    positions: number[],
    uniprotId: string,
    pdbId: string,
    chainId: string
) {
    if (positions.length > 0) {
        return await fetchResidueMappingByPdb(
            uniprotId,
            pdbId,
            chainId,
            positions
        );
    }
    return [];
}

export default class ResidueMappingCache {
    private queries: {
        [key: string]: MobxPromise<Array<CacheData<ResidueMapping> | null>>;
    } = {};

    public get(query: ResidueMappingQuery) {
        const key = this.generateQueryKey(query);

        if (!this.queries[key]) {
            this.queries[key] = remoteData<
                Array<CacheData<ResidueMapping> | null>
            >(
                {
                    invoke: async () => {
                        let residueMappingCacheData: Array<
                            CacheData<ResidueMapping> | null
                        > = [];
                        let residueMappings: ResidueMapping[] = [];

                        const alignments = await fetchAlignments(
                            query.uniprotPositions,
                            query.uniprotId,
                            query.pdbId,
                            query.chainId
                        );

                        if (alignments.length > 0) {
                            alignments.forEach((alignment: Alignment) => {
                                residueMappings = residueMappings.concat(
                                    alignment.residueMapping || []
                                );
                            });

                            residueMappingCacheData = residueMappings.map(
                                (residueMapping: ResidueMapping) =>
                                    ({
                                        status: 'complete',
                                        data: residueMapping,
                                    } as CacheData<ResidueMapping>)
                            );
                        }

                        return residueMappingCacheData;
                    },
                    onError: () => {
                        // fail silently, same as main project
                    },
                },
                this.defaultData()
            );
        }

        return this.queries[key];
    }

    private generateQueryKey(query: ResidueMappingQuery): string {
        return `${query.uniprotId}_${query.pdbId}_${
            query.chainId
        }_${query.uniprotPositions.join(',')}`;
    }

    private defaultData(): Array<CacheData<ResidueMapping> | null> {
        return [null];
    }
}
