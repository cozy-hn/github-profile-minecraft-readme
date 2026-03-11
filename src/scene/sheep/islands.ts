import type { GrassWorldCell } from '../../types.js';
import { ISLAND_DIRECTIONS, MAX_WALK_STEPS } from './constants.js';

export const toCellKey = (cell: Pick<GrassWorldCell, 'week' | 'dayOfWeek'>): string =>
    `${cell.week},${cell.dayOfWeek}`;

export const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

export const getCellDistance = (
    left: GrassWorldCell,
    right: GrassWorldCell,
): number =>
    Math.hypot(
        right.week - left.week,
        right.worldHeight - left.worldHeight,
        right.dayOfWeek - left.dayOfWeek,
    );

const rotateDirections = (
    offset: number,
): Array<(typeof ISLAND_DIRECTIONS)[number]> =>
    [...Array<undefined>(ISLAND_DIRECTIONS.length)].map(
        (_, index) =>
            ISLAND_DIRECTIONS[(index + offset) % ISLAND_DIRECTIONS.length],
    );

const getDistanceMap = (
    islandCells: Array<GrassWorldCell>,
    startCell: GrassWorldCell,
): Map<string, number> => {
    const cellMap = new Map(islandCells.map((cell) => [toCellKey(cell), cell]));
    const distanceMap = new Map<string, number>([[toCellKey(startCell), 0]]);
    const queue = [startCell];

    while (queue.length > 0) {
        const current = queue.shift() as GrassWorldCell;
        const currentDistance = distanceMap.get(toCellKey(current)) as number;
        ISLAND_DIRECTIONS.forEach(([weekOffset, dayOffset]) => {
            const nextCell = cellMap.get(
                `${current.week + weekOffset},${current.dayOfWeek + dayOffset}`,
            );
            if (!nextCell) {
                return;
            }
            const nextKey = toCellKey(nextCell);
            if (distanceMap.has(nextKey)) {
                return;
            }
            distanceMap.set(nextKey, currentDistance + 1);
            queue.push(nextCell);
        });
    }

    return distanceMap;
};

export const chooseWalkPath = (
    islandCells: Array<GrassWorldCell>,
    startCell: GrassWorldCell,
    directionOffset: number,
    maxRouteDistance: number,
): Array<GrassWorldCell> => {
    if (islandCells.length === 0) {
        return [];
    }

    const cellMap = new Map(islandCells.map((cell) => [toCellKey(cell), cell]));
    const path = [startCell];
    let current = startCell;
    let previousKey = '';
    let currentDirection = directionOffset % ISLAND_DIRECTIONS.length;
    let forwardDistance = 0;

    for (let step = 0; step < MAX_WALK_STEPS; step += 1) {
        const candidates = rotateDirections(currentDirection)
            .map((direction, directionIndex) => ({
                directionIndex:
                    (directionOffset + directionIndex) % ISLAND_DIRECTIONS.length,
                cell: cellMap.get(
                    `${current.week + direction[0]},${
                        current.dayOfWeek + direction[1]
                    }`,
                ),
            }))
            .filter(
                (
                    info,
                ): info is { directionIndex: number; cell: GrassWorldCell } =>
                    Boolean(info.cell),
            )
            .filter(
                (info, index, list) =>
                    toCellKey(info.cell) !== previousKey || list.length === 1,
            );

        if (candidates.length === 0) {
            break;
        }

        const next = candidates[0];
        const nextForwardDistance =
            forwardDistance + getCellDistance(current, next.cell);
        if (nextForwardDistance * 2 > maxRouteDistance) {
            break;
        }

        previousKey = toCellKey(current);
        currentDirection = next.directionIndex;
        forwardDistance = nextForwardDistance;
        current = next.cell;
        path.push(current);
    }

    if (path.length > 1) {
        return [...path, ...path.slice(1, -1).reverse(), path[0]];
    }

    return path;
};

export const selectSpawnCells = (
    islandCells: Array<GrassWorldCell>,
    count: number,
): Array<GrassWorldCell> => {
    const sortedCells = [...islandCells].sort(
        (left, right) => left.week - right.week || left.dayOfWeek - right.dayOfWeek,
    );
    const avgWeek =
        sortedCells.reduce((sum, cell) => sum + cell.week, 0) / sortedCells.length;
    const avgDay =
        sortedCells.reduce((sum, cell) => sum + cell.dayOfWeek, 0) /
        sortedCells.length;

    const selected = [
        sortedCells.reduce((best, cell) => {
            const bestDistance = Math.hypot(
                best.week - avgWeek,
                best.dayOfWeek - avgDay,
            );
            const cellDistance = Math.hypot(
                cell.week - avgWeek,
                cell.dayOfWeek - avgDay,
            );
            return cellDistance < bestDistance ? cell : best;
        }, sortedCells[0]),
    ];

    while (selected.length < count) {
        const nextCell = sortedCells.reduce((best, cell) => {
            if (selected.some((selectedCell) => toCellKey(selectedCell) === toCellKey(cell))) {
                return best;
            }
            const cellMinDistance = selected.reduce(
                (minDistance, selectedCell) =>
                    Math.min(
                        minDistance,
                        Math.hypot(
                            cell.week - selectedCell.week,
                            cell.dayOfWeek - selectedCell.dayOfWeek,
                        ),
                    ),
                Infinity,
            );
            const bestMinDistance = selected.reduce(
                (minDistance, selectedCell) =>
                    Math.min(
                        minDistance,
                        Math.hypot(
                            best.week - selectedCell.week,
                            best.dayOfWeek - selectedCell.dayOfWeek,
                        ),
                    ),
                Infinity,
            );
            return cellMinDistance > bestMinDistance ? cell : best;
        }, sortedCells[0]);
        selected.push(nextCell);
    }

    return selected;
};

export const partitionIslandCells = (
    islandCells: Array<GrassWorldCell>,
    spawnCells: Array<GrassWorldCell>,
): Array<Array<GrassWorldCell>> => {
    const distanceMaps = spawnCells.map((spawnCell) =>
        getDistanceMap(islandCells, spawnCell),
    );
    const partitions = spawnCells.map(() => [] as Array<GrassWorldCell>);

    islandCells.forEach((cell) => {
        const key = toCellKey(cell);
        let bestOwner = 0;
        let bestDistance = distanceMaps[0].get(key) ?? Number.POSITIVE_INFINITY;

        for (let owner = 1; owner < distanceMaps.length; owner += 1) {
            const distance = distanceMaps[owner].get(key) ?? Number.POSITIVE_INFINITY;
            if (distance < bestDistance) {
                bestDistance = distance;
                bestOwner = owner;
                continue;
            }
            if (
                distance === bestDistance &&
                partitions[owner].length < partitions[bestOwner].length
            ) {
                bestOwner = owner;
            }
        }

        partitions[bestOwner].push(cell);
    });

    return partitions;
};

export const findGrassIslands = (
    cells: Array<GrassWorldCell>,
): Array<{ id: number; cells: Array<GrassWorldCell> }> => {
    const grassCells = cells.filter((cell) => cell.contributionLevel > 0);
    const remaining = new Map(grassCells.map((cell) => [toCellKey(cell), cell]));
    const islands: Array<{ id: number; cells: Array<GrassWorldCell> }> = [];
    let islandId = 0;

    while (remaining.size > 0) {
        const firstEntry = remaining.entries().next().value as
            | [string, GrassWorldCell]
            | undefined;
        if (!firstEntry) {
            break;
        }

        const [, firstCell] = firstEntry;
        const queue = [firstCell];
        const islandCells: Array<GrassWorldCell> = [];
        remaining.delete(toCellKey(firstCell));

        while (queue.length > 0) {
            const current = queue.shift() as GrassWorldCell;
            islandCells.push(current);
            ISLAND_DIRECTIONS.forEach(([weekOffset, dayOffset]) => {
                const nextKey = `${current.week + weekOffset},${
                    current.dayOfWeek + dayOffset
                }`;
                const nextCell = remaining.get(nextKey);
                if (!nextCell) {
                    return;
                }
                remaining.delete(nextKey);
                queue.push(nextCell);
            });
        }

        islands.push({ id: islandId, cells: islandCells });
        islandId += 1;
    }

    return islands;
};

export const buildExclusionZone = (
    route: ReadonlyArray<Pick<GrassWorldCell, 'week' | 'dayOfWeek'>>,
    bufferRadius: number,
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
