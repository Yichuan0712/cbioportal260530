import _ from 'lodash';
import { MolecularProfile, Mutation, Sample } from 'cbioportal-ts-api-client';

const GERMLINE_REGEXP = /germline/i;

function toSampleUuid(studyId: string, sampleId?: string): string {
    return `${studyId}_${sampleId}`;
}

function stringListToSet(list: string[]): Record<string, boolean> {
    const set: Record<string, boolean> = {};
    list.forEach(value => {
        set[value] = true;
    });
    return set;
}

/**
 * Percentage of cohort samples with a somatic mutation in the given gene.
 * Mirrors cBioPortal Results View MutationRateSummary.
 */
export function somaticMutationRate(
    hugoGeneSymbol: string,
    mutations: Mutation[],
    molecularProfileIdToMolecularProfile: {
        [molecularProfileId: string]: Pick<MolecularProfile, 'studyId'>;
    },
    samples: Pick<Sample, 'studyId' | 'sampleId'>[]
): number {
    if (mutations.length === 0 || samples.length === 0) {
        return 0;
    }

    const sampleIds = stringListToSet(samples.map(s => toSampleUuid(s.studyId, s.sampleId)));

    return (
        (_.chain(mutations)
            .filter((mutation: Mutation) => {
                const profile =
                    molecularProfileIdToMolecularProfile[
                        mutation.molecularProfileId
                    ];

                if (!profile) {
                    return false;
                }

                return (
                    mutation.gene.hugoGeneSymbol === hugoGeneSymbol &&
                    !GERMLINE_REGEXP.test(mutation.mutationStatus || '') &&
                    !!sampleIds[
                        toSampleUuid(profile.studyId, mutation.sampleId)
                    ]
                );
            })
            .map(mutation => {
                const profile =
                    molecularProfileIdToMolecularProfile[
                        mutation.molecularProfileId
                    ]!;
                return toSampleUuid(profile.studyId, mutation.sampleId);
            })
            .uniq()
            .value().length *
            100.0) /
        samples.length
    );
}
