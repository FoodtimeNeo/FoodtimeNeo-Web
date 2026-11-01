import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const { register, replace } = vi.hoisted(() => ({
  register: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('@/store/useAuthStore.js', () => ({
  useAuthStore: () => ({ register }),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/api/auth.api.js', () => ({ sendVerificationCode: vi.fn() }));
import RegisterView from './RegisterView.vue';

describe('注册确认密码', () => {
  beforeEach(() => vi.clearAllMocks());
  async function fill(wrapper, confirmation) {
    const inputs = wrapper.findAll('input');
    for (const [index, value] of [
      '20260001@bjtu.edu.cn',
      '012345',
      'Foodtime2026!',
      confirmation,
    ].entries()) {
      await inputs[index].setValue(value);
    }
  }
  it('不一致时阻止请求，修正后仅提交正式密码和验证码', async () => {
    const wrapper = mount(RegisterView, {
      global: { stubs: { RouterLink: true } },
    });
    await fill(wrapper, 'Another2026!');
    await wrapper.find('form').trigger('submit');
    expect(register).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('两次输入的密码不一致');
    await wrapper.findAll('input')[3].setValue('Foodtime2026!');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(register).toHaveBeenCalledWith({
      email: '20260001@bjtu.edu.cn',
      password: 'Foodtime2026!',
      verificationCode: '012345',
    });
    expect(wrapper.findAll('input')[3].element.value).toBe('');
    expect(replace).toHaveBeenCalledWith({ name: 'login' });
    wrapper.unmount();
  });
});
