import { describe, expect, it } from 'vitest';
import {
    formatMutationDetailLines,
    formatMutationLabelShort,
    getMutationDisplayName,
} from './VariantAnnotationFormatting';
import { buildMutationLabels } from './MutationLabelUtils';

describe('VariantAnnotationFormatting', () => {
    const mutation = {
        proteinChange: 'p.R280Q',
        mutationType: 'Missense_Mutation',
        chr: '17',
        startPosition: 70117528,
        endPosition: 70117528,
        referenceAllele: 'G',
        variantAllele: 'A',
    };

    const indexed = {
        '17,70117528,70117528,G,A': {
            originalVariantQuery: '17,70117528,70117528,G,A',
            hgvsg: '17:g.70117528G>A',
            annotation_summary: {
                transcriptConsequenceSummary: {
                    hgvsp: 'p.Arg280Gln',
                    hgvspShort: 'p.R280Q',
                    hgvsc: 'c.839G>A',
                    consequenceTerms: 'missense_variant',
                    siftPrediction: 'deleterious',
                    polyphenPrediction: 'probably_damaging',
                },
            },
            mutation_assessor: {
                functionalImpactPrediction: 'medium',
                functionalImpactScore: 2.1,
            },
        },
    };

    it('formats display name from protein change', () => {
        expect(getMutationDisplayName(mutation)).toBe('p.R280Q');
    });

    it('builds short labels from Genome Nexus annotation', () => {
        expect(formatMutationLabelShort([mutation], indexed)).toBe('p.R280Q');
        expect(formatMutationLabelShort([mutation, mutation], indexed)).toBe(
            'p.R280Q (2)'
        );
    });

    it('builds detailed annotation lines', () => {
        const lines = formatMutationDetailLines([mutation], indexed);

        expect(lines.some(line => line.includes('SIFT'))).toBe(true);
        expect(lines.some(line => line.includes('PolyPhen'))).toBe(true);
        expect(lines.some(line => line.includes('Mutation Assessor'))).toBe(
            true
        );
        expect(lines.some(line => line.includes('17:g.70117528G>A'))).toBe(true);
    });
});

describe('MutationLabelUtils', () => {
    it('builds structure labels for all mapped mutations', () => {
        const labels = buildMutationLabels({
            mutationsByPosition: {
                280: [{ proteinChange: 'p.R280Q' } as any],
                320: [{ proteinChange: 'p.K320fs' } as any],
            },
            proteinToStructurePosition: position => position,
            isHighlighted: position => position === 280,
        });

        expect(labels).toHaveLength(2);
        expect(labels[0].structurePosition).toBe(280);
        expect(labels[0].highlighted).toBe(true);
        expect(labels[1].structurePosition).toBe(320);
    });
});
