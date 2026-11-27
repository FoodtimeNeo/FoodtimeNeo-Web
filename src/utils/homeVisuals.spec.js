import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DISH_IMAGES,
  CANTEEN_IMAGE_OVERRIDES,
  getDishCoverImage,
  getCanteenCoverImage,
  getDishDisplayPrice,
  getCleanCanteenChips,
  getCleanDishIntro,
} from './homeVisuals.js';

describe('homeVisuals utility', () => {
  it('正确解析已有菜品封面或按 ID 稳定返回默认插画', () => {
    expect(getDishCoverImage({ coverImageUrl: '/custom/dish.png' })).toBe(
      '/custom/dish.png',
    );

    const fallback1 = getDishCoverImage({ id: 'dish-101', name: '美味拌饭' });
    const fallback2 = getDishCoverImage({ id: 'dish-101', name: '美味拌饭' });
    expect(fallback1).toBe(fallback2);
    expect(DEFAULT_DISH_IMAGES).toContain(fallback1);
  });

  it('针对明湖2楼、3楼进行差异化外景/内景图替换', () => {
    const canteen2 = {
      name: '明湖餐厅2楼',
      coverImageUrl: '/same/minghu.jpg',
    };
    const canteen3 = {
      name: '明湖餐厅3楼',
      coverImageUrl: '/same/minghu.jpg',
    };
    const canteenOther = {
      name: '某新食堂',
      coverImageUrl: '/other/pic.jpg',
    };

    expect(getCanteenCoverImage(canteen2)).toBe(
      CANTEEN_IMAGE_OVERRIDES['明湖餐厅2楼'],
    );
    expect(getCanteenCoverImage(canteen3)).toBe(
      CANTEEN_IMAGE_OVERRIDES['明湖餐厅3楼'],
    );
    expect(getCanteenCoverImage(canteen2)).not.toBe(
      getCanteenCoverImage(canteen3),
    );
    expect(getCanteenCoverImage(canteenOther)).toBe('/other/pic.jpg');
  });

  it('返回合理菜品展示价格', () => {
    expect(getDishDisplayPrice({ price: 18.5 })).toBe('18.5');
    expect(getDishDisplayPrice({ avgPrice: 14 })).toBe('14.0');
    expect(getDishDisplayPrice({})).toMatch(/^\d+\.\d$/);
  });

  it('生成真实的食堂业务标签并排除千篇一律的无效文案', () => {
    const chips = getCleanCanteenChips({
      name: '明湖餐厅2楼',
      rating: 4.8,
      stallCount: 11,
      avgPrice: 16,
    });
    expect(chips).toContain('超高口碑');
    expect(chips).toContain('2层');
    expect(chips).toContain('11个档口');
    expect(chips).toContain('¥16/人');
    expect(chips).not.toContain('校园招牌');
    expect(chips).not.toContain('打卡推荐');

    const zeroStallChips = getCleanCanteenChips({
      name: '留园食堂',
      stallCount: 0,
    });
    expect(zeroStallChips).toContain('0个档口');
  });

  it('清洗菜品文案并过滤“发现更多菜品”', () => {
    expect(getCleanDishIntro('发现更多菜品')).toBe('');
    expect(getCleanDishIntro('口碑不错')).toBe('口碑不错');
    expect(getCleanDishIntro('')).toBe('');
    expect(getCleanDishIntro(null)).toBe('');
  });
});
