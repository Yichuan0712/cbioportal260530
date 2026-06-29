import _ from 'lodash';
import { Mutation } from 'cbioportal-ts-api-client';
import { IPdbChain } from 'shared/model/Pdb';

export function groupMutationsByProteinStart(
    mutations: Mutation[]
): Mutation[][] {
    const grouped = _.groupBy(
        mutations.filter(m => m.proteinPosStart != null),
        m => `${m.proteinPosStart}`
    );
    return Object.values(grouped);
}

/** Official MutationMapper default: one mutation per group (mergeMutationsBy unset). */
export function groupMutationsForMutationMapper(
    mutations: Mutation[]
): Mutation[][] {
    return mutations.map(mutation => [mutation]);
}

/** Positions with the most mutation records within the PDB chain alignment range. */
export function pickSelectedPositions(
    mutations: Mutation[],
    chain: IPdbChain,
    maxPositions: number = 3
): number[] {
    const inRange = mutations.filter(
        m =>
            m.proteinPosStart != null &&
            m.proteinPosStart >= chain.uniprotStart &&
            m.proteinPosStart <= chain.uniprotEnd
    );

    const byPosition = _.countBy(inRange, m => `${m.proteinPosStart}`);
    return _(byPosition)
        .toPairs()
        .sortBy(([, count]) => -count)
        .slice(0, maxPositions)
        .map(([pos]) => parseInt(pos, 10))
        .value();
}

export function countMutationsInRange(
    mutations: Mutation[],
    chain: IPdbChain
): number {
    return mutations.filter(
        m =>
            m.proteinPosStart != null &&
            m.proteinPosStart >= chain.uniprotStart &&
            m.proteinPosStart <= chain.uniprotEnd
    ).length;
}
