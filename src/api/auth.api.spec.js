import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  getCsrf: vi.fn(),
  invalidateSession: vi.fn(),
}));
vi.mock('./http.js', () => ({
  ApiError: class ApiError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.code = options.code;
    }
  },
  http: api,
  getCsrf: api.getCsrf,
  invalidateSession: api.invalidateSession,
}));
import {
  login,
  register,
  fetchRegistrationPolicy,
  fetchCaptcha,
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
  it('需要验证码时透传一次性挑战字段', async () => {
    await login({
      loginId: '20260001@bjtu.edu.cn',
      password: 'Pass2026!',
      challengeId: '00000000-0000-4000-8000-000000000001',
      challengeAnswer: ' 7 ',
    });
    expect(api.post).toHaveBeenCalledWith(
      '/auth/login',
      {
        account: '20260001@bjtu.edu.cn',
        password: 'Pass2026!',
        challengeId: '00000000-0000-4000-8000-000000000001',
        challengeAnswer: '7',
      },
      { skipUnauthorized: true },
    );
  });
  it('读取并校验一次性验证码响应', async () => {
    api.get.mockResolvedValue({
      challengeId: '00000000-0000-4000-8000-000000000001',
      imageBase64: 'iVBORw0KGgo=',
      expiresAt: '2026-11-12T00:02:00Z',
    });
    await expect(fetchCaptcha()).resolves.toMatchObject({
      imageBase64: 'iVBORw0KGgo=',
    });
    expect(api.get).toHaveBeenCalledWith('/auth/captcha');
    api.get.mockResolvedValue({ challengeId: 'x' });
    await expect(fetchCaptcha()).rejects.toMatchObject({ code: 'PROTOCOL' });
  });
  it('读取公开注册策略', async () => {
    api.get.mockResolvedValue({ mode: 'open' });
    await fetchRegistrationPolicy();
    expect(api.get).toHaveBeenCalledWith('/auth/registration-policy');
  });
  it('注册透传清理后的邀请码', async () => {
    await register({
      email: '20260001@bjtu.edu.cn',
      password: 'Pass2026!',
      verificationCode: '012345',
      invitationCode: ' ABCD2345EFGH ',
    });
    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      email: '20260001@bjtu.edu.cn',
      password: 'Pass2026!',
      verificationCode: '012345',
      invitationCode: 'ABCD2345EFGH',
    });
  });
  it('注册不会提交客户端角色、未知邀请字段或昵称', async () => {
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
