import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, put, post } = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
}));
vi.mock('./http.js', () => ({ http: { get, put, post } }));

import {
  fetchAuditLogs,
  fetchDashboard,
  fetchUsers,
  updateUserRole,
  updateUserStatus,
  resetUserPassword,
  fetchInviteCode,
  generateInviteCode,
} from './superadmin.api.js';

describe('超级管理员看板接口', () => {
  beforeEach(() => {
    get.mockReset();
    put.mockReset();
    post.mockReset();
  });

  it('请求真实看板和日志地址，日志传分页参数', async () => {
    await fetchDashboard();
    await fetchAuditLogs(2, 20);
    expect(get.mock.calls).toEqual([
      ['/superadmin/dashboard'],
      ['/superadmin/logs', { params: { page: 2, per_page: 20 } }],
    ]);
  });

  it('请求用户分页、角色、状态、密码和当前邀请码接口', async () => {
    await fetchUsers(2, '张', 20);
    await updateUserRole('user/1', 'admin');
    await updateUserStatus('user/1', 'banned');
    await resetUserPassword('user/1', 'secret123');
    await fetchInviteCode();
    await generateInviteCode();
    expect(get.mock.calls).toEqual([
      [
        '/superadmin/users',
        { params: { page: 2, per_page: 20, search: '张' } },
      ],
      ['/auth/invite-code'],
    ]);
    expect(put.mock.calls).toEqual([
      ['/superadmin/users/user%2F1/role', { role: 'admin' }],
      ['/superadmin/users/user%2F1/status', { status: 'banned' }],
      ['/superadmin/users/user%2F1/password', { password: 'secret123' }],
    ]);
    expect(post).toHaveBeenCalledWith('/auth/invite-code/generate');
  });
});
