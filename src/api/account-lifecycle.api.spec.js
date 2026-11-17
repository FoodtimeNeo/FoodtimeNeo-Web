import { beforeEach, expect, it, vi } from 'vitest';
const http = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('./http.js', async () => {
  const actual = await vi.importActual('./http.js');
  return { ...actual, http };
});
import { confirmAccountAction } from './account-lifecycle.api.js';
beforeEach(() => vi.clearAllMocks());
const response = (role) => ({
  profile: { id: 'owner', role, schoolEmail: null, schoolEmailVerified: false },
  schoolEmailReusableAt: '2026-11-13T14:00:00Z',
});
it.each(['user', 'visitor'])(
  '解绑接受服务器当前策略返回的 %s 权限',
  async (role) => {
    const value = response(role);
    http.post.mockResolvedValue(value);
    expect(await confirmAccountAction('unbind', '012345')).toEqual(value);
    expect(http.post).toHaveBeenCalledWith(
      '/users/me/account-lifecycle/unbind',
      {
        verificationCode: '012345',
      },
    );
  },
);
it.each([
  { ...response('admin') },
  {
    ...response('user'),
    profile: { ...response('user').profile, schoolEmail: '123@bjtu.edu.cn' },
  },
  {
    ...response('user'),
    profile: { ...response('user').profile, schoolEmailVerified: true },
  },
])('解绑拒绝角色越权或仍保留学校认证的异常响应', async (value) => {
  http.post.mockResolvedValue(value);
  await expect(confirmAccountAction('unbind', '012345')).rejects.toMatchObject({
    code: 'PROTOCOL',
  });
});
