import { expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./http.js', async (original) => ({
  ...(await original()),
  http: api,
}));

import {
  fetchAdminDashboard,
  fetchAnalyticsOverview,
  MOCK_ADMIN_DASHBOARD,
} from './analytics.api.js';

it('按选定日期读取超管分析概览', async () => {
  api.get.mockResolvedValueOnce({ totalUsers: 10 });
  await fetchAnalyticsOverview({ from: '2026-10-01', to: '2026-10-30' });
  expect(api.get).toHaveBeenLastCalledWith('/admin/analytics/overview', {
    params: { from: '2026-10-01', to: '2026-10-30' },
  });
});

it('获取平台数据看板时调用 /admin/dashboard 并返回后端真实数据', async () => {
  const backendData = {
    registeredUsers: 2000,
    onlineUsers: 150,
    reviews: 5000,
    replies: 8000,
    posts: 1000,
    halls: 8,
    stalls: 50,
    dishes: 800,
    trend: [],
  };
  api.get.mockResolvedValueOnce(backendData);
  const result = await fetchAdminDashboard({ days: 7 });
  expect(api.get).toHaveBeenCalledWith('/admin/dashboard', {
    params: { days: 7 },
  });
  expect(result.registeredUsers).toBe(2000);
  expect(result.isMock).toBe(false);
});

it('接口报错时平滑降级到 mock 数据并标记 isMock', async () => {
  api.get.mockRejectedValueOnce(new Error('Network error or 404'));
  const result = await fetchAdminDashboard({ days: 7 });
  expect(result.registeredUsers).toBe(MOCK_ADMIN_DASHBOARD.registeredUsers);
  expect(result.isMock).toBe(true);
});
