import _ from 'lodash';
import { Alignment, PdbHeader } from 'genome-nexus-ts-api-client';
import {
    IPdbChain,
    PdbAlignmentIndex,
    ALIGNMENT_GAP,
    ALIGNMENT_MINUS,
    ALIGNMENT_PLUS,
    ALIGNMENT_SPACE,
} from 'shared/model/Pdb';

export const PDB_IGNORELIST = ['5xzc'];

export function generatePdbInfoSummary(pdbHeader: PdbHeader, chainId: string) {
    const summary: {
        pdbInfo: string;
        moleculeInfo?: string;
    } = {
        pdbInfo: pdbHeader.title,
    };

    _.find(pdbHeader.compound, (mol: any) => {
        if (
            mol.molecule &&
            _.indexOf(mol.chain, chainId.toLowerCase()) !== -1
        ) {
            summary.moleculeInfo = mol.molecule;
            return mol;
        }
    });

    return summary;
}

export function indexPdbAlignments(alignments: Alignment[]): PdbAlignmentIndex {
    return groupAlignmentsByPdbIdAndChain(alignments);
}

export function mergeIndexedPdbAlignments(
    indexedPdbData: PdbAlignmentIndex
): IPdbChain[] {
    const chains: IPdbChain[] = [];

    _.each(indexedPdbData, (map: { [chainId: string]: Alignment[] }) => {
        _.each(map, (chainAlignments: Alignment[]) => {
            const chain = mergeAlignments(chainAlignments);
            if (chain) {
                chains.push(chain);
            }
        });
    });

    return chains;
}

export function sortMergedPdbChains(chains: IPdbChain[]): IPdbChain[] {
    return [...chains].sort((a, b) => {
        const metrics = (pdbChain: IPdbChain) => [
            pdbChain.identity,
            pdbChain.alignment.length,
            pdbChain.identityPerc,
            ...calcPdbIdNumericalValue(pdbChain.pdbId, true),
            -1 * pdbChain.chain.charCodeAt(0),
        ];
        const aMetrics = metrics(a);
        const bMetrics = metrics(b);
        for (let i = 0; i < aMetrics.length; i++) {
            if (aMetrics[i] !== bMetrics[i]) {
                return bMetrics[i] - aMetrics[i];
            }
        }
        return 0;
    });
}

function groupAlignmentsByPdbIdAndChain(alignments: Alignment[]) {
    const groupedAlignments: PdbAlignmentIndex = {};

    alignments.forEach((alignment: Alignment) => {
        if (!groupedAlignments[alignment.pdbId]) {
            groupedAlignments[alignment.pdbId] = {};
        }

        if (!groupedAlignments[alignment.pdbId][alignment.chain]) {
            groupedAlignments[alignment.pdbId][alignment.chain] = [];
        }

        groupedAlignments[alignment.pdbId][alignment.chain].push(alignment);
    });

    return groupedAlignments;
}

export function mergeAlignments(
    alignments: Alignment[]
): IPdbChain | undefined {
    let mergedAlignment = '';
    let start: number;

    if (alignments.length > 0 && alignments[0].seqFrom !== undefined) {
        start = alignments[0].seqFrom;
    } else {
        return undefined;
    }

    alignments.forEach((alignment: Alignment) => {
        if (alignment.seqFrom === undefined) {
            return;
        }
        const alignmentStr = generateAlignmentString(alignment) || '';
        const diff = Math.abs(alignment.seqFrom - start);

        if (alignment.seqFrom < start) {
            const gapOrOverlap = Math.abs(alignmentStr.length - diff);

            if (alignmentStr.length >= diff) {
                mergedAlignment =
                    alignmentStr + mergedAlignment.substr(gapOrOverlap);
            } else {
                mergedAlignment =
                    alignmentStr + alignmentGap(gapOrOverlap) + mergedAlignment;
            }
        } else if (alignment.seqFrom >= start) {
            const gapOrOverlap = Math.abs(mergedAlignment.length - diff);

            if (mergedAlignment.length >= diff) {
                mergedAlignment =
                    mergedAlignment.substr(
                        0,
                        mergedAlignment.length - gapOrOverlap
                    ) +
                    alignmentStr +
                    mergedAlignment.substr(
                        mergedAlignment.length -
                            gapOrOverlap +
                            alignmentStr.length
                    );
            } else {
                mergedAlignment =
                    mergedAlignment + alignmentGap(gapOrOverlap) + alignmentStr;
            }
        }

        start = Math.min(start, alignment.seqFrom);
    });

    return {
        pdbId: alignments[0].pdbId,
        chain: alignments[0].chain,
        uniprotStart: start,
        uniprotEnd: start + mergedAlignment.length - 1,
        alignment: mergedAlignment,
        identityPerc: calcIdentityPerc(mergedAlignment),
        identity: calcIdentity(mergedAlignment),
    };
}

function alignmentGap(length: number) {
    const gap: string[] = [];
    for (let i = 0; i < length; i++) {
        gap.push(ALIGNMENT_GAP);
    }
    return gap.join('');
}

export function generateAlignmentString(
    alignment: Alignment
): string | undefined {
    const midline = alignment.midlineAlign;
    const uniprot = alignment.seqAlign;
    const pdb = alignment.pdbAlign;

    if (
        !midline ||
        !uniprot ||
        !pdb ||
        midline.length !== uniprot.length ||
        midline.length !== pdb.length
    ) {
        return undefined;
    }

    const stringBuilder = [];

    for (let i = 0; i < midline.length; i++) {
        if (uniprot[i] !== '-') {
            if (pdb[i] === '-') {
                stringBuilder.push('-');
            } else {
                stringBuilder.push(midline[i]);
            }
        }
    }

    return stringBuilder.join('');
}

function calcIdentityPerc(alignment: string): number {
    let gap = 0;
    let mismatch = 0;

    for (let i = 0; i < alignment.length; i++) {
        const symbol = alignment[i];

        if (symbol === ALIGNMENT_GAP) {
            gap++;
        } else if (
            symbol === ALIGNMENT_MINUS ||
            symbol === ALIGNMENT_PLUS ||
            symbol === ALIGNMENT_SPACE
        ) {
            mismatch++;
        }
    }

    return 1.0 - mismatch / (alignment.length - gap);
}

function calcIdentity(alignment: string) {
    alignment = alignment.toLowerCase();
    let match = 0;

    for (let i = 0; i < alignment.length; i++) {
        if (alignment[i].match(/[a-z]/)) {
            match++;
        }
    }

    return match;
}

export function calcPdbIdNumericalValue(
    pdbId: string,
    invert?: boolean
): number[] {
    const values = [0, 0, 0, 0];
    const coeff = invert ? -1 : 1;

    for (let i = 0; i < pdbId.length || i < 5; i++) {
        values.push(coeff * pdbId.charCodeAt(i));
    }

    return values;
}
