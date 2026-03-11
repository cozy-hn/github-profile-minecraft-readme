import type {
    GrassWorldCell,
    SheepLoopPlan,
    SheepSpawnPlan,
} from '../../types.js';
import { hashString, mulberry32 } from '../../utils.js';
import {
    SHEEP_WALK_SPEED_BLOCKS_PER_SEC,
    MIN_LOOP_PAUSE_SEC,
    TWO_PAUSE_MIN_SEC,
    MIN_LOOP_DURATION_SEC,
    MAX_SHEEP_PER_ISLAND,
    CELLS_PER_SHEEP,
    ISLAND_DIRECTIONS,
} from './constants.js';
import { ORANGE_SHEEP_COLOR, buildGlobalColorAssignments } from './colors.js';
import {
    getCellDistance,
    findGrassIslands,
    selectSpawnCells,
    partitionIslandCells,
    chooseWalkPath,
    clamp,
    toCellKey,
} from './islands.js';

const buildRouteProgressStops = (route: Array<GrassWorldCell>): Array<number> => {
    if (route.length <= 1) {
        return [0];
    }

    const cumulativeDistances = [0];
    for (let index = 1; index < route.length; index += 1) {
        const previous = route[index - 1];
        const current = route[index];
        cumulativeDistances.push(
            cumulativeDistances[index - 1] +
                Math.hypot(
                    current.week - previous.week,
                    current.worldHeight - previous.worldHeight,
                    current.dayOfWeek - previous.dayOfWeek,
                ),
        );
    }

    const totalDistance =
        cumulativeDistances[cumulativeDistances.length - 1] ?? 0;
    if (totalDistance <= 1e-6) {
        const segmentCount = Math.max(1, route.length - 1);
        return cumulativeDistances.map((_, index) => index / segmentCount);
    }

    return cumulativeDistances.map((distance) => distance / totalDistance);
};

const measureRouteDistance = (route: Array<GrassWorldCell>): number => {
    let totalDistance = 0;
    for (let index = 1; index < route.length; index += 1) {
        totalDistance += getCellDistance(route[index - 1], route[index]);
    }
    return totalDistance;
};

const pickIndexInFractionRange = (
    segmentCount: number,
    minFraction: number,
    maxFraction: number,
    random: () => number,
    minIndex = 1,
    maxIndex = segmentCount - 1,
): number => {
    const safeMinIndex = Math.max(1, minIndex);
    const safeMaxIndex = Math.max(
        safeMinIndex,
        Math.min(maxIndex, segmentCount - 1),
    );
    const lower = Math.min(
        safeMaxIndex,
        Math.max(safeMinIndex, Math.ceil(segmentCount * minFraction)),
    );
    const upper = Math.max(
        lower,
        Math.min(safeMaxIndex, Math.floor(segmentCount * maxFraction)),
    );

    return lower + Math.floor(random() * (upper - lower + 1));
};

const distributeDurations = (
    totalDurationSec: number,
    weights: Array<number>,
): Array<number> => {
    const safeWeights = weights.map((weight) => Math.max(weight, 1e-3));
    const totalWeight = safeWeights.reduce((sum, weight) => sum + weight, 0);
    return safeWeights.map((weight) => (totalDurationSec * weight) / totalWeight);
};

const buildLoopPlan = (
    route: Array<GrassWorldCell>,
    loopDurationSec: number,
    seedText: string,
): SheepLoopPlan => {
    const durationSec = Math.max(MIN_LOOP_DURATION_SEC, loopDurationSec);
    const random = mulberry32(hashString(seedText));
    const phaseOffsetSec = random() * durationSec;

    if (route.length <= 1) {
        return {
            phaseOffsetSec,
            segments: [
                {
                    kind: 'idle' as const,
                    startSec: 0,
                    endSec: durationSec,
                    progressStart: 0,
                    progressEnd: 0,
                },
            ],
        };
    }

    const segmentCount = route.length - 1;
    const routeProgressStops = buildRouteProgressStops(route);
    const routeDistance = measureRouteDistance(route);
    const walkDurationSec = routeDistance / SHEEP_WALK_SPEED_BLOCKS_PER_SEC;
    const pauseBudgetSec = Math.max(0, durationSec - walkDurationSec);
    const pauseCount =
        pauseBudgetSec >= TWO_PAUSE_MIN_SEC && segmentCount >= 5
            ? 2
            : pauseBudgetSec >= MIN_LOOP_PAUSE_SEC
              ? 1
              : 0;

    if (pauseCount === 0) {
        return {
            phaseOffsetSec,
            segments: [
                {
                    kind: 'walk',
                    startSec: 0,
                    endSec: durationSec,
                    progressStart: 0,
                    progressEnd: 1,
                },
            ],
        };
    }

    const firstPauseIndex = pickIndexInFractionRange(
        segmentCount,
        pauseCount === 2 ? 0.22 : 0.3,
        pauseCount === 2 ? 0.44 : 0.7,
        random,
    );
    const firstPauseProgress =
        routeProgressStops[firstPauseIndex] ??
        (pauseCount === 2 ? 0.34 : 0.5);

    let secondPauseIndex = segmentCount - 1;
    let secondPauseProgress = 1;
    if (pauseCount === 2) {
        secondPauseIndex = pickIndexInFractionRange(
            segmentCount,
            0.58,
            0.86,
            random,
            firstPauseIndex + 1,
            segmentCount - 1,
        );
        secondPauseProgress =
            routeProgressStops[secondPauseIndex] ??
            Math.max(firstPauseProgress + 0.22, 0.78);
    }

    const secondPauseKind: 'idle' | 'graze' =
        random() < 0.45 ? 'idle' : 'graze';
    const firstPauseDurationSec =
        pauseCount === 1
            ? pauseBudgetSec
            : pauseBudgetSec *
              clamp(0.54 + (random() - 0.5) * 0.16, 0.44, 0.66);
    const secondPauseDurationSec =
        pauseCount === 2 ? pauseBudgetSec - firstPauseDurationSec : 0;
    const totalWalkDurationSec = walkDurationSec;

    if (pauseCount === 1) {
        const [walkBeforePauseDurationSec] = distributeDurations(
            totalWalkDurationSec,
            [firstPauseProgress, 1 - firstPauseProgress],
        );
        const firstPauseEndSec =
            walkBeforePauseDurationSec + firstPauseDurationSec;

        return {
            phaseOffsetSec,
            segments: [
                {
                    kind: 'walk' as const,
                    startSec: 0,
                    endSec: walkBeforePauseDurationSec,
                    progressStart: 0,
                    progressEnd: firstPauseProgress,
                },
                {
                    kind: 'graze' as const,
                    startSec: walkBeforePauseDurationSec,
                    endSec: firstPauseEndSec,
                    progressStart: firstPauseProgress,
                    progressEnd: firstPauseProgress,
                },
                {
                    kind: 'walk' as const,
                    startSec: firstPauseEndSec,
                    endSec: durationSec,
                    progressStart: firstPauseProgress,
                    progressEnd: 1,
                },
            ],
        };
    }

    const [walkToFirstPauseSec, walkToSecondPauseSec, walkHomeSec] =
        distributeDurations(
        totalWalkDurationSec,
        [
            firstPauseProgress,
            secondPauseProgress - firstPauseProgress,
            1 - secondPauseProgress,
        ],
    );
    const walkToFirstPauseEndSec = walkToFirstPauseSec;
    const firstPauseEndSec = walkToFirstPauseEndSec + firstPauseDurationSec;
    const walkToSecondPauseEndSec = firstPauseEndSec + walkToSecondPauseSec;
    const secondPauseEndSec = walkToSecondPauseEndSec + secondPauseDurationSec;

    return {
        phaseOffsetSec,
        segments: [
            {
                kind: 'walk' as const,
                startSec: 0,
                endSec: walkToFirstPauseEndSec,
                progressStart: 0,
                progressEnd: firstPauseProgress,
            },
            {
                kind: 'graze' as const,
                startSec: walkToFirstPauseEndSec,
                endSec: firstPauseEndSec,
                progressStart: firstPauseProgress,
                progressEnd: firstPauseProgress,
            },
            {
                kind: 'walk' as const,
                startSec: firstPauseEndSec,
                endSec: walkToSecondPauseEndSec,
                progressStart: firstPauseProgress,
                progressEnd: secondPauseProgress,
            },
            {
                kind: secondPauseKind,
                startSec: walkToSecondPauseEndSec,
                endSec: secondPauseEndSec,
                progressStart: secondPauseProgress,
                progressEnd: secondPauseProgress,
            },
            {
                kind: 'walk' as const,
                startSec: secondPauseEndSec,
                endSec: secondPauseEndSec + walkHomeSec,
                progressStart: secondPauseProgress,
                progressEnd: 1,
            },
        ],
    };
};

export { findGrassIslands } from './islands.js';

export const buildSheepPopulationPlans = (
    cells: Array<GrassWorldCell>,
    loopDurationSec: number,
    excludedCells?: Map<number, Set<string>>,
): Array<SheepSpawnPlan> => {
    const maxRouteDistance =
        SHEEP_WALK_SPEED_BLOCKS_PER_SEC *
        Math.max(0.5, loopDurationSec - MIN_LOOP_PAUSE_SEC);
    const sheepSlots = findGrassIslands(cells).flatMap((island) => {
        const excluded = excludedCells?.get(island.id);
        const availableCells = excluded
            ? island.cells.filter((c) => !excluded.has(toCellKey(c)))
            : island.cells;
        const sheepCount = Math.min(MAX_SHEEP_PER_ISLAND, Math.floor(availableCells.length / CELLS_PER_SHEEP));
        if (sheepCount <= 0) {
            return [];
        }

        const spawnCells = selectSpawnCells(availableCells, sheepCount);
        const territories = partitionIslandCells(availableCells, spawnCells);

        return spawnCells.map((startCell, sheepIndex) => ({
            islandId: island.id,
            sheepIndex,
            islandSheepCount: sheepCount,
            islandCellCount: island.cells.length,
            route: chooseWalkPath(
                territories[sheepIndex],
                startCell,
                (island.id + sheepIndex) % ISLAND_DIRECTIONS.length,
                maxRouteDistance,
            ),
        }));
    });

    const colorAssignments = buildGlobalColorAssignments(sheepSlots);

    return sheepSlots.map((slot, slotIndex) => {
        const color = colorAssignments[slotIndex] ?? ORANGE_SHEEP_COLOR;
        return {
            islandId: slot.islandId,
            sheepIndex: slot.sheepIndex,
            islandSheepCount: slot.islandSheepCount,
            colorName: color.name,
            colorHex: color.hex,
            route: slot.route,
            loopPlan: buildLoopPlan(
                slot.route,
                loopDurationSec,
                `${slot.islandId}:${slot.sheepIndex}:${slot.islandCellCount}`,
            ),
        };
    });
};
