import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ProfileView from './ProfileView.vue';
import { useAuthStore } from '@/store/useAuthStore.js';
import { fetchProfile } from '@/api/auth.api.js';
vi.mock('@/api/auth.api.js', () => ({ fetchProfile: vi.fn() }));
vi.mock('vue-router', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
let wrapper;
beforeEach(() => {
  setActivePinia(createPinia());
  useAuthStore().setSession({
    user: { id: 'owner', role: 'user', displayName: '小饭' },
  });
  fetchProfile.mockResolvedValue({
    id: 'owner',
    role: 'user',
    displayName: '小饭',
    email: 'example@example.test',
    followingCount: 12,
    followerCount: 8,
  });
});
afterEach(() => wrapper?.unmount());
async function render() {
  wrapper = mount(ProfileView, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        MediaImage: true,
        SchoolEmailBinder: true,
        ProfileEditor: true,
      },
    },
  });
  await flushPromises();
}
it('常用入口宫格保留各业务路由，资料与真实统计清晰且没有重复小字', async () => {
  await render();
  expect(wrapper.text()).toContain('小饭');
  expect(wrapper.text()).toContain('12');
  const links = wrapper
    .findAllComponents(RouterLinkStub)
    .map((link) => link.props('to'));
  expect(links).toContainEqual({ name: 'favoriteDishes' });
  expect(links).toContainEqual({
    name: 'community',
    query: { tab: 'favorites' },
  });
  expect(links).toContainEqual({ name: 'myReports' });
  expect(links).toContainEqual({ name: 'accountLifecycle' });
  expect(wrapper.findAll('.profile-page__group')).toHaveLength(4);
  expect(wrapper.text()).not.toContain('收藏的菜品与分组');
  await wrapper.get('button[aria-label="编辑资料"]').trigger('click');
  expect(wrapper.find('profile-editor-stub').exists()).toBe(true);
});
it('管理账号不暴露注销入口，普通用户设置继续保留', async () => {
  useAuthStore().setSession({
    user: { id: 'admin', role: 'superadmin', displayName: '管理' },
  });
  fetchProfile.mockResolvedValue({
    id: 'admin',
    role: 'superadmin',
    displayName: '管理',
    email: 'admin@example.test',
  });
  await render();
  expect(useAuthStore().isAdmin).toBe(true);
  const links = wrapper
    .findAllComponents(RouterLinkStub)
    .map((link) => link.props('to').name);
  expect(links).not.toContain('accountLifecycle');
  expect(links).toContain('changePassword');
});
