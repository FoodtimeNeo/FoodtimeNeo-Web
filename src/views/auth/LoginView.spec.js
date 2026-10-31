import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const login = vi.fn();
vi.mock('@/store/useAuthStore.js', () => ({
  useAuthStore: () => ({ login }),
}));

const replace = vi.fn();
let currentQuery = {};
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace }),
  useRoute: () => ({ query: currentQuery }),
  RouterLink: { template: '<a><slot /></a>' },
}));

vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn() } }));

import LoginView from './LoginView.vue';

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    login.mockReset();
    replace.mockReset();
    currentQuery = {};
  });

  it('空字段提交时不调用登录接口并显示校验错误', async () => {
    const wrapper = mount(LoginView);
    await wrapper.find('form').trigger('submit.prevent');
    expect(login).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('请输入邮箱');
  });

  it('登录成功后跳转到 redirect 目标', async () => {
    login.mockResolvedValue({ id: 'u1' });
    currentQuery = { redirect: '/profile' };
    const wrapper = mount(LoginView);
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('20260001@bjtu.edu.cn');
    await inputs[1].setValue('Pass2026!');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    expect(login).toHaveBeenCalledWith({
      loginId: '20260001@bjtu.edu.cn',
      password: 'Pass2026!',
    });
    expect(replace).toHaveBeenCalledWith('/profile');
  });

  it('展示左上角“进入官网”与下方“下载安卓安装包”入口', () => {
    const wrapper = mount(LoginView);
    const portalLink = wrapper.find('.auth-view__portal-link');
    expect(portalLink.exists()).toBe(true);
    expect(portalLink.text()).toContain('进入官网');

    const downloadBtn = wrapper.find('[data-testid="login-download-apk-btn"]');
    expect(downloadBtn.exists()).toBe(true);
    expect(downloadBtn.attributes('href')).toBe(
      '/downloads/FoodtimeNeo-Android.apk?v=1.0.1-5',
    );
    expect(downloadBtn.attributes('download')).toBe('FoodtimeNeo-Android.apk');
    expect(downloadBtn.text()).toContain('下载安卓安装包');
  });
});

async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
