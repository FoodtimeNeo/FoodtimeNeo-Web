import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  getCsrf: vi.fn(),
  invalidateSession: vi.fn(),
}));
vi.mock('./http.js', () => ({
  http: api,
  getCsrf: api.getCsrf,
  invalidateSession: api.invalidateSession,
}));
import {
  login,
  register,
  sendVerificationCode,
  logout,
  changePassword,
} from './auth.api.js';
beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.post.mockResolvedValue({ user: { id: 'one' } });
});
describe('认证字段与会话轮换', () => {
  it('登录发送account与原始密码，之后获取新CSRF', async () => {
    const order = [];
    api.post.mockImplementation(async () => {
      order.push('login');
      return { user: { id: 'one' } };
    });
    api.invalidateSession.mockImplementation(() => order.push('invalidate'));
    api.getCsrf.mockImplementation(async () => order.push('csrf'));
    await login({ loginId: ' 20260001@BJTU.EDU.CN ', password: 'Pass2026!' });
    expect(api.post).toHaveBeenCalledWith(
      '/auth/login',
      { account: '20260001@bjtu.edu.cn', password: 'Pass2026!' },
      { skipUnauthorized: true },
    );
    expect(order).toEqual(['login', 'invalidate', 'csrf']);
  });
  it('注册不会提交客户端角色、邀请码或昵称', async () => {
    await register({
      email: '20260001@bjtu.edu.cn',
      password: 'Pass2026!',
      verificationCode: '012345',
      role: 'superadmin',
      inviteCode: 'fake',
      nickname: 'fake',
    });
    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      email: '20260001@bjtu.edu.cn',
      password: 'Pass2026!',
      verificationCode: '012345',
    });
    await sendVerificationCode('20260001@bjtu.edu.cn');
    expect(api.post).toHaveBeenLastCalledWith('/auth/register/email-code', {
      email: '20260001@bjtu.edu.cn',
    });
  });
  it('退出和改密只在服务端成功后清除会话缓存', async () => {
    api.post.mockRejectedValueOnce(new Error('offline'));
    await expect(logout()).rejects.toThrow('offline');
    expect(api.invalidateSession).not.toHaveBeenCalled();
    await logout();
    expect(api.invalidateSession).toHaveBeenCalledOnce();
    await changePassword({ oldPassword: 'Old2026!', newPassword: 'New2026!' });
    expect(api.put).toHaveBeenCalledWith('/users/me/password', {
      oldPassword: 'Old2026!',
      newPassword: 'New2026!',
    });
  });
});
