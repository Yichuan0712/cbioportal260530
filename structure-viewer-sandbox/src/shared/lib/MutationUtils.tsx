import _ from 'lodash';
import { observable, computed, action, makeObservable } from 'mobx';
import { Mutation } from 'cbioportal-ts-api-client';
import { IProteinImpactTypeColors } from 'react-mutation-mapper';
import { DEFAULT_PROTEIN_IMPACT_TYPE_COLORS } from '../../lib/proteinImpact';

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
    colors: IProteinImpactTypeColors = DEFAULT_PROTEIN_IMPACT_TYPE_COLORS
): string {
    const mutationType = (mutations[0]?.mutationType || '').toLowerCase();

    if (mutationType.includes('missense')) {
        return colors.missenseColor;
    }
    if (
        mutationType.includes('trunc') ||
        mutationType.includes('nonsense') ||
        mutationType.includes('nonstop') ||
        mutationType.includes('frame_shift')
    ) {
        return colors.truncatingColor;
    }
    if (mutationType.includes('inframe') || mutationType.includes('in_frame')) {
        return colors.inframeColor;
    }
    if (mutationType.includes('splice')) {
        return colors.spliceColor;
    }
    if (mutationType.includes('fusion')) {
        return colors.fusionColor;
    }

    return colors.otherColor;
}
