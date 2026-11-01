import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  sendPasswordResetCode: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
  resetPassword: vi.fn(),
  clear: vi.fn(),
}));
vi.mock('@/api/auth.api.js', () => api);
vi.mock('@/store/useAuthStore.js', () => ({
  useAuthStore: () => ({ clear: api.clear }),
}));
import ForgotPasswordView from './ForgotPasswordView.vue';

describe('找回密码', () => {
  beforeEach(() => vi.clearAllMocks());
  it('验证码验证前无新密码表单，确认一致后仅提交服务端凭证', async () => {
    api.verifyPasswordResetCode.mockResolvedValue({
      resetToken: 'A'.repeat(43),
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    });
    const wrapper = mount(ForgotPasswordView, {
      global: { stubs: { RouterLink: true } },
    });
    expect(wrapper.find('input[type=password]').exists()).toBe(false);
    await wrapper.findAll('input')[0].setValue('admin@example.test');
    await wrapper.findAll('input')[1].setValue('012345');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.verifyPasswordResetCode).toHaveBeenCalledWith(
      'admin@example.test',
      '012345',
    );
    const passwords = wrapper.findAll('input[type=password]');
    expect(passwords).toHaveLength(2);
    await passwords[0].setValue('New2026!');
    await passwords[1].setValue('Different2026!');
    await wrapper.find('form').trigger('submit');
    expect(api.resetPassword).not.toHaveBeenCalled();
    await passwords[1].setValue('New2026!');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.resetPassword).toHaveBeenCalledWith('A'.repeat(43), 'New2026!');
    expect(api.clear).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain('密码已重置');
    wrapper.unmount();
  });
  it('验证失败不能进入重置步骤', async () => {
    api.verifyPasswordResetCode.mockRejectedValue(new Error('验证码错误'));
    const wrapper = mount(ForgotPasswordView, {
      global: { stubs: { RouterLink: true } },
    });
    await wrapper.findAll('input')[0].setValue('admin@example.test');
    await wrapper.findAll('input')[1].setValue('000000');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('验证码错误');
    expect(wrapper.find('input[type=password]').exists()).toBe(false);
    expect(api.resetPassword).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
