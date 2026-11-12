import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const { register, replace, fetchRegistrationPolicy } = vi.hoisted(() => ({
  register: vi.fn(),
  replace: vi.fn(),
  fetchRegistrationPolicy: vi.fn(),
}));
vi.mock('@/store/useAuthStore.js', () => ({
  useAuthStore: () => ({ register }),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/api/auth.api.js', () => ({
  sendVerificationCode: vi.fn(),
  fetchRegistrationPolicy,
}));
import RegisterView from './RegisterView.vue';

const openPolicy = {
  mode: 'open',
  canSendEmailCode: true,
  invitationRequired: false,
  revision: 'open:email',
};
const invitationPolicy = {
  mode: 'invitation',
  canSendEmailCode: true,
  invitationRequired: true,
  revision: 'invitation:email',
};

async function mountView(policy = openPolicy) {
  fetchRegistrationPolicy.mockResolvedValue(policy);
  const wrapper = mount(RegisterView, {
    global: { stubs: { RouterLink: true } },
  });
  await flushPromises();
  return wrapper;
}

async function fill(wrapper, values = []) {
  const inputs = wrapper.findAll('input');
  const defaults = [
    '20260001@bjtu.edu.cn',
    '',
    '012345',
    'Foodtime2026!',
    'Foodtime2026!',
  ];
  const merged = defaults.map((value, index) => values[index] ?? value);
  for (const [index, value] of merged.entries()) {
    await inputs[index].setValue(value);
  }
}

describe('注册策略与确认密码', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchRegistrationPolicy.mockResolvedValue(openPolicy);
  });

  it('不一致时阻止请求，修正后仅提交正式密码和验证码', async () => {
    const wrapper = await mountView();
    await fill(wrapper, [
      undefined,
      undefined,
      undefined,
      'Foodtime2026!',
      'Another2026!',
    ]);
    await wrapper.find('form').trigger('submit');
    expect(register).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('两次输入的密码不一致');
    await wrapper.findAll('input')[4].setValue('Foodtime2026!');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(register).toHaveBeenCalledWith({
      email: '20260001@bjtu.edu.cn',
      password: 'Foodtime2026!',
      verificationCode: '012345',
    });
    expect(wrapper.findAll('input')[4].element.value).toBe('');
    expect(replace).toHaveBeenCalledWith({ name: 'login' });
    wrapper.unmount();
  });

  it('邀请模式显示必填邀请码并随注册透传', async () => {
    const wrapper = await mountView(invitationPolicy);
    expect(wrapper.text()).toContain('邀请码（必填）');
    await fill(wrapper, [undefined, 'ABCD2345EFGH']);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(register).toHaveBeenCalledWith({
      email: '20260001@bjtu.edu.cn',
      password: 'Foodtime2026!',
      verificationCode: '012345',
      invitationCode: 'ABCD2345EFGH',
    });
    wrapper.unmount();
  });

  it('邀请模式缺少邀请码时不提交', async () => {
    const wrapper = await mountView(invitationPolicy);
    await fill(wrapper);
    await wrapper.find('form').trigger('submit');
    expect(register).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('当前注册需要邀请码');
    wrapper.unmount();
  });

  it('关闭模式停止表单与提交', async () => {
    const wrapper = await mountView({
      mode: 'closed',
      canSendEmailCode: false,
      invitationRequired: false,
      revision: 'closed:no-email',
    });
    expect(wrapper.text()).toContain('注册暂未开放');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(register).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('策略读取失败不默认开放，显示重试', async () => {
    fetchRegistrationPolicy.mockRejectedValueOnce(new Error('网络不可用'));
    const wrapper = mount(RegisterView, {
      global: { stubs: { RouterLink: true } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('网络不可用');
    expect(wrapper.text()).toContain('重试');
    await wrapper.find('form').trigger('submit');
    expect(register).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
