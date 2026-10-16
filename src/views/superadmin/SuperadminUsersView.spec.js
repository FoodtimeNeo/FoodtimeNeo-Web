import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  fetchUsers: vi.fn(),
  updateUserAccess: vi.fn(),
}));
vi.mock('@/api/superadmin.api.js', () => api);
vi.mock('@/store/useAuthStore.js', () => ({
  useAuthStore: () => ({ user: { id: 'self' } }),
}));
import SuperadminUsersView from './SuperadminUsersView.vue';
beforeEach(() => {
  vi.clearAllMocks();
  api.fetchUsers.mockResolvedValue({
    items: [
      {
        id: 'self',
        email: 'root@bjtu.edu.cn',
        displayName: '自己',
        role: 'superadmin',
        status: 'active',
        reviewCount: 0,
      },
      {
        id: 'other',
        email: 'user@bjtu.edu.cn',
        displayName: '用户',
        role: 'user',
        status: 'active',
        reviewCount: 2,
      },
    ],
    page: 1,
    size: 20,
    total: 2,
  });
});
it('自身权限不能编辑，搜索与分页使用实际字段', async () => {
  const wrapper = mount(SuperadminUsersView);
  await flushPromises();
  expect(
    wrapper
      .findAll('button')
      .find((b) => b.text() === '编辑权限')
      .attributes('disabled'),
  ).toBeDefined();
  expect(wrapper.text()).toContain('正式评论数：2');
  expect(wrapper.text()).not.toContain('邀请码');
  expect(wrapper.text()).not.toContain('重置密码');
  await wrapper.get('input[type="search"]').setValue('  user  ');
  await wrapper.get('form.search').trigger('submit');
  await flushPromises();
  expect(api.fetchUsers.mock.calls.at(-1).slice(0, 2)).toEqual([1, 'user']);
});
it('取消不写入，失败保留服务端角色和当前草稿', async () => {
  const wrapper = mount(SuperadminUsersView);
  await flushPromises();
  await wrapper
    .findAll('button')
    .filter((b) => b.text() === '编辑权限')[1]
    .trigger('click');
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '取消')
    .trigger('click');
  expect(api.updateUserAccess).not.toHaveBeenCalled();
  await wrapper
    .findAll('button')
    .filter((b) => b.text() === '编辑权限')[1]
    .trigger('click');
  await wrapper.findAll('select')[0].setValue('admin');
  api.updateUserAccess.mockRejectedValueOnce(new Error('权限已失效'));
  await wrapper.findAll('form')[1].trigger('submit');
  await flushPromises();
  expect(api.updateUserAccess).toHaveBeenCalledWith('other', {
    role: 'admin',
    status: 'active',
  });
  expect(wrapper.text()).toContain('权限已失效');
  expect(wrapper.findAll('select')[0].element.value).toBe('admin');
});
