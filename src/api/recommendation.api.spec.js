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
    algorithmVersion: 'FT-HybridRec-v3-stall',
    total: 1,
    items: [
      {
        stallId: '00000000-0000-0000-0000-000000000003',
        stallName: '真实档口',
        diningHallId: '00000000-0000-0000-0000-000000000002',
        diningHallName: '真实食堂',
        averageRating: null,
        reviewCount: 0,
        imageUrl: '/api/v1/media/stall-cover',
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
    name: '真实档口',
    rating: null,
    intro: '今日探索',
    coverImageUrl: '/api/v1/media/stall-cover',
    route: {
      name: 'stallDetail',
      params: {
        canteenId: valid().items[0].diningHallId,
        stallId: valid().items[0].stallId,
      },
    },
  });
  expect(card).not.toHaveProperty('dishId');
});
it('接受真实空批次与实际评分', () => {
  expect(recommendationCards({ ...valid(), total: 0, items: [] })).toEqual([]);
  const data = valid();
  data.items[0].averageRating = 4.5;
  expect(recommendationCards(data)[0].rating).toBe(4.5);
});
it('拒绝不完整响应、重复档口、无效日期、数值和父级关系', () => {
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
    { stallId: 'missing' },
    { diningHallId: null },
    { recommendationScore: 2 },
    { imageUrl: null },
    { imageUrl: ' ' },
    { reasonCode: 'UNKNOWN' },
  ]) {
    const data = valid();
    Object.assign(data.items[0], patch);
    cases.push(data);
  }
  for (const data of cases)
    expect(() => recommendationCards(data)).toThrow('今日推荐数据异常');
});
