import _ from 'lodash';
import { Mutation } from 'cbioportal-ts-api-client';
import { GenomicLocation, VariantAnnotation } from 'genome-nexus-ts-api-client';

function findChromosome(
    mutation: Partial<Mutation & { chr?: string; chromosome?: string }>
): string | undefined {
    return mutation.chromosome || mutation.chr;
}

export function extractGenomicLocation(
    mutation: Partial<Mutation & { chr?: string; chromosome?: string }>
): GenomicLocation | undefined {
    const chromosome = findChromosome(mutation);

    if (
        chromosome &&
        mutation.startPosition &&
        mutation.endPosition &&
        mutation.referenceAllele &&
        mutation.variantAllele
    ) {
        return {
            chromosome: chromosome.replace(/^chr/i, ''),
            start: mutation.startPosition,
            end: mutation.endPosition,
            referenceAllele: mutation.referenceAllele,
            variantAllele: mutation.variantAllele,
        };
    }

    return undefined;
}

export function hasValidGenomicLocation(
    mutation: Partial<Mutation & { chr?: string; chromosome?: string }>
): boolean {
    if (
        findChromosome(mutation) &&
        mutation.startPosition &&
        mutation.startPosition !== -1 &&
        mutation.endPosition &&
        mutation.endPosition !== -1 &&
        mutation.referenceAllele &&
        mutation.referenceAllele !== 'NA' &&
        mutation.variantAllele &&
        mutation.variantAllele !== 'NA'
    ) {
        if (
            mutation.referenceAllele === '-' &&
            mutation.variantAllele === '-'
        ) {
            return false;
        }

        return true;
    }

    return false;
}

export function genomicLocationString(genomicLocation: GenomicLocation): string {
    return `${genomicLocation.chromosome},${genomicLocation.start},${genomicLocation.end},${genomicLocation.referenceAllele},${genomicLocation.variantAllele}`;
}

export function uniqueGenomicLocations(
    mutations: Partial<Mutation>[]
): GenomicLocation[] {
    const genomicLocationMap: { [key: string]: GenomicLocation } = {};

    mutations.forEach((mutation: Partial<Mutation>) => {
        const genomicLocation = extractGenomicLocation(mutation);

        if (genomicLocation) {
            genomicLocationMap[genomicLocationString(genomicLocation)] =
                genomicLocation;
        }
    });

    return _.values(genomicLocationMap);
}

export function genomicLocationStringFromVariantAnnotation(
    annotation: VariantAnnotation
): string | undefined {
    if (
        !annotation.seq_region_name ||
        annotation.start == null ||
        annotation.end == null ||
        !annotation.allele_string
    ) {
        return undefined;
    }

    const alleles = annotation.allele_string.split('/');

    if (alleles.length < 2) {
        return undefined;
    }

    return genomicLocationString({
        chromosome: annotation.seq_region_name.replace(/^chr/i, ''),
        start: annotation.start,
        end: annotation.end,
        referenceAllele: alleles[0],
        variantAllele: alleles[1],
    });
}

export function indexAnnotationsByGenomicLocation(
    variantAnnotations: VariantAnnotation[]
): { [genomicLocation: string]: VariantAnnotation } {
    const map: { [genomicLocation: string]: VariantAnnotation } = {};

    variantAnnotations.forEach(annotation => {
        const key =
            annotation.originalVariantQuery ||
            genomicLocationStringFromVariantAnnotation(annotation);

        if (key) {
            map[key] = annotation;
        }
    });

    return map;
}
