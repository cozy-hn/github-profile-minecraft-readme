import * as THREE from 'three';
import type { CalendarMetric } from '../../../types.js';
import type {
    LoadedSceneTextures,
    SceneData,
    SeasonalAmountStop,
} from '../types.js';
import { liftHex, mixHexColors } from './color-math.js';
import {
    createOverlayTopTexture,
    createPartialOverlayTopTexture,
    createStackedSideTexture,
    createTintedSideTexture,
    createTintedTopTexture,
} from './texture-builders.js';

/**
 * FNV-1a hash returning a normalized float in [0, 1).
 *
 * A similar FNV-1a implementation exists in `src/utils.ts` that returns
 * a raw unsigned 32-bit integer instead. The two are intentionally separate:
 * this module runs in the browser bundle (esbuild), while `src/utils.ts`
 * imports Node-only modules (`node:fs/promises`, `node:path`).
 */
export const hashString = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967296;
};

const isLeapYear = (year: number): boolean =>
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const toDayOfYear = (year: number, month: number, day: number): number => {
    const monthOffsets = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    const leapOffset = isLeapYear(year) && month > 2 ? 1 : 0;
    return monthOffsets[month - 1] + day + leapOffset;
};

interface SeasonalBracket<T> {
    t: number;
    leftValue: T;
    rightValue: T;
}

const findSeasonalBracket = <S extends { month: number; day: number }, T>(
    isoDate: string,
    stops: ReadonlyArray<S>,
    getValue: (stop: S) => T,
): SeasonalBracket<T> => {
    const [yearText, monthText, dayText] = isoDate.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const dayOfYear = toDayOfYear(year, month, day);
    const daysInYear = isLeapYear(year) ? 366 : 365;
    const yearlyStops = stops
        .map((stop) => ({
            day: toDayOfYear(year, stop.month, stop.day),
            value: getValue(stop),
        }))
        .sort((left, right) => left.day - right.day);
    const extendedStops = [
        {
            day: yearlyStops[yearlyStops.length - 1].day - daysInYear,
            value: yearlyStops[yearlyStops.length - 1].value,
        },
        ...yearlyStops,
        {
            day: yearlyStops[0].day + daysInYear,
            value: yearlyStops[0].value,
        },
    ];

    let leftStop = extendedStops[0];
    let rightStop = extendedStops[1];
    for (let index = 0; index < extendedStops.length - 1; index += 1) {
        const left = extendedStops[index];
        const right = extendedStops[index + 1];
        if (dayOfYear >= left.day && dayOfYear < right.day) {
            leftStop = left;
            rightStop = right;
            break;
        }
    }

    const range = Math.max(1, rightStop.day - leftStop.day);
    const t = Math.max(0, Math.min(1, (dayOfYear - leftStop.day) / range));
    return { t, leftValue: leftStop.value, rightValue: rightStop.value };
};

const getInterpolatedSeasonalAmount = (
    isoDate: string,
    stops: ReadonlyArray<SeasonalAmountStop>,
): number => {
    const { t, leftValue, rightValue } = findSeasonalBracket(
        isoDate,
        stops,
        (stop) => stop.amount,
    );
    return leftValue + (rightValue - leftValue) * t;
};

const getSeasonalGrassTint = (
    sceneData: SceneData,
    isoDate: string,
    contributionLevel: number,
): string => {
    const { t, leftValue, rightValue } = findSeasonalBracket(
        isoDate,
        sceneData.seasonalGrassStops,
        (stop) => stop.color,
    );
    const seasonalColor = mixHexColors(leftValue, rightValue, t);
    const contributionLift = [0, 0.015, 0.035, 0.06, 0.09][contributionLevel] ?? 0;
    return liftHex(seasonalColor, contributionLift);
};

export interface TerrainTextureContext {
    selectedWaterKeys: Set<string>;
    springFlowerTextures: Array<THREE.Texture>;
    summerFlowerTextures: Array<THREE.Texture>;
    hashString: (value: string) => number;
    getSnowCoverage: (isoDate: string) => number;
    getSpringFlowerCoverage: (isoDate: string) => number;
    getSummerFlowerCoverage: (isoDate: string) => number;
    getWaterBlockGeometry: (cell: CalendarMetric) => THREE.BufferGeometry;
    getBlockMaterials: (cell: CalendarMetric) => Array<THREE.Material>;
}

export const createTerrainTextureContext = (
    sceneData: SceneData,
    textures: LoadedSceneTextures,
): TerrainTextureContext => {
    const springFlowerTextures = [
        textures.pinkTulipTexture,
        textures.whiteTulipTexture,
        textures.azureBluetTexture,
        textures.pinkTulipTexture,
    ];
    const summerFlowerTextures = [
        textures.poppyTexture,
        textures.dandelionTexture,
        textures.cornflowerTexture,
        textures.blueOrchidTexture,
        textures.poppyTexture,
    ];
    const waterMaterials = [
        new THREE.MeshPhongMaterial({
            map: textures.waterSideTexture,
            color: new THREE.Color('#3f76e4'),
            transparent: true,
            opacity: 0.86,
            shininess: 110,
            specular: new THREE.Color('#dff8ff'),
            emissive: new THREE.Color('#163d82'),
            emissiveIntensity: 0.18,
            depthWrite: false,
        }),
        new THREE.MeshPhongMaterial({
            map: textures.waterSideTexture,
            color: new THREE.Color('#3f76e4'),
            transparent: true,
            opacity: 0.86,
            shininess: 110,
            specular: new THREE.Color('#dff8ff'),
            emissive: new THREE.Color('#163d82'),
            emissiveIntensity: 0.18,
            depthWrite: false,
        }),
        new THREE.MeshPhongMaterial({
            map: textures.waterTopTexture,
            color: new THREE.Color('#4d88f0'),
            transparent: true,
            opacity: 0.9,
            shininess: 135,
            specular: new THREE.Color('#effcff'),
            emissive: new THREE.Color('#18427d'),
            emissiveIntensity: 0.18,
            depthWrite: false,
        }),
        new THREE.MeshPhongMaterial({
            map: textures.waterSideTexture,
            color: new THREE.Color('#3568d7'),
            transparent: true,
            opacity: 0.84,
            shininess: 100,
            specular: new THREE.Color('#cfefff'),
            emissive: new THREE.Color('#12315f'),
            emissiveIntensity: 0.14,
            depthWrite: false,
        }),
        new THREE.MeshPhongMaterial({
            map: textures.waterSideTexture,
            color: new THREE.Color('#3f76e4'),
            transparent: true,
            opacity: 0.86,
            shininess: 110,
            specular: new THREE.Color('#dff8ff'),
            emissive: new THREE.Color('#163d82'),
            emissiveIntensity: 0.18,
            depthWrite: false,
        }),
        new THREE.MeshPhongMaterial({
            map: textures.waterSideTexture,
            color: new THREE.Color('#3f76e4'),
            transparent: true,
            opacity: 0.86,
            shininess: 110,
            specular: new THREE.Color('#dff8ff'),
            emissive: new THREE.Color('#163d82'),
            emissiveIntensity: 0.18,
            depthWrite: false,
        }),
    ];

    const getSnowCoverage = (isoDate: string): number =>
        getInterpolatedSeasonalAmount(isoDate, sceneData.snowCoverStops);
    const getBlossomCoverage = (isoDate: string): number =>
        getInterpolatedSeasonalAmount(isoDate, sceneData.blossomCoverStops);
    const getLeafLitterCoverage = (isoDate: string): number =>
        getInterpolatedSeasonalAmount(isoDate, sceneData.leafLitterCoverStops);
    const getSpringFlowerCoverage = (isoDate: string): number =>
        getInterpolatedSeasonalAmount(isoDate, sceneData.springFlowerCoverStops);
    const getSummerFlowerCoverage = (isoDate: string): number =>
        getInterpolatedSeasonalAmount(isoDate, sceneData.summerFlowerCoverStops);
    const selectedWaterKeys = new Set(
        sceneData.calendarMetrics
            .filter((cell) => cell.contributionLevel === 0)
            .map((cell) => `${cell.week}:${cell.dayOfWeek}`),
    );
    const baseWaterGeometry = new THREE.BoxGeometry(1, 1, 1);
    const waterGeometryCache = new Map<string, THREE.BufferGeometry>();
    const blockMaterialCache = new Map<string, Array<THREE.Material>>();

    const getWaterGeometryKey = (cell: CalendarMetric): string =>
        [
            selectedWaterKeys.has(`${cell.week + 1}:${cell.dayOfWeek}`) ? '0' : '1',
            selectedWaterKeys.has(`${cell.week - 1}:${cell.dayOfWeek}`) ? '0' : '1',
            '1',
            '1',
            selectedWaterKeys.has(`${cell.week}:${cell.dayOfWeek + 1}`) ? '0' : '1',
            selectedWaterKeys.has(`${cell.week}:${cell.dayOfWeek - 1}`) ? '0' : '1',
        ].join('');

    const getWaterBlockGeometry = (cell: CalendarMetric): THREE.BufferGeometry => {
        const key = getWaterGeometryKey(cell);
        const cachedGeometry = waterGeometryCache.get(key);
        if (cachedGeometry) {
            return cachedGeometry;
        }

        const geometry = baseWaterGeometry.clone();
        const visibleFaces = key.split('').map((value) => value === '1');
        geometry.clearGroups();
        for (let faceIndex = 0; faceIndex < baseWaterGeometry.groups.length; faceIndex += 1) {
            const group = baseWaterGeometry.groups[faceIndex];
            if (visibleFaces[faceIndex]) {
                geometry.addGroup(group.start, group.count, group.materialIndex);
            }
        }
        waterGeometryCache.set(key, geometry);
        return geometry;
    };

    const getBlockMaterials = (cell: CalendarMetric): Array<THREE.Material> => {
        const isWaterCell = selectedWaterKeys.has(`${cell.week}:${cell.dayOfWeek}`);
        const cacheKey = `${cell.date}:${cell.contributionLevel}:${
            isWaterCell ? 'water' : 'land'
        }`;
        const cachedMaterials = blockMaterialCache.get(cacheKey);
        if (cachedMaterials) {
            return cachedMaterials;
        }

        if (isWaterCell) {
            const materials = waterMaterials.map((material) => material.clone());
            blockMaterialCache.set(cacheKey, materials);
            return materials;
        }

        let topTexture: THREE.Texture = textures.dirtTexture;
        let sideTexture: THREE.Texture = textures.dirtTexture;
        if (cell.contributionLevel > 0) {
            const snowCoverage = getSnowCoverage(cell.date);
            const hasSnowCover =
                snowCoverage > 0 &&
                hashString(`${cell.date}:${cell.contributionLevel}`) < snowCoverage;
            if (hasSnowCover) {
                topTexture = textures.snowTexture;
                sideTexture = createStackedSideTexture(
                    textures.grassSnowTexture,
                    textures.dirtTexture,
                    cell.worldHeight,
                );
            } else {
                const tintHex = getSeasonalGrassTint(
                    sceneData,
                    cell.date,
                    cell.contributionLevel,
                );
                topTexture = createTintedTopTexture(textures.grassTopTexture, tintHex);
                sideTexture = createStackedSideTexture(
                    createTintedSideTexture(
                        textures.grassSideTexture,
                        textures.grassSideOverlayTexture,
                        tintHex,
                    ),
                    textures.dirtTexture,
                    cell.worldHeight,
                );

                const blossomCoverage = getBlossomCoverage(cell.date);
                const hasBlossom =
                    blossomCoverage > 0 &&
                    hashString(
                        `${cell.date}:blossom:${cell.week}:${cell.dayOfWeek}`,
                    ) < blossomCoverage;
                if (hasBlossom) {
                    topTexture = createOverlayTopTexture(
                        topTexture,
                        textures.pinkPetalsTexture,
                    );
                }

                const leafLitterCoverage = getLeafLitterCoverage(cell.date);
                const hasLeafLitter =
                    leafLitterCoverage > 0 &&
                    hashString(`${cell.date}:leaf:${cell.week}:${cell.dayOfWeek}`) <
                        leafLitterCoverage;
                if (hasLeafLitter) {
                    topTexture = createPartialOverlayTopTexture(
                        topTexture,
                        textures.leafLitterTexture,
                        '#8b5a2b',
                        { x: 0, y: 0, width: 8, height: 16 },
                        { x: 0, y: 0, width: 8, height: 16 },
                    );
                }
            }
        }

        const materials = [
            new THREE.MeshLambertMaterial({ map: sideTexture }),
            new THREE.MeshLambertMaterial({ map: sideTexture }),
            new THREE.MeshLambertMaterial({ map: topTexture }),
            new THREE.MeshLambertMaterial({ map: textures.dirtTexture }),
            new THREE.MeshLambertMaterial({ map: sideTexture }),
            new THREE.MeshLambertMaterial({ map: sideTexture }),
        ];
        blockMaterialCache.set(cacheKey, materials);
        return materials;
    };

    return {
        selectedWaterKeys,
        springFlowerTextures,
        summerFlowerTextures,
        hashString,
        getSnowCoverage,
        getSpringFlowerCoverage,
        getSummerFlowerCoverage,
        getWaterBlockGeometry,
        getBlockMaterials,
    };
};
