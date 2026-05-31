import { describe, expect, it } from 'vitest';
import {
    ALPHAFOLD_DEFAULT_CHAIN,
    ALPHAFOLD_DEFAULT_ISOFORM,
    ALPHAFOLD_MODEL_VERSION,
    generateAlphaFoldInfoSummary,
    getAlphaFoldApiUrl,
    getAlphaFoldEntryUrl,
    getAlphaFoldModelId,
    getAlphaFoldModelUrl,
    getAlphaFoldModelUrlCandidates,
    parseIsoformFromEntryId,
} from './AlphaFoldUtils';

describe('AlphaFoldUtils', () => {
    it('builds model id and URLs', () => {
        expect(getAlphaFoldModelId('P04637')).toBe('AF-P04637-F1');
        expect(getAlphaFoldModelId('p04637', 2)).toBe('AF-P04637-F2');

        expect(getAlphaFoldModelUrl('P04637')).toBe(
            `https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v${ALPHAFOLD_MODEL_VERSION}.cif`
        );

        expect(getAlphaFoldEntryUrl('p04637')).toBe(
            'https://alphafold.ebi.ac.uk/entry/P04637'
        );

        expect(getAlphaFoldApiUrl('P04637')).toBe(
            'https://alphafold.ebi.ac.uk/api/prediction/P04637'
        );
    });

    it('parses isoform from entry id', () => {
        expect(parseIsoformFromEntryId('AF-P04637-F1')).toBe(1);
        expect(parseIsoformFromEntryId('AF-P04637-F3')).toBe(3);
        expect(parseIsoformFromEntryId('AF-P04637')).toBe(
            ALPHAFOLD_DEFAULT_ISOFORM
        );
    });

    it('returns version fallback URL candidates', () => {
        const urls = getAlphaFoldModelUrlCandidates('P04637', {
            isoform: 1,
            format: 'cif',
        });

        expect(urls).toEqual([
            'https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif',
            'https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v4.cif',
        ]);
    });

    it('generates AlphaFold info summary', () => {
        const summary = generateAlphaFoldInfoSummary({
            entryId: 'AF-P04637-F1',
            uniprotAccession: 'P04637',
            uniprotDescription: 'Cellular tumor antigen p53',
            organismScientificName: 'Homo sapiens',
            chainId: ALPHAFOLD_DEFAULT_CHAIN,
            isoform: 1,
            latestVersion: 6,
            globalMetricValue: 72.4,
        });

        expect(summary.entryId).toBe('AF-P04637-F1');
        expect(summary.modelInfo).toContain('cellular tumor antigen p53');
        expect(summary.modelInfo).toContain('model v6');
        expect(summary.modelInfo).toContain('mean pLDDT 72.4');
        expect(summary.moleculeInfo).toBe('cellular tumor antigen p53');
    });
});
