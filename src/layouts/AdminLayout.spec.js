import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/store/useAuthStore.js';

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'adminAudit' }),
}));

import AdminLayout from './AdminLayout.vue';

function mountForRole(role) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore().setSession({
    token: 'token',
    user: { id: 'one', account: 'tester', role },
  });
  return mount(AdminLayout, {
    global: {
      plugins: [pinia],
      stubs: {
        DefaultLayout: { template: '<div><slot /></div>' },
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  });
}

describe('管理导航权限', () => {
  // 只渲染导航文字，不加载完整路由页面；真实路由由独立集成验收覆盖。
  it('管理员可见审核和内容管理入口，不显示超管入口', () => {
    const wrapper = mountForRole('admin');
    expect(wrapper.text()).toContain('内容审核');
    expect(wrapper.text()).toContain('内容管理');
    expect(wrapper.text()).not.toContain('超管看板');
    expect(wrapper.text()).not.toContain('用户管理');
    expect(wrapper.text()).not.toContain('公告管理');
    expect(wrapper.text()).not.toContain('举报处理');
    expect(wrapper.text()).not.toContain('建议与反馈');
  });

  it('超管可见所有管理入口', () => {
    const wrapper = mountForRole('superadmin');
    expect(wrapper.text()).toContain('内容审核');
    expect(wrapper.text()).toContain('内容管理');
    expect(wrapper.text()).not.toContain('超管看板');
    expect(wrapper.text()).toContain('用户管理');
    expect(wrapper.text()).toContain('公告管理');
    expect(wrapper.text()).toContain('举报处理');
    expect(wrapper.text()).toContain('建议与反馈');
    expect(wrapper.text()).toContain('数据分析');
  });
});
