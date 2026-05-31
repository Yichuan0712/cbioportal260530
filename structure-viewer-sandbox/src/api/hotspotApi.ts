import { Mutation } from 'cbioportal-ts-api-client';
import {
    AggregatedHotspots,
    IHotspotIndex,
} from 'genome-nexus-ts-api-client';
import { GENOME_NEXUS_API_BASE } from './sandboxApiConfig';
import { indexHotspots } from '../lib/cancerHotspotUtils';
import { uniqueGenomicLocations } from '../lib/genomicLocationUtils';

const HOTSPOT_BATCH_SIZE = 200;

async function parseJson<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
            `Genome Nexus hotspot request failed (${response.status}): ${text || response.statusText}`
        );
    }

    return response.json();
}

async function fetchHotspotBatch(
    genomicLocations: ReturnType<typeof uniqueGenomicLocations>
): Promise<AggregatedHotspots[]> {
    if (genomicLocations.length === 0) {
        return [];
    }

    const url = `${GENOME_NEXUS_API_BASE}/cancer_hotspots/genomic`;

    return parseJson<AggregatedHotspots[]>(
        await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(genomicLocations),
        })
    );
}

export async function fetchHotspotIndexForMutations(
    mutations: Partial<Mutation>[]
): Promise<IHotspotIndex> {
    const genomicLocations = uniqueGenomicLocations(mutations);

    if (genomicLocations.length === 0) {
        return {};
    }

    const batches: AggregatedHotspots[] = [];

    for (let i = 0; i < genomicLocations.length; i += HOTSPOT_BATCH_SIZE) {
        const batch = genomicLocations.slice(i, i + HOTSPOT_BATCH_SIZE);
        batches.push(...(await fetchHotspotBatch(batch)));
    }

    return indexHotspots(batches);
}
