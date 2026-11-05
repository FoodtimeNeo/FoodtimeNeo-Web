import { beforeEach, expect, it, vi } from 'vitest';
const get = vi.hoisted(() => vi.fn());
vi.mock('./http.js', async (original) => ({
  ...(await original()),
  http: { get },
}));
import {
  fetchDailyRecommendations,
  recommendationCards,
} from './recommendation.api.js';

function valid() {
  return {
    date: '2026-11-04',
    algorithmVersion: 'FT-HybridRec-v2',
    total: 1,
    items: [
      {
        dishId: '00000000-0000-0000-0000-000000000001',
        dishName: '真实菜品',
        diningHallId: '00000000-0000-0000-0000-000000000002',
        diningHallName: '真实食堂',
        stallId: '00000000-0000-0000-0000-000000000003',
        stallName: '真实档口',
        averageRating: null,
        reviewCount: 0,
        imageUrl: null,
        recommendationType: 'EXPLORE',
        recommendationScore: 0.83,
        reasonCode: 'DAILY_DISCOVERY',
        reason: '今日探索',
      },
    ],
  };
}
beforeEach(() => get.mockReset());
it('请求真实接口并保留空评分、父级路由与推荐理由，不将推荐分当作星级', async () => {
  get.mockResolvedValue(valid());
  const signal = new AbortController().signal;
  const [card] = await fetchDailyRecommendations({ signal });
  expect(get).toHaveBeenCalledWith('/recommendations/daily', { signal });
  expect(card).toMatchObject({
    name: '真实菜品',
    rating: null,
    intro: '今日探索',
    coverImageUrl: null,
    route: {
      name: 'dishDetail',
      params: {
        canteenId: valid().items[0].diningHallId,
        stallId: valid().items[0].stallId,
        dishId: valid().items[0].dishId,
      },
    },
  });
  expect(card).not.toHaveProperty('price');
});
it('接受真实空批次与实际评分', () => {
  expect(recommendationCards({ ...valid(), total: 0, items: [] })).toEqual([]);
  const data = valid();
  data.items[0].averageRating = 4.5;
  expect(recommendationCards(data)[0].rating).toBe(4.5);
});
it('拒绝不完整响应、重复菜品、无效日期、数值和父级关系', () => {
  const cases = [
    undefined,
    { ...valid(), date: '2026-02-30' },
    { ...valid(), total: 2 },
    { ...valid(), total: 2, items: [valid().items[0], valid().items[0]] },
  ];
  for (const patch of [
    { averageRating: 0.83 },
    { averageRating: '4.5' },
    { reviewCount: -1 },
    { dishId: 'missing' },
    { diningHallId: null },
    { recommendationScore: 2 },
    { imageUrl: undefined },
    { reasonCode: 'UNKNOWN' },
  ]) {
    const data = valid();
    Object.assign(data.items[0], patch);
    cases.push(data);
  }
  for (const data of cases)
    expect(() => recommendationCards(data)).toThrow('今日推荐数据异常');
});
