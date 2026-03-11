import { describe, it, expect } from 'vitest';
import { createSampleProfile } from '../../sample-profile.js';
import { buildSceneHtml } from '../../scene/build-scene-page.js';
import { DEFAULT_CONFIG } from '../../config.js';

describe('sample render pipeline integration', () => {
    const profile = createSampleProfile('integration-test');
    const html = buildSceneHtml(profile, DEFAULT_CONFIG);

    it('produces a valid HTML document', () => {
        expect(html).toContain('<!doctype html>');
        expect(html).toContain('</html>');
    });

    it('contains bootstrap payload with valid JSON', () => {
        const match = html.match(/id="scene-bootstrap"[^>]*>([\s\S]*?)<\/script>/);
        expect(match).not.toBeNull();
        const payload = JSON.parse(match![1]);
        expect(payload).toBeDefined();
    });

    it('bootstrap payload has calendarMetrics', () => {
        const match = html.match(/id="scene-bootstrap"[^>]*>([\s\S]*?)<\/script>/);
        const payload = JSON.parse(match![1]);
        expect(payload.sceneData.calendarMetrics).toBeDefined();
        expect(Array.isArray(payload.sceneData.calendarMetrics)).toBe(true);
        expect(payload.sceneData.calendarMetrics.length).toBeGreaterThan(0);
    });

    it('bootstrap payload has sheepPlans', () => {
        const match = html.match(/id="scene-bootstrap"[^>]*>([\s\S]*?)<\/script>/);
        const payload = JSON.parse(match![1]);
        expect(payload.sceneData.sheepPlans).toBeDefined();
        expect(Array.isArray(payload.sceneData.sheepPlans)).toBe(true);
        expect(payload.sceneData.sheepPlans.length).toBeGreaterThan(0);
    });

    it('bootstrap payload has all seasonal stops', () => {
        const match = html.match(/id="scene-bootstrap"[^>]*>([\s\S]*?)<\/script>/);
        const payload = JSON.parse(match![1]);
        expect(payload.sceneData.snowCoverStops).toBeDefined();
        expect(payload.sceneData.blossomCoverStops).toBeDefined();
        expect(payload.sceneData.seasonalGrassStops).toBeDefined();
        expect(payload.sceneData.springFlowerCoverStops).toBeDefined();
        expect(payload.sceneData.summerFlowerCoverStops).toBeDefined();
        expect(payload.sceneData.leafLitterCoverStops).toBeDefined();
    });

    it('bootstrap payload has valid mountElementId', () => {
        const match = html.match(/id="scene-bootstrap"[^>]*>([\s\S]*?)<\/script>/);
        const payload = JSON.parse(match![1]);
        expect(payload.mountElementId).toBe('app');
    });

    it('bootstrap payload has asset paths', () => {
        const match = html.match(/id="scene-bootstrap"[^>]*>([\s\S]*?)<\/script>/);
        const payload = JSON.parse(match![1]);
        expect(payload.assets).toBeDefined();
        expect(payload.assets.sheepTexturePath).toContain('sheep.png');
        expect(payload.assets.grassTopTexturePath).toContain('grass_block_top.png');
    });

    it('sheep plans have valid structure', () => {
        const match = html.match(/id="scene-bootstrap"[^>]*>([\s\S]*?)<\/script>/);
        const payload = JSON.parse(match![1]);
        for (const plan of payload.sceneData.sheepPlans) {
            expect(plan.islandId).toBeDefined();
            expect(plan.colorName).toBeDefined();
            expect(plan.colorHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(plan.route.length).toBeGreaterThan(0);
            expect(plan.loopPlan.segments.length).toBeGreaterThan(0);
        }
    });

    it('calendarMetrics have required fields', () => {
        const match = html.match(/id="scene-bootstrap"[^>]*>([\s\S]*?)<\/script>/);
        const payload = JSON.parse(match![1]);
        const firstMetric = payload.sceneData.calendarMetrics[0];
        expect(firstMetric.contributionCount).toBeDefined();
        expect(firstMetric.contributionLevel).toBeDefined();
        expect(firstMetric.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(firstMetric.week).toBeDefined();
        expect(firstMetric.dayOfWeek).toBeDefined();
        expect(firstMetric.worldHeight).toBeGreaterThan(0);
    });

    it('month guide entries exist', () => {
        const match = html.match(/id="scene-bootstrap"[^>]*>([\s\S]*?)<\/script>/);
        const payload = JSON.parse(match![1]);
        expect(payload.sceneData.monthGuideEntries).toBeDefined();
        expect(payload.sceneData.monthGuideEntries.length).toBeGreaterThan(0);
        const firstEntry = payload.sceneData.monthGuideEntries[0];
        expect(firstEntry.week).toBeDefined();
        expect(firstEntry.monthLabel).toBeDefined();
    });

    it('gifDurationSec matches config', () => {
        const match = html.match(/id="scene-bootstrap"[^>]*>([\s\S]*?)<\/script>/);
        const payload = JSON.parse(match![1]);
        expect(payload.gifDurationSec).toBe(DEFAULT_CONFIG.gif.durationSec);
    });
});
