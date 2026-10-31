import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useAuthStore } from '@/store/useAuthStore.js';
import { routes } from '@/router/routes.js';
import AdminLayout from './AdminLayout.vue';

async function mountForRole(role) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore().setSession({
    token: 'token',
    user: { id: 'one', account: 'tester', role },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  });
  await router.push('/admin/audit');
  await router.isReady();
  return mount(AdminLayout, {
    global: {
      plugins: [pinia, router],
      stubs: { DefaultLayout: { template: '<div><slot /></div>' } },
    },
  });
}

describe('管理导航权限', () => {
  // 全量并发运行时挂载较慢，断言与逻辑无关，仅放宽超时防抖动。
  it(
    '管理员可见审核和内容管理入口，不显示超管入口',
    { timeout: 30000 },
    async () => {
      const wrapper = await mountForRole('admin');
      expect(wrapper.text()).toContain('内容审核');
      expect(wrapper.text()).toContain('内容管理');
      expect(wrapper.text()).not.toContain('超管看板');
      expect(wrapper.text()).not.toContain('用户管理');
      expect(wrapper.text()).not.toContain('公告管理');
    },
  );

  it('超管可见所有管理入口', { timeout: 30000 }, async () => {
    const wrapper = await mountForRole('superadmin');
    expect(wrapper.text()).toContain('内容审核');
    expect(wrapper.text()).toContain('内容管理');
    expect(wrapper.text()).not.toContain('超管看板');
    expect(wrapper.text()).toContain('用户管理');
    expect(wrapper.text()).toContain('公告管理');
    expect(wrapper.text()).toContain('数据分析');
  });
});
