import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./http.js', () => ({ http: { get } }));

import { fetchAuditLogs, fetchDashboard } from './superadmin.api.js';

describe('超级管理员看板接口', () => {
  beforeEach(() => get.mockReset());

  it('请求真实看板和日志地址，日志传分页参数', async () => {
    await fetchDashboard();
    await fetchAuditLogs(2, 20);
    expect(get.mock.calls).toEqual([
      ['/superadmin/dashboard'],
      ['/superadmin/logs', { params: { page: 2, per_page: 20 } }],
    ]);
  });
});
