import { describe, expect, it } from 'vitest';
import {
    ALPHAFOLD_PLDDT_LOW_THRESHOLD,
    getAlphaFoldPlddtColorscheme,
    getLowPlddtPositions,
    isLowPlddt,
} from './AlphaFoldPlddtUtils';

describe('AlphaFoldPlddtUtils', () => {
    it('flags low-confidence pLDDT scores', () => {
        expect(isLowPlddt(49.9)).toBe(true);
        expect(isLowPlddt(ALPHAFOLD_PLDDT_LOW_THRESHOLD)).toBe(false);
        expect(isLowPlddt(90)).toBe(false);
    });

    it('returns low-confidence positions of interest', () => {
        const plddtByResidue = {
            10: 45,
            20: 55,
            30: 80,
        };

        expect(getLowPlddtPositions(plddtByResidue, [10, 20, 30, 40])).toEqual([
            10,
        ]);
    });

    it('builds 3Dmol pLDDT colorscheme from B-factor column', () => {
        const scheme = getAlphaFoldPlddtColorscheme();

        expect(scheme.prop).toBe('b');
        expect(scheme.min).toBe(0);
        expect(scheme.max).toBe(100);
        expect(scheme.colors).toHaveLength(4);
    });
});
