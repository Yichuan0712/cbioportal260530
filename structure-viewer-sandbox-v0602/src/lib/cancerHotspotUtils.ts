import _ from 'lodash';
import { Mutation } from 'cbioportal-ts-api-client';
import {
    AggregatedHotspots,
    Hotspot,
    IHotspotIndex,
} from 'genome-nexus-ts-api-client';
import {
    extractGenomicLocation,
    genomicLocationString,
} from './genomicLocationUtils';

export function indexHotspots(hotspots: AggregatedHotspots[]): IHotspotIndex {
    const index: IHotspotIndex = {};

    hotspots.forEach(aggregatedHotspots => {
        index[genomicLocationString(aggregatedHotspots.genomicLocation)] =
            aggregatedHotspots;
    });

    return index;
}

export function filterHotspotsByMutation(
    mutation: Mutation,
    index: IHotspotIndex,
    filter?: (hotspot: Hotspot) => boolean
): Hotspot[] {
    const genomicLocation = extractGenomicLocation(mutation);
    const aggregatedHotspots = genomicLocation
        ? index[genomicLocationString(genomicLocation)]
        : undefined;

    let hotspots: Hotspot[] = aggregatedHotspots?.hotspots || [];

    if (filter) {
        hotspots = hotspots.filter(filter);
    }

    return hotspots;
}

export function filterLinearClusterHotspotsByMutations(
    mutations: Mutation[],
    index: IHotspotIndex
): Hotspot[] {
    return _.flatten(
        mutations.map(mutation => {
            if (
                mutation.mutationType &&
                mutation.mutationType.toLowerCase().includes('splice')
            ) {
                return filterHotspotsByMutation(
                    mutation,
                    index,
                    hotspot =>
                        hotspot.type.toLowerCase().includes('splice')
                );
            }

            return filterHotspotsByMutation(
                mutation,
                index,
                hotspot =>
                    hotspot.type.toLowerCase().includes('single') ||
                    hotspot.type.toLowerCase().includes('indel')
            );
        })
    );
}

export function isLinearClusterHotspot(
    mutation: Mutation,
    index: IHotspotIndex
): boolean {
    return filterLinearClusterHotspotsByMutations([mutation], index).length > 0;
}
