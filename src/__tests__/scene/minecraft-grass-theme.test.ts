import { describe, it, expect } from 'vitest';
import {
    KOREAN_SEASONAL_GRASS_STOPS,
    KOREAN_SNOW_COVER_STOPS,
    KOREAN_BLOSSOM_COVER_STOPS,
    KOREAN_SPRING_FLOWER_COVER_STOPS,
    KOREAN_LEAF_LITTER_COVER_STOPS,
    KOREAN_SUMMER_FLOWER_COVER_STOPS,
} from '../../scene/minecraft-grass-theme.js';

describe('seasonal grass stops', () => {
    it('has 10 color stops', () => {
        expect(KOREAN_SEASONAL_GRASS_STOPS).toHaveLength(10);
    });

    it('all stops have valid month (1-12) and day (1-31)', () => {
        for (const stop of KOREAN_SEASONAL_GRASS_STOPS) {
            expect(stop.month).toBeGreaterThanOrEqual(1);
            expect(stop.month).toBeLessThanOrEqual(12);
            expect(stop.day).toBeGreaterThanOrEqual(1);
            expect(stop.day).toBeLessThanOrEqual(31);
        }
    });

    it('all stops have valid hex color', () => {
        for (const stop of KOREAN_SEASONAL_GRASS_STOPS) {
            expect(stop.color).toMatch(/^#[0-9a-fA-F]{6}$/);
        }
    });
});

describe('snow cover stops', () => {
    it('has 8 stops', () => {
        expect(KOREAN_SNOW_COVER_STOPS).toHaveLength(8);
    });

    it('all amounts are in [0, 1]', () => {
        for (const stop of KOREAN_SNOW_COVER_STOPS) {
            expect(stop.amount).toBeGreaterThanOrEqual(0);
            expect(stop.amount).toBeLessThanOrEqual(1);
        }
    });

    it('starts and ends with zero coverage', () => {
        expect(KOREAN_SNOW_COVER_STOPS[0].amount).toBe(0);
        expect(KOREAN_SNOW_COVER_STOPS[KOREAN_SNOW_COVER_STOPS.length - 1].amount).toBe(0);
    });
});

const allOverlayStops = [
    { name: 'blossom', stops: KOREAN_BLOSSOM_COVER_STOPS, expectedLength: 6 },
    { name: 'spring flowers', stops: KOREAN_SPRING_FLOWER_COVER_STOPS, expectedLength: 6 },
    { name: 'leaf litter', stops: KOREAN_LEAF_LITTER_COVER_STOPS, expectedLength: 7 },
    { name: 'summer flowers', stops: KOREAN_SUMMER_FLOWER_COVER_STOPS, expectedLength: 7 },
];

describe.each(allOverlayStops)('$name cover stops', ({ stops, expectedLength }) => {
    it(`has ${expectedLength} stops`, () => {
        expect(stops).toHaveLength(expectedLength);
    });

    it('all amounts are in [0, 1]', () => {
        for (const stop of stops) {
            expect(stop.amount).toBeGreaterThanOrEqual(0);
            expect(stop.amount).toBeLessThanOrEqual(1);
        }
    });

    it('all stops have valid month/day', () => {
        for (const stop of stops) {
            expect(stop.month).toBeGreaterThanOrEqual(1);
            expect(stop.month).toBeLessThanOrEqual(12);
            expect(stop.day).toBeGreaterThanOrEqual(1);
            expect(stop.day).toBeLessThanOrEqual(31);
        }
    });
});
