import _ from 'lodash';
import { Mutation } from 'cbioportal-ts-api-client';
import {
    DEFAULT_PROTEIN_IMPACT_TYPE_COLORS,
    getColorForProteinImpactType as getDefaultColorForProteinImpactType,
    IProteinImpactTypeColors,
} from '../../lib/proteinImpact';

export function groupMutationsByProteinStartPos(
    mutationData: Mutation[][]
): { [pos: number]: Mutation[] } {
    const map: { [pos: number]: Mutation[] } = {};

    for (const mutations of mutationData) {
        for (const mutation of mutations) {
            const codon = mutation.proteinPosStart;

            if (codon !== undefined && codon !== null) {
                map[codon] = map[codon] || [];
                map[codon].push(mutation);
            }
        }
    }

    return map;
}

export function getProteinStartPositionsByRange(
    data: Mutation[][],
    start: number,
    end: number
) {
    const positions: number[] = [];

    data.forEach((mutations: Mutation[]) => {
        const mutation = mutations[0];

        if (
            mutation.proteinPosStart > -1 &&
            mutation.proteinPosStart >= start &&
            mutation.proteinPosStart <= end
        ) {
            positions.push(mutation.proteinPosStart);
        }

        if (
            mutation.proteinPosEnd > mutation.proteinPosStart &&
            mutation.proteinPosEnd >= start &&
            mutation.proteinPosEnd <= end
        ) {
            positions.push(mutation.proteinPosEnd);
        }
    });

    return _.uniq(positions);
}

export function getColorForProteinImpactType(
    mutations: Mutation[],
    colors: IProteinImpactTypeColors = DEFAULT_PROTEIN_IMPACT_TYPE_COLORS,
    isPutativeDriver?: (mutation: Partial<Mutation>) => boolean
): string {
    return getDefaultColorForProteinImpactType(
        mutations,
        colors,
        undefined,
        isPutativeDriver
    );
}
