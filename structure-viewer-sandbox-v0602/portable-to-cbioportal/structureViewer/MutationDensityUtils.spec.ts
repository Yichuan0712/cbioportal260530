import { describe, expect, it } from 'vitest';
import {
    getColorForMutationDensity,
    getMaxMutationCount,
    MUTATION_DENSITY_COLOR_HIGH,
    MUTATION_DENSITY_COLOR_LOW,
} from './MutationDensityUtils';

describe('MutationDensityUtils', () => {
    it('finds the maximum mutation count across positions', () => {
        expect(
            getMaxMutationCount({
                '10': [{}, {}],
                '20': [{}],
            })
        ).toBe(2);

        expect(getMaxMutationCount({})).toBe(1);
    });

    it('maps count to a light-to-dark gradient', () => {
        expect(getColorForMutationDensity(1, 4).toLowerCase()).toBe(
            MUTATION_DENSITY_COLOR_LOW.toLowerCase()
        );
        expect(getColorForMutationDensity(4, 4).toLowerCase()).toBe(
            MUTATION_DENSITY_COLOR_HIGH.toLowerCase()
        );
        expect(getColorForMutationDensity(0, 3).toLowerCase()).toBe(
            MUTATION_DENSITY_COLOR_LOW.toLowerCase()
        );
        expect(getColorForMutationDensity(2, 1).toLowerCase()).toBe(
            MUTATION_DENSITY_COLOR_HIGH.toLowerCase()
        );
    });

    it('interpolates intermediate counts', () => {
        const mid = getColorForMutationDensity(2, 4);

        expect(mid).not.toBe(MUTATION_DENSITY_COLOR_LOW);
        expect(mid).not.toBe(MUTATION_DENSITY_COLOR_HIGH);
        expect(mid).toMatch(/^#[0-9a-f]{6}$/i);
    });
});
