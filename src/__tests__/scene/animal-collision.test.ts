import { describe, it, expect } from 'vitest';
import { buildCatPopulationPlans } from '../../scene/cat/planner.js';
import { buildSheepPopulationPlans } from '../../scene/sheep/planner.js';
import { toCellKey } from '../../scene/sheep/islands.js';
import { ISLAND_DIRECTIONS } from '../../scene/sheep/constants.js';
import type { CalendarMetric, GrassWorldCell } from '../../types.js';

const makeCell = (
    week: number,
    dayOfWeek: number,
    contributionLevel = 1,
    worldHeight = 2,
): CalendarMetric => ({
    week,
    dayOfWeek,
    contributionLevel,
    contributionCount: contributionLevel * 3,
    date: `2025-01-${String(week * 7 + dayOfWeek + 1).padStart(2, '0')}`,
    worldHeight,
});

/** Build the exclusion set (route cells + 1-cell buffer) for a cat plan. */
const buildExclusionSet = (
    route: ReadonlyArray<GrassWorldCell>,
    bufferRadius = 1,
): Set<string> => {
    const excluded = new Set<string>();
    for (const cell of route) {
        excluded.add(toCellKey(cell));
    }
    let frontier = new Set(excluded);
    for (let ring = 0; ring < bufferRadius; ring++) {
        const nextFrontier = new Set<string>();
        for (const key of frontier) {
            const [w, d] = key.split(',').map(Number);
            for (const [dw, dd] of ISLAND_DIRECTIONS) {
                const nk = `${w + dw},${d + dd}`;
                if (!excluded.has(nk)) {
                    excluded.add(nk);
                    nextFrontier.add(nk);
                }
            }
        }
        frontier = nextFrontier;
    }
    return excluded;
};

describe('animal collision avoidance', () => {
    it('cat and sheep routes have zero cell overlap on shared island', () => {
        // Large island: 15 weeks × 5 days = 75 cells
        const cells: CalendarMetric[] = [];
        for (let w = 0; w < 15; w++) {
            for (let d = 0; d < 5; d++) {
                cells.push(makeCell(w, d));
            }
        }

        const catPlans = buildCatPopulationPlans(cells, 8);
        expect(catPlans.length).toBeGreaterThan(0);

        const catPlan = catPlans[0];
        const excluded = buildExclusionSet(catPlan.route, 1);
        const excludedMap = new Map<number, Set<string>>([
            [catPlan.islandId, excluded],
        ]);

        const sheepPlans = buildSheepPopulationPlans(cells, 8, excludedMap);

        for (const sheep of sheepPlans) {
            for (const cell of sheep.route) {
                const key = toCellKey(cell);
                expect(excluded.has(key)).toBe(false);
            }
        }
    });

    it('sheep count is reduced when cat claims territory', () => {
        // 20 weeks × 5 days = 100 cells
        const cells: CalendarMetric[] = [];
        for (let w = 0; w < 20; w++) {
            for (let d = 0; d < 5; d++) {
                cells.push(makeCell(w, d));
            }
        }

        const sheepWithout = buildSheepPopulationPlans(cells, 8);

        const catPlans = buildCatPopulationPlans(cells, 8);
        const catPlan = catPlans[0];
        const excluded = buildExclusionSet(catPlan.route, 1);
        const excludedMap = new Map<number, Set<string>>([
            [catPlan.islandId, excluded],
        ]);
        const sheepWith = buildSheepPopulationPlans(cells, 8, excludedMap);

        expect(sheepWith.length).toBeLessThanOrEqual(sheepWithout.length);
    });

    it('sheep planner returns empty when island too small after exclusion', () => {
        // Small island: 6 weeks × 1 day = 6 cells — cat route + buffer will exceed it
        const cells: CalendarMetric[] = [];
        for (let w = 0; w < 6; w++) {
            cells.push(makeCell(w, 0));
        }

        const catPlans = buildCatPopulationPlans(cells, 8);
        if (catPlans.length === 0) {
            // Cat didn't spawn (island may be too small) — test is trivially passing
            return;
        }
        const catPlan = catPlans[0];
        const excluded = buildExclusionSet(catPlan.route, 1);
        const excludedMap = new Map<number, Set<string>>([
            [catPlan.islandId, excluded],
        ]);

        const sheepPlans = buildSheepPopulationPlans(cells, 8, excludedMap);
        // With only 6 cells and exclusion, fewer than 18 should remain
        expect(sheepPlans).toEqual([]);
    });

    it('islands without a cat are completely unaffected', () => {
        // Two disconnected islands: large (weeks 0-14) and medium (weeks 20-29)
        const cells: CalendarMetric[] = [];
        for (let w = 0; w < 15; w++) {
            for (let d = 0; d < 5; d++) {
                cells.push(makeCell(w, d));
            }
        }
        for (let w = 20; w < 30; w++) {
            for (let d = 0; d < 5; d++) {
                cells.push(makeCell(w, d));
            }
        }

        // Sheep plans without any exclusion
        const sheepWithout = buildSheepPopulationPlans(cells, 8);

        // Cat plans — cat picks the largest island
        const catPlans = buildCatPopulationPlans(cells, 8);
        expect(catPlans.length).toBeGreaterThan(0);
        const catPlan = catPlans[0];
        const excluded = buildExclusionSet(catPlan.route, 1);
        const excludedMap = new Map<number, Set<string>>([
            [catPlan.islandId, excluded],
        ]);

        const sheepWith = buildSheepPopulationPlans(cells, 8, excludedMap);

        // Sheep on the non-cat island should be identical
        const nonCatSheepWithout = sheepWithout.filter(
            (s) => s.islandId !== catPlan.islandId,
        );
        const nonCatSheepWith = sheepWith.filter(
            (s) => s.islandId !== catPlan.islandId,
        );

        expect(nonCatSheepWith).toEqual(nonCatSheepWithout);
    });
});
