import { describe, expect, it } from 'vitest';
import {
    buildPaePairDetail,
    formatPaeSummaryForCell,
    formatPaeSummaryForPosition,
    getAlphaFoldPaeColor,
    getPaeCellSummary,
    parseAlphaFoldPaeJson,
    resolveAlphaFoldDocUrl,
} from './AlphaFoldPaeUtils';

describe('AlphaFoldPaeUtils', () => {
    it('rewrites EBI file URLs through the dev proxy base', () => {
        expect(
            resolveAlphaFoldDocUrl(
                'https://alphafold.ebi.ac.uk/files/AF-P04637-F1-predicted_aligned_error_v6.json',
                '/alphafold-files'
            )
        ).toBe(
            '/alphafold-files/AF-P04637-F1-predicted_aligned_error_v6.json'
        );
    });

    it('parses predicted_aligned_error matrix JSON', () => {
        const parsed = parseAlphaFoldPaeJson({
            predicted_aligned_error: [
                [0, 2],
                [2, 0],
            ],
            max_predicted_aligned_error: 31.75,
        });

        expect(parsed.length).toBe(2);
        expect(parsed.maxPae).toBe(31.75);
        expect(parsed.matrix[1][0]).toBe(2);
    });

    it('maps low PAE to blue and high PAE to warm colors', () => {
        const low = getAlphaFoldPaeColor(0, 31.75);
        const high = getAlphaFoldPaeColor(31.75, 31.75);

        expect(low.b).toBeGreaterThan(low.r);
        expect(high.r).toBeGreaterThan(high.b);
    });

    it('summarizes PAE row for a selected position', () => {
        const summary = formatPaeSummaryForPosition(
            [
                [0, 4, 8],
                [4, 0, 6],
                [8, 6, 0],
            ],
            2,
            31.75
        );

        expect(summary).toContain('position 2');
        expect(summary).toContain('mean 3.3');
    });

    it('summarizes a single PAE matrix cell', () => {
        const summary = formatPaeSummaryForCell(
            [
                [0, 4, 8],
                [4, 0, 6],
                [8, 6, 0],
            ],
            1,
            3,
            31.75
        );

        expect(summary).toContain('PAE (1, 3)');
        expect(summary).toContain('8.0 Å');
    });

    it('builds PAE pair detail for off-diagonal cells', () => {
        const detail = buildPaePairDetail(
            [
                [0, 4, 8],
                [4, 0, 6],
                [8, 6, 0],
            ],
            2,
            3,
            31.75
        );

        expect(detail?.paeValue).toBe(6);
        expect(detail?.alignedResi).toBe(2);
        expect(detail?.partnerResi).toBe(3);
        expect(detail?.lines.join(' ')).toContain('Partner residue 3');
    });

    it('builds compact PAE cell summary for overlay', () => {
        const summary = getPaeCellSummary(
            [
                [0, 4, 8],
                [4, 0, 6],
                [8, 6, 0],
            ],
            1,
            3
        );

        expect(summary?.paeValue).toBe(8);
        expect(summary?.i).toBe(1);
        expect(summary?.j).toBe(3);
    });
});
