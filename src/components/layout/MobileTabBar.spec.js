import { expect, it } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useAuthStore } from '@/store/useAuthStore.js';
import MobileTabBar from './MobileTabBar.vue';
it.each(['user', 'admin', 'superadmin'])(
  '底部导航随 %s 角色显示，保留食堂详情且管理入口可用',
  async (role) => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = useAuthStore();
    auth.setSession({ user: { id: 'u1', role } });
    const component = { template: '<div />' };
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/canteens', name: 'canteenList', component },
        { path: '/profile', name: 'profile', component },
        {
          path: '/admin/audit',
          name: 'adminAudit',
          component,
          meta: { requiresAdmin: true },
        },
        {
          path: '/catalog/dish',
          name: 'dish',
          component,
          meta: { nav: 'canteenList' },
        },
      ],
    });
    await router.push('/catalog/dish');
    const wrapper = mount(MobileTabBar, {
      global: { plugins: [pinia, router] },
    });
    const links = wrapper.findAll('a');
    expect(links).toHaveLength(role === 'user' ? 2 : 3);
    expect(links[0].attributes('href')).toBe('/catalog/dish');
    if (role !== 'user') {
      expect(links[1].text()).toContain('管理');
      await links[1].trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.name).toBe('adminAudit');
      expect(wrapper.findAll('a')[1].attributes('aria-current')).toBe(
        'location',
      );
      auth.setSession({ user: { id: 'u1', role: 'user' } });
      await flushPromises();
      expect(wrapper.text()).not.toContain('管理');
    } else expect(wrapper.text()).not.toContain('管理');
  },
);
