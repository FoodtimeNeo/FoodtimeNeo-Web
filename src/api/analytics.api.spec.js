import { beforeEach, expect, it, vi } from 'vitest';
import { dashboardFixture } from './__fixtures__/dashboard.js';
const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./http.js', async (original) => ({
  ...(await original()),
  http: api,
}));
import {
  fetchAdminDashboard,
  fetchAnalyticsOverview,
} from './analytics.api.js';
beforeEach(() => {
  api.get.mockReset();
});
it('读取超管分析概览兼容接口', async () => {
  api.get.mockResolvedValue({ totalUsers: 10 });
  await fetchAnalyticsOverview({ from: '2026-10-01', to: '2026-10-30' });
  expect(api.get).toHaveBeenLastCalledWith('/admin/analytics/overview', {
    params: { from: '2026-10-01', to: '2026-10-30' },
  });
});
it('解析真实统计与快照，保留取消信号', async () => {
  const raw = dashboardFixture(),
    controller = new AbortController();
  api.get.mockResolvedValue(raw);
  const result = await fetchAdminDashboard(
    { days: 7 },
    { signal: controller.signal },
  );
  expect(api.get).toHaveBeenCalledWith('/admin/dashboard', {
    params: { days: 7 },
    signal: controller.signal,
  });
  expect(result).toEqual(raw);
  expect(Object.isFrozen(result.trend)).toBe(true);
});
it.each([401, 403, 404, 503, 0])('HTTP %s失败不再回退样例', async (status) => {
  const error = Object.assign(new Error('failed'), { status });
  api.get.mockRejectedValue(error);
  await expect(fetchAdminDashboard()).rejects.toBe(error);
});
it('真实零统计保持为零', async () => {
  const raw = dashboardFixture();
  for (const key of [
    'registeredUsers',
    'onlineUsers',
    'reviews',
    'replies',
    'posts',
    'halls',
    'stalls',
    'dishes',
  ])
    raw[key] = 0;
  api.get.mockResolvedValue(raw);
  expect((await fetchAdminDashboard()).registeredUsers).toBe(0);
});
it('缺字段、非法计数、时间和趋势拒绝作为成功结果', async () => {
  const invalid = [];
  const missing = dashboardFixture();
  delete missing.registeredUsers;
  invalid.push(missing);
  for (const value of [-1, 1.5, '2', Number.MAX_SAFE_INTEGER + 1])
    invalid.push({ ...dashboardFixture(), posts: value });
  invalid.push(
    { ...dashboardFixture(), generatedAt: 'bad' },
    { ...dashboardFixture(), trend: [] },
  );
  const duplicate = dashboardFixture();
  duplicate.trend[1].day = duplicate.trend[0].day;
  invalid.push(duplicate);
  const badDay = dashboardFixture();
  badDay.trend[0].day = '2026-02-30';
  invalid.push(badDay);
  const gap = dashboardFixture();
  gap.trend[1].day = '2026-10-26';
  invalid.push(gap);
  for (const data of invalid) {
    api.get.mockResolvedValueOnce(data);
    await expect(fetchAdminDashboard()).rejects.toMatchObject({
      code: 'DASHBOARD_INVALID_RESPONSE',
    });
  }
});
it.each([0, 32, 1.5])('非法days=%s不发出请求', async (days) => {
  await expect(fetchAdminDashboard({ days })).rejects.toBeInstanceOf(
    RangeError,
  );
  expect(api.get).not.toHaveBeenCalled();
});
