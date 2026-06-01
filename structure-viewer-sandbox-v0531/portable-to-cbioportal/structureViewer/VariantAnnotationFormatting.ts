import { Mutation } from 'cbioportal-ts-api-client';
import { VariantAnnotation } from 'genome-nexus-ts-api-client';
import { getVariantAnnotationForMutation } from './GenomicLocationUtils';

export function getMutationDisplayName(mutation: Partial<Mutation>): string {
    return (
        mutation.proteinChange ||
        mutation.aminoAcidChange ||
        (mutation.proteinPosStart != null
            ? `p.${mutation.proteinPosStart}`
            : 'mutation')
    );
}

export function formatMutationLabelShort(
    mutations: Partial<Mutation>[],
    indexedVariantAnnotations?: {
        [genomicLocation: string]: VariantAnnotation;
    }
): string {
    const primary = mutations[0];
    const annotation = primary
        ? getVariantAnnotationForMutation(primary, indexedVariantAnnotations)
        : undefined;
    const hgvspShort =
        annotation?.annotation_summary?.transcriptConsequenceSummary
            ?.hgvspShort ||
        annotation?.mutation_assessor?.hgvspShort ||
        getMutationDisplayName(primary);

    if (mutations.length > 1) {
        return `${hgvspShort} (${mutations.length})`;
    }

    return hgvspShort;
}

function pushLine(lines: string[], label: string, value?: string | number) {
    if (value != null && `${value}`.length > 0) {
        lines.push(`${label}: ${value}`);
    }
}

export function formatMutationDetailLines(
    mutations: Partial<Mutation>[],
    indexedVariantAnnotations?: {
        [genomicLocation: string]: VariantAnnotation;
    }
): string[] {
    const lines: string[] = [];
    const primary = mutations[0];
    const annotation = primary
        ? getVariantAnnotationForMutation(primary, indexedVariantAnnotations)
        : undefined;
    const summary = annotation?.annotation_summary?.transcriptConsequenceSummary;

    pushLine(lines, 'Protein change', getMutationDisplayName(primary));
    pushLine(
        lines,
        'Mutation type',
        primary?.mutationType?.replace(/_/g, ' ')
    );
    pushLine(lines, 'Samples at position', mutations.length);

    if (primary?.putativeDriver || primary?.driverFilter) {
        pushLine(
            lines,
            'Driver',
            primary.driverFilterAnnotation || primary.driverFilter || 'yes'
        );
    }

    pushLine(lines, 'HGVSp', summary?.hgvsp || annotation?.mutation_assessor?.hgvspShort);
    pushLine(lines, 'HGVSc', summary?.hgvsc);
    pushLine(lines, 'HGVSG', annotation?.hgvsg);
    pushLine(lines, 'Consequence', summary?.consequenceTerms);

    if (summary?.siftPrediction) {
        pushLine(
            lines,
            'SIFT',
            `${summary.siftPrediction}${summary.siftScore != null ? ` (${summary.siftScore})` : ''}`
        );
    }

    if (summary?.polyphenPrediction) {
        pushLine(
            lines,
            'PolyPhen',
            `${summary.polyphenPrediction}${summary.polyphenScore != null ? ` (${summary.polyphenScore})` : ''}`
        );
    }

    if (annotation?.mutation_assessor?.functionalImpactPrediction) {
        pushLine(
            lines,
            'Mutation Assessor',
            `${annotation.mutation_assessor.functionalImpactPrediction}${
                annotation.mutation_assessor.functionalImpactScore != null
                    ? ` (${annotation.mutation_assessor.functionalImpactScore})`
                    : ''
            }`
        );
    }

    if (annotation?.hotspots?.annotation?.length) {
        pushLine(lines, 'Hotspot', 'yes');
    }

    const clinvarEntry =
        annotation?.clinvar?.annotation?.clinvarEntries?.[0];

    if (clinvarEntry?.clinicalSignificance) {
        pushLine(lines, 'ClinVar', clinvarEntry.clinicalSignificance);
    } else if (clinvarEntry?.title) {
        pushLine(lines, 'ClinVar', clinvarEntry.title);
    }

    if (lines.length === 0) {
        lines.push('No variant annotation available for this mutation.');
    }

    return lines;
}
