import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
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

enableAutoUnmount(afterEach);
afterEach(() => vi.useRealTimers());

describe('找回密码', () => {
  beforeEach(() => vi.resetAllMocks());
  it('验证码验证前无新密码表单，确认一致后仅提交服务端凭证', async () => {
    api.sendPasswordResetCode.mockResolvedValue({ resendAfterSeconds: 60 });
    api.verifyPasswordResetCode.mockResolvedValue({
      resetToken: 'A'.repeat(43),
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    });
    const wrapper = mount(ForgotPasswordView, {
      global: { stubs: { RouterLink: true } },
    });
    expect(wrapper.find('input[type=password]').exists()).toBe(false);
    await wrapper.findAll('input')[0].setValue('admin@example.test');
    const send = wrapper
      .findAll('button')
      .find((b) => b.text() === '发送验证码');
    expect(send.element.disabled).toBe(false);
    await send.trigger('click');
    await flushPromises();
    expect(api.sendPasswordResetCode).toHaveBeenCalledWith(
      'admin@example.test',
    );
    expect(wrapper.get('[role=status]').text()).toContain('请求已受理');
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
  it('发送中与倒计时内禁止重复发送，到期后可重发', async () => {
    vi.useFakeTimers();
    let finish;
    api.sendPasswordResetCode.mockImplementationOnce(
      () => new Promise((resolve) => (finish = resolve)),
    );
    const wrapper = mount(ForgotPasswordView, {
      global: { stubs: { RouterLink: true } },
    });
    const send = wrapper.findAll('button')[0];
    expect(send.element.disabled).toBe(true);
    await wrapper.findAll('input')[0].setValue('admin@example.test');
    await send.trigger('click');
    expect(send.text()).toBe('发送中…');
    expect(send.element.disabled).toBe(true);
    await send.trigger('click');
    expect(api.sendPasswordResetCode).toHaveBeenCalledOnce();
    finish({ resendAfterSeconds: 60 });
    await flushPromises();
    expect(send.text()).toBe('60s 后重发');
    expect(send.element.disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(60000);
    expect(send.text()).toBe('发送验证码');
    expect(send.element.disabled).toBe(false);
    api.sendPasswordResetCode.mockResolvedValueOnce({ resendAfterSeconds: 60 });
    await send.trigger('click');
    await flushPromises();
    expect(api.sendPasswordResetCode).toHaveBeenCalledTimes(2);
  });
  it('发码失败显示错误，保留邮箱并允许重试', async () => {
    api.sendPasswordResetCode
      .mockRejectedValueOnce(new Error('网络连接失败，请重试'))
      .mockResolvedValueOnce({ resendAfterSeconds: 60 });
    const wrapper = mount(ForgotPasswordView, {
      global: { stubs: { RouterLink: true } },
    });
    await wrapper.findAll('input')[0].setValue('admin@example.test');
    const send = wrapper.findAll('button')[0];
    await send.trigger('click');
    await flushPromises();
    expect(wrapper.get('[role=alert]').text()).toContain('网络连接失败');
    expect(wrapper.findAll('input')[0].element.value).toBe(
      'admin@example.test',
    );
    expect(send.element.disabled).toBe(false);
    await send.trigger('click');
    await flushPromises();
    expect(api.sendPasswordResetCode).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[role=alert]').exists()).toBe(false);
    expect(wrapper.get('[role=status]').text()).toContain('请求已受理');
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
