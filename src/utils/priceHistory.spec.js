import { expect, it } from 'vitest';
import { priceRuns, recordedPrice, stepCoordinates } from './priceHistory.js';
const entry = (id, price, unit = 'serving', hour = id) => ({
  id: String(id),
  price,
  priceUnit: unit,
  recordedAt: `2026-11-13T${String(hour).padStart(2, '0')}:00:00Z`,
});
const snapshot = (records) => ({
  records,
  windowStart: null,
  windowEnd: '2026-11-13T20:00:00Z',
});
it('连续同价合并，涨回原价仍保留一次真实变动', () => {
  const [run] = priceRuns(
    snapshot([entry(1, 12), entry(2, '12.00'), entry(3, 15), entry(4, 12)]),
  );
  expect(run.points.map((p) => p.entry.id)).toEqual(['1', '3', '4']);
  const graph = stepCoordinates(run);
  expect((graph.path.match(/ V /g) || []).length).toBe(2);
  expect(graph.path).not.toContain(' L ');
});
it('相同金额不同计价单位分段，不跨单位连线', () => {
  const runs = priceRuns(
    snapshot([entry(1, 15), entry(2, 15, 'jin'), entry(3, 15)]),
  );
  expect(runs.map((run) => run.unit)).toEqual(['serving', 'jin', 'serving']);
  expect(runs.every((run) => run.points.length === 1)).toBe(true);
});
it('未知价格留空，零元是有效价格', () => {
  const runs = priceRuns(snapshot([entry(1, 10), entry(2, null), entry(3, 0)]));
  expect(runs).toHaveLength(2);
  expect(runs[1].points[0].price).toBe(0);
  expect(recordedPrice(null, 'kg')).toBe('价格未知');
  expect(recordedPrice(0, 'kg')).toContain('/公斤');
});
it('区间起点沿用旧价，原记录时间不改写', () => {
  const record = { ...entry(1, 12), carriedForward: true };
  const start = '2026-11-13T08:00:00Z';
  const [run] = priceRuns({ ...snapshot([record]), windowStart: start });
  expect(run.start).toBe(Date.parse(start));
  expect(run.points[0].entry.recordedAt).toBe(record.recordedAt);
});
it('相同时刻的多次变动保持服务器顺序，几何坐标无非有限值', () => {
  const [run] = priceRuns(
    snapshot([entry(1, 12, 'serving', 1), entry(2, 16, 'serving', 1)]),
  );
  const geometry = stepCoordinates(run, 240);
  expect(geometry.points.map((p) => p.price)).toEqual([12, 16]);
  expect(geometry.path).not.toMatch(/NaN|Infinity/);
});
it('空历史和全部未知价格不生成假零元走势', () => {
  expect(priceRuns(snapshot([]))).toEqual([]);
  expect(priceRuns(snapshot([entry(1, null), entry(2, null)]))).toEqual([]);
});
it('最大合法金额在窄图中仍保留可绘制的横轴宽度', () => {
  const [run] = priceRuns(snapshot([entry(1, 99999999.99)]));
  const geometry = stepCoordinates(run, 240);
  expect(geometry.right - geometry.left).toBeGreaterThan(100);
  expect(geometry.points[0].y).toBeGreaterThan(geometry.top);
});
