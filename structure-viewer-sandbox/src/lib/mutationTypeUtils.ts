import _ from 'lodash';
import { Mutation } from 'cbioportal-ts-api-client';
import {
    getCanonicalMutationType,
    getProteinImpactTypeFromCanonical,
    ProteinImpactType,
    CanonicalMutationType,
} from './getCanonicalMutationType';
import {
    DEFAULT_PROTEIN_IMPACT_TYPE_COLORS,
    IProteinImpactTypeColors,
} from './proteinImpactColors';

export const MUTATION_TYPE_PRIORITY: {
    [canonicalMutationType: string]: number;
} = {
    missense: 1,
    inframe: 2,
    truncating: 4,
    nonsense: 6,
    nonstop: 7,
    nonstart: 8,
    frameshift: 4,
    frame_shift_del: 4,
    frame_shift_ins: 5,
    in_frame_ins: 3,
    in_frame_del: 2,
    splice_site: 9,
    fusion: 10,
    silent: 11,
    other: 11,
};

/** Same logic as react-mutation-mapper MutationTypeUtils.getColorForProteinImpactType */
export function getColorForProteinImpactType<T extends Mutation>(
    mutations: Partial<T>[],
    colors: IProteinImpactTypeColors = DEFAULT_PROTEIN_IMPACT_TYPE_COLORS,
    getMutationCount: (mutation: Partial<T>) => number = () => 1,
    isPutativeDriver?: (mutation: Partial<T>) => boolean
): string {
    const processedMutations = mutations.map(m => {
        return {
            count: Math.ceil(getMutationCount(m)),
            isPutativeDriver: !!(!isPutativeDriver || isPutativeDriver(m)),
            canonicalType: getCanonicalMutationType(
                (m.mutationType || '') as string
            ),
        };
    });

    const counts: {
        [key: string]: {
            count: number;
            isPutativeDriver: boolean;
            canonicalType: string;
        };
    } = {};

    for (const pMut of processedMutations) {
        const key = `${pMut.canonicalType}_${pMut.isPutativeDriver}`;
        counts[key] = counts[key] || {
            count: 0,
            isPutativeDriver: pMut.isPutativeDriver,
            canonicalType: pMut.canonicalType,
        };
        counts[key].count += pMut.count;
    }

    const sortedMutations = _.sortBy(_.values(counts), [
        pMut => (pMut.isPutativeDriver ? 0 : 1),
        pMut => -pMut.count,
        pMut => MUTATION_TYPE_PRIORITY[pMut.canonicalType],
    ]);

    if (sortedMutations.length > 0) {
        const chosenMutation = sortedMutations[0];
        const proteinImpactType = getProteinImpactTypeFromCanonical(
            chosenMutation.canonicalType as CanonicalMutationType
        );

        switch (proteinImpactType) {
            case ProteinImpactType.MISSENSE:
                return chosenMutation.isPutativeDriver
                    ? colors.missenseColor
                    : colors.missenseVusColor;
            case ProteinImpactType.TRUNCATING:
                return chosenMutation.isPutativeDriver
                    ? colors.truncatingColor
                    : colors.truncatingVusColor;
            case ProteinImpactType.INFRAME:
                return chosenMutation.isPutativeDriver
                    ? colors.inframeColor
                    : colors.inframeVusColor;
            case ProteinImpactType.FUSION:
                return chosenMutation.isPutativeDriver
                    ? colors.fusionColor
                    : colors.fusionVusColor;
            case ProteinImpactType.SPLICE:
                return chosenMutation.isPutativeDriver
                    ? colors.spliceColor
                    : colors.spliceVusColor;
            case ProteinImpactType.OTHER:
                return chosenMutation.isPutativeDriver
                    ? colors.otherColor
                    : colors.otherVusColor;
            default:
                return colors.otherColor;
        }
    }

    return '#FF0000';
}
