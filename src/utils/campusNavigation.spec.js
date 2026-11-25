import { describe, expect, it } from 'vitest';
import calibration from '@/assets/campus-map/calibration.json';
import graph from '@/assets/campus-map/campus-graph.json';
import regionsModel from '@/assets/campus-map/regions.json';
import {
  createCampusProjection,
  formatDistance,
  formatWalkSummary,
} from './campusProjection.js';
import { createCampusNavigator } from './campusNavigator.js';

describe('校园地图 TPS 投影与校内步行导航', () => {
  const projection = createCampusProjection(calibration);
  const navigator = createCampusNavigator(graph);

  it('18 个校准锚点反投影误差小于 2px，并准确区分校内与校外位置', () => {
    expect(projection.anchors.length).toBe(18);
    for (const anchor of projection.anchors) {
      const pt = projection.toPixel(anchor.lat, anchor.lng);
      expect(Math.hypot(pt.x - anchor.x, pt.y - anchor.y)).toBeLessThan(2);
    }
    expect(projection.isOnCampus(39.947861, 116.335309)).toBe(true); // 南门
    expect(projection.isOnCampus(39.953199, 116.341662)).toBe(true); // 学苑餐厅
    expect(projection.isOnCampus(39.9087, 116.3975)).toBe(false); // 天安门
  });

  it('所有 5 个校门预设起点都能规划到 7 个食堂的完整步行路线', () => {
    const presets = navigator.presetStartNodes();
    expect(presets.length).toBe(5);
    expect(regionsModel.regions.length).toBe(7);
    for (const start of presets) {
      for (const region of regionsModel.regions) {
        const plan = navigator.routeFromNode(
          start.id,
          region.entryNodeId,
          region.name,
        );
        expect(plan).not.toBeNull();
        expect(plan.polyline.length).toBeGreaterThanOrEqual(2);
        expect(plan.steps.length).toBeGreaterThanOrEqual(2);
        expect(plan.totalMeters).toBeGreaterThan(20);
        expect(plan.totalMeters).toBeLessThan(2600);
      }
    }
  });

  it('支持任意校内像素点吸附路网并格式化距离与耗时', () => {
    const plan = navigator.routeFromPixel(
      1880,
      1520,
      '我的位置',
      'hall-minghu',
      '明湖餐厅',
    );
    expect(plan).not.toBeNull();
    expect(plan.totalMeters).toBeGreaterThan(150);
    expect(plan.steps.at(-1).instruction).toContain('明湖餐厅');
    expect(formatDistance(280)).toBe('280m');
    expect(formatDistance(1250)).toBe('1.3km');
    expect(formatWalkSummary(280)).toBe('280m · 约4分钟');
  });
});
