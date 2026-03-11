import type { CalendarMetric, RenderConfig, UserSnapshot } from '../types.js';
import { formatThousands, toFixed, toIsoDate, trimLastWeeks } from '../utils.js';
import {
    KOREAN_BLOSSOM_COVER_STOPS,
    KOREAN_LEAF_LITTER_COVER_STOPS,
    KOREAN_SPRING_FLOWER_COVER_STOPS,
    KOREAN_SEASONAL_GRASS_STOPS,
    KOREAN_SNOW_COVER_STOPS,
    KOREAN_SUMMER_FLOWER_COVER_STOPS,
} from './minecraft-grass-theme.js';
import {
    SCENE_BOOTSTRAP_SCRIPT_ID,
    SCENE_MOUNT_ELEMENT_ID,
    SCENE_RUNTIME_BUNDLE_FILENAME,
} from './runtime/constants.js';
import type {
    SceneAssetUrls,
    SceneBootstrapPayload,
    SceneData,
    SceneRuntimeAssets,
} from './runtime/types.js';
import { buildSheepPopulationPlans } from './sheep/planner.js';

const escapeHtml = (text: string): string =>
    text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

const SHEEP_TARGET_HEIGHT_BLOCKS = 1.3;
const CAL_HEIGHT_DIVISOR = 20;
const CAL_HEIGHT_MULTIPLIER = 144;
const CAL_HEIGHT_BASE_OFFSET = 3;
const WORLD_HEIGHT_DIVISOR = 54;

export const SERVER_SCENE_ASSET_URLS: SceneAssetUrls = {
    runtimeScriptPath: `/${SCENE_RUNTIME_BUNDLE_FILENAME}`,
    assetBaseUrl: '/assets',
    vendorBaseUrl: '/vendor',
};

export const STANDALONE_SCENE_ASSET_URLS: SceneAssetUrls = {
    runtimeScriptPath: `./${SCENE_RUNTIME_BUNDLE_FILENAME}`,
    assetBaseUrl: './assets',
    vendorBaseUrl: './vendor',
};

const toEpochDays = (date: Date): number =>
    Math.floor(date.getTime() / (24 * 60 * 60 * 1000));

const calcCalHeight = (contributionCount: number): number =>
    Math.log10(contributionCount / CAL_HEIGHT_DIVISOR + 1) * CAL_HEIGHT_MULTIPLIER + CAL_HEIGHT_BASE_OFFSET;

const calcWorldHeight = (
    contributionCount: number,
    contributionLevel: number,
): number => {
    if (contributionLevel === 0) {
        return 1;
    }
    return toFixed(1 + calcCalHeight(contributionCount) / WORLD_HEIGHT_DIVISOR);
};

const buildCalendarMetrics = (
    userSnapshot: UserSnapshot,
    weeks: number,
): Array<CalendarMetric> => {
    const visibleCalendar = trimLastWeeks(userSnapshot.calendar, weeks);
    if (visibleCalendar.length === 0) {
        throw new Error('No contribution calendar data available. The GitHub API returned an empty calendar.');
    }
    const firstDate = new Date(visibleCalendar[0].date);
    const sundayOfFirstWeek = toEpochDays(firstDate) - firstDate.getUTCDay();

    return visibleCalendar.map((day) => {
        const date = new Date(day.date);
        return {
            contributionCount: day.contributionCount,
            contributionLevel: day.contributionLevel,
            date: toIsoDate(date),
            week: Math.floor((toEpochDays(date) - sundayOfFirstWeek) / 7),
            dayOfWeek: date.getUTCDay(),
            worldHeight: calcWorldHeight(
                day.contributionCount,
                day.contributionLevel,
            ),
        };
    });
};

const formatCompactContributionCount = (value: number): string => {
    if (value >= 1000) {
        const compactValue = Math.round((value / 1000) * 10) / 10;
        return `${compactValue.toFixed(compactValue >= 10 ? 0 : 1)}k`;
    }
    return String(value);
};

const buildMonthGuideEntries = (
    calendarMetrics: Array<CalendarMetric>,
): Array<{
    week: number;
    monthLabel: string;
    detailLabel: string;
}> => {
    const monthFormatter = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        timeZone: 'UTC',
    });
    const entries: Array<{
        week: number;
        monthLabel: string;
        detailLabel: string;
    }> = [];
    let previousMonthKey = '';

    calendarMetrics.forEach((metric) => {
        const date = new Date(`${metric.date}T00:00:00Z`);
        const monthKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
        if (monthKey === previousMonthKey) {
            return;
        }

        previousMonthKey = monthKey;
        const monthlyContributionCount = calendarMetrics
            .filter((calendarMetric) => {
                const calendarDate = new Date(`${calendarMetric.date}T00:00:00Z`);
                return (
                    calendarDate.getUTCFullYear() === date.getUTCFullYear() &&
                    calendarDate.getUTCMonth() === date.getUTCMonth()
                );
            })
            .reduce(
                (sum, calendarMetric) => sum + calendarMetric.contributionCount,
                0,
            );

        entries.push({
            week: metric.week,
            monthLabel: monthFormatter.format(date),
            detailLabel: formatCompactContributionCount(monthlyContributionCount),
        });
    });

    return entries;
};

const createHudMarkup = (
    userSnapshot: UserSnapshot,
    period: string,
    visibleDayCount: number,
    config: RenderConfig,
): string => {
    if (!config.showHud) {
        return '';
    }

    return `
  <div class="hud">
    <div class="hud-title">${escapeHtml(userSnapshot.username)}'s Minecraft Contributions</div>
    <div class="hud-row"><strong>${formatThousands(
        userSnapshot.totalContributions,
    )}</strong> contributions</div>
    <div class="hud-row">${period}</div>
    <div class="hud-row">${visibleDayCount} days, Three.js scene, README-safe export</div>
  </div>`;
};

const buildSceneStyles = (config: RenderConfig): string => `    :root {
      color-scheme: light;
      --sky-top: #93d5ff;
      --sky-bottom: #f4fbff;
      --hud-bg: rgba(15, 23, 42, 0.74);
      --hud-text: #f8fafc;
      --hud-muted: #dbeafe;
      --hud-accent: #86efac;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${
          config.background === 'transparent'
              ? 'transparent'
              : 'radial-gradient(circle at 18% 18%, rgba(255,255,255,0.76), transparent 26%), linear-gradient(180deg, var(--sky-top), var(--sky-bottom))'
      };
      font-family: "SF Pro Display", "Segoe UI", sans-serif;
    }

    body {
      position: relative;
    }

    #app {
      width: 100%;
      height: 100%;
    }

    .hud {
      position: absolute;
      top: 18px;
      left: 18px;
      display: grid;
      gap: 6px;
      padding: 14px 16px;
      border-radius: 16px;
      background: var(--hud-bg);
      color: var(--hud-text);
      backdrop-filter: blur(10px);
      box-shadow: 0 18px 42px rgba(15, 23, 42, 0.18);
      user-select: none;
      pointer-events: none;
    }

    .hud-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--hud-accent);
    }

    .hud-row {
      font-size: 13px;
      line-height: 1.35;
      color: var(--hud-muted);
    }

    .hud strong {
      color: var(--hud-text);
    }`;

const joinAssetUrl = (baseUrl: string, fileName: string): string =>
    `${baseUrl.replace(/\/$/, '')}/${fileName}`;

const buildSceneRuntimeAssets = (
    assetUrls: SceneAssetUrls,
): SceneRuntimeAssets => ({
    sheepTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'sheep.png'),
    sheepFurTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'sheep_fur.png'),
    grassTopTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'grass_block_top.png'),
    grassSideTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'grass_block_side.png'),
    grassSideOverlayTexturePath: joinAssetUrl(
        assetUrls.assetBaseUrl,
        'grass_block_side_overlay.png',
    ),
    grassSnowTexturePath: joinAssetUrl(
        assetUrls.assetBaseUrl,
        'grass_block_snow.png',
    ),
    pinkPetalsTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'pink_petals.png'),
    leafLitterTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'leaf_litter.png'),
    poppyTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'poppy.png'),
    dandelionTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'dandelion.png'),
    cornflowerTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'cornflower.png'),
    blueOrchidTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'blue_orchid.png'),
    azureBluetTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'azure_bluet.png'),
    pinkTulipTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'pink_tulip.png'),
    whiteTulipTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'white_tulip.png'),
    snowTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'snow.png'),
    dirtTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'dirt.png'),
    waterTopTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'water_top.png'),
    waterSideTexturePath: joinAssetUrl(assetUrls.assetBaseUrl, 'water_side.png'),
});

const encodeBootstrapPayload = (payload: SceneBootstrapPayload): string =>
    JSON.stringify(payload)
        .replaceAll('<', '\\u003c')
        .replaceAll('-->', '--\\>');

const buildSceneData = (
    userSnapshot: UserSnapshot,
    config: RenderConfig,
): SceneData => {
    const calendarMetrics = buildCalendarMetrics(userSnapshot, config.weeks);
    if (calendarMetrics.length === 0) {
        throw new Error('No calendar metrics to render.');
    }
    const monthGuideEntries = buildMonthGuideEntries(calendarMetrics);
    const period = `${calendarMetrics[0].date} / ${
        calendarMetrics[calendarMetrics.length - 1].date
    }`;

    return {
        username: userSnapshot.username,
        totalContributions: userSnapshot.totalContributions,
        period,
        background: config.background,
        showHud: config.showHud,
        showSheep: config.showSheep,
        sheepTargetHeight: SHEEP_TARGET_HEIGHT_BLOCKS,
        calendarMetrics,
        monthGuideEntries,
        sheepPlans: config.showSheep
            ? buildSheepPopulationPlans(calendarMetrics, config.gif.durationSec)
            : [],
        blossomCoverStops: KOREAN_BLOSSOM_COVER_STOPS,
        leafLitterCoverStops: KOREAN_LEAF_LITTER_COVER_STOPS,
        springFlowerCoverStops: KOREAN_SPRING_FLOWER_COVER_STOPS,
        seasonalGrassStops: KOREAN_SEASONAL_GRASS_STOPS,
        snowCoverStops: KOREAN_SNOW_COVER_STOPS,
        summerFlowerCoverStops: KOREAN_SUMMER_FLOWER_COVER_STOPS,
    };
};

export const buildSceneHtml = (
    userSnapshot: UserSnapshot,
    config: RenderConfig,
    assetUrls: SceneAssetUrls = SERVER_SCENE_ASSET_URLS,
): string => {
    const sceneData = buildSceneData(userSnapshot, config);
    const bootstrapPayload: SceneBootstrapPayload = {
        mountElementId: SCENE_MOUNT_ELEMENT_ID,
        gifDurationSec: config.gif.durationSec,
        sceneData,
        assets: buildSceneRuntimeAssets(assetUrls),
    };

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Minecraft Profile Renderer</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" />
  <style>
${buildSceneStyles(config)}
  </style>
</head>
<body>
  <div id="${SCENE_MOUNT_ELEMENT_ID}"></div>
${createHudMarkup(userSnapshot, sceneData.period, sceneData.calendarMetrics.length, config)}
  <script id="${SCENE_BOOTSTRAP_SCRIPT_ID}" type="application/json">${encodeBootstrapPayload(
      bootstrapPayload,
  )}</script>
  <script type="module" src="${assetUrls.runtimeScriptPath}"></script>
</body>
</html>`;
};
