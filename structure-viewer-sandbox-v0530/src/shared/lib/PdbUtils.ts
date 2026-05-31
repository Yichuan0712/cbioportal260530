import _ from 'lodash';
import { PdbHeader } from 'genome-nexus-ts-api-client';

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
