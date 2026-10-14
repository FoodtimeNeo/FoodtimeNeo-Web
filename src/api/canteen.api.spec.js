import { beforeEach, expect, it, vi } from 'vitest';
const get = vi.hoisted(() => vi.fn());
vi.mock('./http.js', async (importOriginal) => ({
  ...(await importOriginal()),
  http: { get },
}));
import { fetchCanteen, fetchCanteenDishes } from './canteen.api.js';
beforeEach(() => get.mockReset());
it('食堂详情来自真实列表，不存在时返回404而不是虚构详情接口', async () => {
  get.mockResolvedValue([{ id: 'one', name: '第一食堂', coverImageUrl: null }]);
  expect(await fetchCanteen('one')).toMatchObject({ name: '第一食堂' });
  expect(get.mock.calls[0][0]).toBe('/dining-halls');
  await expect(fetchCanteen('missing')).rejects.toMatchObject({ status: 404 });
});
it('点评选菜只通过真实档口关系聚合', async () => {
  get.mockImplementation(async (url) =>
    url === '/dining-halls/hall/stalls'
      ? [{ id: 'stall' }]
      : [{ id: 'dish', stallId: 'stall' }],
  );
  expect(await fetchCanteenDishes('hall')).toEqual([
    { id: 'dish', stallId: 'stall' },
  ]);
  expect(get.mock.calls.map((call) => call[0])).toEqual([
    '/dining-halls/hall/stalls',
    '/stalls/stall/dishes',
  ]);
});
