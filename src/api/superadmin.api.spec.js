import { expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('./http.js', async (original) => ({
  ...(await original()),
  http: api,
}));
import { fetchUsers, updateUserAccess } from './superadmin.api.js';
it('使用真实用户列表和统一权限更新，不发送身份或密码字段', async () => {
  await fetchUsers(2, '张');
  expect(api.get).toHaveBeenLastCalledWith('/admin/users', {
    params: { page: 2, size: 20, q: '张' },
  });
  await updateUserAccess('a/b', {
    role: 'user',
    status: 'disabled',
    password: 'fake',
    email: 'fake',
  });
  expect(api.put).toHaveBeenLastCalledWith('/admin/users/a%2Fb', {
    role: 'user',
    status: 'disabled',
  });
  expect(() =>
    updateUserAccess('x', { role: 'operator', status: 'active' }),
  ).toThrow('参数');
  expect(() =>
    updateUserAccess('x', { role: 'user', status: 'banned' }),
  ).toThrow('参数');
});
