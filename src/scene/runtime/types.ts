import type { Texture } from 'three';
import type {
    CalendarMetric,
    RenderConfig,
    SheepSpawnPlan,
} from '../../types.js';

export interface SceneMonthGuideEntry {
    week: number;
    monthLabel: string;
    detailLabel: string;
}

export interface SeasonalAmountStop {
    month: number;
    day: number;
    amount: number;
}

export interface SeasonalColorStop {
    month: number;
    day: number;
    color: string;
}

export interface SceneData {
    username: string;
    totalContributions: number;
    period: string;
    background: RenderConfig['background'];
    showHud: boolean;
    showSheep: boolean;
    sheepTargetHeight: number;
    calendarMetrics: Array<CalendarMetric>;
    monthGuideEntries: Array<SceneMonthGuideEntry>;
    sheepPlans: Array<SheepSpawnPlan>;
    blossomCoverStops: ReadonlyArray<SeasonalAmountStop>;
    leafLitterCoverStops: ReadonlyArray<SeasonalAmountStop>;
    springFlowerCoverStops: ReadonlyArray<SeasonalAmountStop>;
    seasonalGrassStops: ReadonlyArray<SeasonalColorStop>;
    snowCoverStops: ReadonlyArray<SeasonalAmountStop>;
    summerFlowerCoverStops: ReadonlyArray<SeasonalAmountStop>;
}

export interface SceneAssetUrls {
    runtimeScriptPath: string;
    assetBaseUrl: string;
    vendorBaseUrl: string;
}

export interface SceneRuntimeAssets {
    sheepTexturePath: string;
    sheepFurTexturePath: string;
    grassTopTexturePath: string;
    grassSideTexturePath: string;
    grassSideOverlayTexturePath: string;
    grassSnowTexturePath: string;
    pinkPetalsTexturePath: string;
    leafLitterTexturePath: string;
    poppyTexturePath: string;
    dandelionTexturePath: string;
    cornflowerTexturePath: string;
    blueOrchidTexturePath: string;
    azureBluetTexturePath: string;
    pinkTulipTexturePath: string;
    whiteTulipTexturePath: string;
    snowTexturePath: string;
    dirtTexturePath: string;
    waterTopTexturePath: string;
    waterSideTexturePath: string;
}

export interface SceneBootstrapPayload {
    mountElementId: string;
    gifDurationSec: number;
    sceneData: SceneData;
    assets: SceneRuntimeAssets;
}

export interface LoadedSceneTextures {
    sheepBaseTexture: Texture;
    sheepFurTexture: Texture;
    grassTopTexture: Texture;
    grassSideTexture: Texture;
    grassSideOverlayTexture: Texture;
    grassSnowTexture: Texture;
    pinkPetalsTexture: Texture;
    leafLitterTexture: Texture;
    poppyTexture: Texture;
    dandelionTexture: Texture;
    cornflowerTexture: Texture;
    blueOrchidTexture: Texture;
    azureBluetTexture: Texture;
    pinkTulipTexture: Texture;
    whiteTulipTexture: Texture;
    snowTexture: Texture;
    dirtTexture: Texture;
    waterTopTexture: Texture;
    waterSideTexture: Texture;
}

export interface SheepStateSnapshot {
    x: number;
    y: number;
    z: number;
    yaw: number;
    state: string;
    shadowY: number;
    headY: number;
    headZ: number;
    headRotX: number;
    headRigY: number;
    headRigZ: number;
    bodyY: number;
    routeIndex: number;
    leg0: number;
    leg1: number;
    leg2: number;
    leg3: number;
}

export interface SceneDebugState {
    blockCount: number;
    floraCount: number;
    sheepCount: number;
    camera: {
        left: number;
        right: number;
        top: number;
        bottom: number;
        position: [number, number, number];
    };
}

export interface SceneRuntimeWindow extends Window {
    __setSceneTime?: (timeSec: number) => void;
    __getSceneState?: (timeSec: number) => Array<SheepStateSnapshot>;
    __resumeScene?: () => void;
    __PROFILE_SCENE_READY?: boolean;
    __PROFILE_SCENE_LOOP_DURATION?: number;
    __PROFILE_SCENE_DEBUG?: SceneDebugState;
}
