import * as React from 'react';
import _ from 'lodash';
import { Mutation } from 'cbioportal-ts-api-client';
import {
    DEFAULT_PROTEIN_IMPACT_TYPE_COLORS,
    getColorForProteinImpactType as getDefaultColorForProteinImpactType,
    IProteinImpactTypeColors,
} from '../../lib/proteinImpact';
import {
    DriverVsVusType,
    MUT_DRIVER,
    MUT_VUS,
    ProteinImpactType,
} from 'cbioportal-frontend-commons';

export const SELECTOR_VALUE_WITH_VUS = [
    ProteinImpactType.MISSENSE,
    ProteinImpactType.MISSENSE_PUTATIVE_DRIVER,
    ProteinImpactType.MISSENSE_UNKNOWN_SIGNIFICANCE,
    ProteinImpactType.TRUNCATING,
    ProteinImpactType.TRUNCATING_PUTATIVE_DRIVER,
    ProteinImpactType.TRUNCATING_UNKNOWN_SIGNIFICANCE,
    ProteinImpactType.INFRAME,
    ProteinImpactType.INFRAME_PUTATIVE_DRIVER,
    ProteinImpactType.INFRAME_UNKNOWN_SIGNIFICANCE,
    ProteinImpactType.SPLICE,
    ProteinImpactType.SPLICE_PUTATIVE_DRIVER,
    ProteinImpactType.SPLICE_UNKNOWN_SIGNIFICANCE,
    ProteinImpactType.FUSION,
    ProteinImpactType.FUSION_PUTATIVE_DRIVER,
    ProteinImpactType.FUSION_UNKNOWN_SIGNIFICANCE,
    ProteinImpactType.OTHER,
    ProteinImpactType.OTHER_PUTATIVE_DRIVER,
    ProteinImpactType.OTHER_UNKNOWN_SIGNIFICANCE,
];

export function getProteinImpactTypeOptionDisplayValueMap(proteinImpactTypeColorMap: {
    [proteinImpactType: string]: string;
}): { [proteinImpactType: string]: JSX.Element } {
    const types = [
        ...SELECTOR_VALUE_WITH_VUS,
        DriverVsVusType.DRIVER,
        DriverVsVusType.VUS,
    ];
    return _(types)
        .keyBy()
        .mapValues(cur => (
            <strong style={{ color: proteinImpactTypeColorMap[cur] }}>
                {cur.split('_')[0].replace(/^./, s => s.toUpperCase())}
            </strong>
        ))
        .value();
}

export function getProteinImpactTypeColorMap(
    colors: IProteinImpactTypeColors
): { [proteinImpactType: string]: string } {
    return {
        [ProteinImpactType.MISSENSE]: colors.missenseColor,
        [ProteinImpactType.MISSENSE_PUTATIVE_DRIVER]: colors.missenseColor,
        [ProteinImpactType.MISSENSE_UNKNOWN_SIGNIFICANCE]:
            colors.missenseVusColor,
        [ProteinImpactType.TRUNCATING]: colors.truncatingColor,
        [ProteinImpactType.TRUNCATING_PUTATIVE_DRIVER]: colors.truncatingColor,
        [ProteinImpactType.TRUNCATING_UNKNOWN_SIGNIFICANCE]:
            colors.truncatingVusColor,
        [ProteinImpactType.INFRAME]: colors.inframeColor,
        [ProteinImpactType.INFRAME_PUTATIVE_DRIVER]: colors.inframeColor,
        [ProteinImpactType.INFRAME_UNKNOWN_SIGNIFICANCE]:
            colors.inframeVusColor,
        [ProteinImpactType.SPLICE]: colors.spliceColor,
        [ProteinImpactType.SPLICE_PUTATIVE_DRIVER]: colors.spliceColor,
        [ProteinImpactType.SPLICE_UNKNOWN_SIGNIFICANCE]: colors.spliceVusColor,
        [ProteinImpactType.FUSION]: colors.fusionColor,
        [ProteinImpactType.FUSION_PUTATIVE_DRIVER]: colors.fusionColor,
        [ProteinImpactType.FUSION_UNKNOWN_SIGNIFICANCE]: colors.fusionVusColor,
        [ProteinImpactType.OTHER]: colors.otherColor,
        [ProteinImpactType.OTHER_PUTATIVE_DRIVER]: colors.otherColor,
        [ProteinImpactType.OTHER_UNKNOWN_SIGNIFICANCE]: colors.otherVusColor,
        [DriverVsVusType.DRIVER]: MUT_DRIVER,
        [DriverVsVusType.VUS]: MUT_VUS,
    };
}

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

export type { IProteinImpactTypeColors };
export { DEFAULT_PROTEIN_IMPACT_TYPE_COLORS };
