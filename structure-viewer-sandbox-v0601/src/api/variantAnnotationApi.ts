import { Mutation } from 'cbioportal-ts-api-client';
import { VariantAnnotation } from 'genome-nexus-ts-api-client';
import {
    GENOME_NEXUS_API_BASE,
    SANDBOX_ISOFORM_OVERRIDE_SOURCE,
} from './sandboxApiConfig';
import {
    indexAnnotationsByGenomicLocation,
    uniqueGenomicLocations,
} from '../lib/genomicLocationUtils';

export const DEFAULT_VARIANT_ANNOTATION_FIELDS = [
    'annotation_summary',
    'hotspots',
    'mutation_assessor',
    'clinvar',
    'oncokb',
] as const;

async function parseJson<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
            `Genome Nexus annotation request failed (${response.status}): ${text || response.statusText}`
        );
    }

    return response.json();
}

export async function fetchVariantAnnotationsByMutation(
    mutations: Partial<Mutation>[],
    fields: readonly string[] = DEFAULT_VARIANT_ANNOTATION_FIELDS
): Promise<VariantAnnotation[]> {
    const genomicLocations = uniqueGenomicLocations(mutations);

    if (genomicLocations.length === 0) {
        return [];
    }

    const params = new URLSearchParams({
        isoformOverrideSource: SANDBOX_ISOFORM_OVERRIDE_SOURCE,
        fields: fields.join(','),
    });

    const url = `${GENOME_NEXUS_API_BASE}/annotation/genomic?${params}`;

    return parseJson<VariantAnnotation[]>(
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

export async function fetchVariantAnnotationsIndexedByGenomicLocation(
    mutations: Partial<Mutation>[],
    fields: readonly string[] = DEFAULT_VARIANT_ANNOTATION_FIELDS
): Promise<{ [genomicLocation: string]: VariantAnnotation }> {
    const annotations = await fetchVariantAnnotationsByMutation(
        mutations,
        fields
    );

    return indexAnnotationsByGenomicLocation(annotations);
}
