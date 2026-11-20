import { describe, expect, it } from 'vitest';
import {
  availableMapHalls,
  mapTransformAt,
  clampMapTransform,
} from './campusMap.js';
import model from '@/assets/campus-map/regions.json';

describe('校园图的显示与目录边界', () => {
  it('缩放围绕选定点且不能拖出整个地图', () => {
    const initial = { zoom: 1, x: 0, y: 0 };
    const zoomed = mapTransformAt(initial, 2, { x: 250, y: 100 }, 1000, 800);
    expect(zoomed).toEqual({ zoom: 2, x: -250, y: -100 });
    expect(clampMapTransform({ zoom: 2, x: 800, y: -2000 }, 1000, 800)).toEqual(
      { zoom: 2, x: 0, y: -800 },
    );
    expect(mapTransformAt(zoomed, 0.1, { x: 200, y: 100 }, 1000, 800)).toEqual(
      initial,
    );
  });
  it('不把未关联或停用目录变成可用入口，同一楼层映射可返回多个食堂', () => {
    expect(
      availableMapHalls({ diningHallIds: ['one', 'two', 'off'] }, [
        { id: 'one', name: '一楼' },
        { id: 'two', name: '二楼' },
        { id: 'off', active: false },
        { id: 'other' },
      ]).map((h) => h.id),
    ).toEqual(['one', 'two']);
    expect(availableMapHalls({ diningHallIds: [] }, [{ id: 'one' }])).toEqual(
      [],
    );
  });
  it('图层坐标属于同一高清底图，暂不标注的区域不作为可点击对象', () => {
    expect([model.width, model.height]).toEqual([5032, 3579]);
    expect(new Set(model.regions.map((r) => r.id)).size).toBe(6);
    for (const region of model.regions)
      for (const [x, y] of region.polygon) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(model.width);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(model.height);
      }
    expect(
      model.regions.some((r) =>
        ['staff-canteen', 'xueyuan', 'east-halal'].includes(r.id),
      ),
    ).toBe(false);
  });
});
