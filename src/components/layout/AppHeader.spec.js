import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useAuthStore } from '@/store/useAuthStore.js';
import AppHeader from './AppHeader.vue';

function createTestRouter() {
  const component = { template: '<div />' };
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component },
      { path: '/canteens', name: 'canteenList', component },
      {
        path: '/canteens/1',
        name: 'canteenDetail',
        component,
        meta: { nav: 'canteenList' },
      },
      { path: '/profile', name: 'profile', component },
      {
        path: '/inbox',
        name: 'inboxView',
        component,
        meta: { nav: 'profile' },
      },
      { path: '/canteens/search', name: 'dishSearch', component },
    ],
  });
}

describe('AppHeader 移动端独立模式返回按钮', () => {
  let wrapper;

  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().setSession({
      user: { id: 'u1', role: 'user', displayName: '小饭' },
    });
  });

  afterEach(() => {
    wrapper?.unmount();
    vi.restoreAllMocks();
  });

  it('在一级根标签页不显示返回按钮，进入子页后显示并可回退到所属一级页', async () => {
    const router = createTestRouter();
    await router.push('/');
    await router.isReady();

    wrapper = mount(AppHeader, {
      global: { plugins: [router] },
    });

    expect(wrapper.find('[data-testid="mobile-header-back"]').exists()).toBe(
      false,
    );

    await router.push('/canteens/1');
    await flushPromises();
    const backBtn = wrapper.find('[data-testid="mobile-header-back"]');
    expect(backBtn.exists()).toBe(true);

    // 没有浏览器内部历史栈时，安全兜底回到所属一级栏目。
    vi.spyOn(window.history, 'state', 'get').mockReturnValue({ back: null });
    await backBtn.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('canteenList');
  });

  it('存在站内历史栈时点击返回调用 router.back()', async () => {
    const router = createTestRouter();
    await router.push('/canteens/1');
    await router.isReady();
    const backSpy = vi.spyOn(router, 'back').mockImplementation(() => {});
    vi.spyOn(window.history, 'state', 'get').mockReturnValue({
      back: '/canteens',
    });

    wrapper = mount(AppHeader, {
      global: { plugins: [router] },
    });

    await wrapper.get('[data-testid="mobile-header-back"]').trigger('click');
    expect(backSpy).toHaveBeenCalledTimes(1);
  });
});
