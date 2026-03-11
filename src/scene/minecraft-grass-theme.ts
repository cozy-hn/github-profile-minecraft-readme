export interface SeasonalGrassStop {
    month: number;
    day: number;
    color: string;
}

export const KOREAN_SEASONAL_GRASS_STOPS: ReadonlyArray<SeasonalGrassStop> = [
    { month: 1, day: 1, color: '#aab48a' },
    { month: 2, day: 10, color: '#b6bf94' },
    { month: 3, day: 10, color: '#96c763' },
    { month: 4, day: 10, color: '#7dc24e' },
    { month: 6, day: 1, color: '#68b53a' },
    { month: 8, day: 10, color: '#74b13a' },
    { month: 9, day: 20, color: '#95aa49' },
    { month: 10, day: 20, color: '#8a9748' },
    { month: 11, day: 15, color: '#9aa07d' },
    { month: 12, day: 1, color: '#b0b98e' },
] as const;

export interface SeasonalSnowCoverStop {
    month: number;
    day: number;
    amount: number;
}

export const KOREAN_SNOW_COVER_STOPS: ReadonlyArray<SeasonalSnowCoverStop> = [
    { month: 11, day: 15, amount: 0 },
    { month: 12, day: 1, amount: 0.18 },
    { month: 12, day: 15, amount: 0.45 },
    { month: 1, day: 10, amount: 0.85 },
    { month: 2, day: 1, amount: 0.75 },
    { month: 2, day: 15, amount: 0.45 },
    { month: 3, day: 1, amount: 0.18 },
    { month: 3, day: 15, amount: 0 },
] as const;

export interface SeasonalGroundOverlayStop {
    month: number;
    day: number;
    amount: number;
}

export const KOREAN_BLOSSOM_COVER_STOPS: ReadonlyArray<SeasonalGroundOverlayStop> = [
    { month: 3, day: 10, amount: 0 },
    { month: 3, day: 25, amount: 0.2 },
    { month: 4, day: 5, amount: 0.4 },
    { month: 4, day: 15, amount: 0.28 },
    { month: 4, day: 25, amount: 0.1 },
    { month: 5, day: 5, amount: 0 },
] as const;

export const KOREAN_SPRING_FLOWER_COVER_STOPS: ReadonlyArray<SeasonalGroundOverlayStop> = [
    { month: 3, day: 15, amount: 0 },
    { month: 3, day: 28, amount: 0.08 },
    { month: 4, day: 8, amount: 0.16 },
    { month: 4, day: 20, amount: 0.12 },
    { month: 5, day: 8, amount: 0.06 },
    { month: 5, day: 20, amount: 0 },
] as const;

export const KOREAN_LEAF_LITTER_COVER_STOPS: ReadonlyArray<SeasonalGroundOverlayStop> = [
    { month: 9, day: 20, amount: 0 },
    { month: 10, day: 10, amount: 0.08 },
    { month: 10, day: 25, amount: 0.18 },
    { month: 11, day: 10, amount: 0.28 },
    { month: 11, day: 25, amount: 0.2 },
    { month: 12, day: 8, amount: 0.06 },
    { month: 12, day: 20, amount: 0 },
] as const;

export const KOREAN_SUMMER_FLOWER_COVER_STOPS: ReadonlyArray<SeasonalGroundOverlayStop> = [
    { month: 6, day: 1, amount: 0 },
    { month: 6, day: 15, amount: 0.1 },
    { month: 7, day: 5, amount: 0.16 },
    { month: 7, day: 25, amount: 0.22 },
    { month: 8, day: 20, amount: 0.14 },
    { month: 9, day: 5, amount: 0.04 },
    { month: 9, day: 20, amount: 0 },
] as const;

