import { describe, expect, it } from 'vitest';
import {
  clampScale,
  easeOutCubic,
  interpolateTransform,
  zoomTarget,
} from './zoomAnimation.js';

const rect = { left: 0, top: 0, width: 400, height: 700 };

describe('双击缩放几何', () => {
  it('倍数被限制在 1 到 5', () => {
    expect(clampScale(0.2)).toBe(1);
    expect(clampScale(8)).toBe(5);
    expect(clampScale(2.5)).toBe(2.5);
  });

  it('以触点为锚计算目标平移', () => {
    const target = zoomTarget({
      scale: 1,
      x: 0,
      y: 0,
      rect,
      anchor: { x: 100, y: 200 },
      nextScale: 2,
    });
    const cx = 200;
    const cy = 350;
    expect(target.scale).toBe(2);
    expect(target.x).toBe(100 - cx - (100 - cx) * 2);
    expect(target.y).toBe(200 - cy - (200 - cy) * 2);
  });

  it('终点缩放与目标一致，且缓动单调', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    const from = { scale: 1, x: 0, y: 0 };
    const to = { scale: 2.5, x: -30, y: -40 };
    expect(interpolateTransform(from, to, 0)).toEqual(from);
    expect(interpolateTransform(from, to, 1)).toEqual(to);
    const middle = interpolateTransform(from, to, 0.5);
    expect(middle.scale).toBeGreaterThan(1);
    expect(middle.scale).toBeLessThan(2.5);
  });
});
