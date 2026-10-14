import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const api = vi.hoisted(() => ({
  fetchUsers: vi.fn(),
  updateUserRole: vi.fn(),
  updateUserStatus: vi.fn(),
  resetUserPassword: vi.fn(),
  fetchInviteCode: vi.fn(),
  generateInviteCode: vi.fn(),
}));
vi.mock('@/api/superadmin.api.js', () => api);

import { useAuthStore } from '@/store/useAuthStore.js';
import SuperadminUsersView from './SuperadminUsersView.vue';

const users = [
  {
    id: 'self',
    account: 'root',
    nickname: '自己',
    role: 'superadmin',
    account_status: 'active',
  },
  {
    id: 'other',
    account: 'alice',
    nickname: 'Alice',
    role: 'user',
    account_status: 'active',
  },
];

function button(wrapper, label) {
  return wrapper.findAll('button').find((item) => item.text() === label);
}

describe('SuperadminUsersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().setSession({
      token: 'token',
      user: { id: 'self', account: 'root', role: 'superadmin' },
    });
    Object.values(api).forEach((mock) => mock.mockReset());
    api.fetchUsers.mockResolvedValue({ items: users, total: 21 });
    api.fetchInviteCode.mockResolvedValue(null);
    api.updateUserRole.mockResolvedValue({});
    api.updateUserStatus.mockResolvedValue({});
    api.resetUserPassword.mockResolvedValue({});
    api.generateInviteCode.mockResolvedValue({
      code: 'ABC123',
      expires_at: '2026-10-17T00:00:00+08:00',
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('显示用户和分页，并禁止修改自己的角色', async () => {
    const wrapper = mount(SuperadminUsersView);
    await flushPromises();
    expect(wrapper.text()).toContain('alice');
    expect(wrapper.text()).toContain('不能修改自己的角色');
    expect(wrapper.find('#role-self').attributes('disabled')).toBeDefined();
    await button(wrapper, '下一页').trigger('click');
    await flushPromises();
    expect(api.fetchUsers).toHaveBeenCalledWith(2, '', 20);
    vi.restoreAllMocks();
  });

  it('搜索用户并展示空态', async () => {
    api.fetchUsers
      .mockResolvedValueOnce({ items: users, total: 2 })
      .mockResolvedValueOnce({ items: [], total: 0 });
    const wrapper = mount(SuperadminUsersView);
    await flushPromises();
    await wrapper.find('#user-search').setValue('  nobody  ');
    await wrapper.find('.users-page__search').trigger('submit');
    await flushPromises();
    expect(api.fetchUsers).toHaveBeenCalledWith(1, 'nobody', 20);
    expect(wrapper.text()).toContain('没有找到用户');
    vi.restoreAllMocks();
  });

  it('取消角色变更不会调用接口，确认后才提交', async () => {
    const wrapper = mount(SuperadminUsersView);
    await flushPromises();
    window.confirm.mockReturnValueOnce(false);
    await wrapper.find('#role-other').setValue('admin');
    expect(api.updateUserRole).not.toHaveBeenCalled();
    await wrapper.find('#role-other').setValue('admin');
    await flushPromises();
    expect(api.updateUserRole).toHaveBeenCalledWith('other', 'admin');
    vi.restoreAllMocks();
  });

  it('封禁和密码重置须确认，成功后清空密码', async () => {
    const wrapper = mount(SuperadminUsersView);
    await flushPromises();
    await button(wrapper, '封禁').trigger('click');
    await flushPromises();
    expect(api.updateUserStatus).toHaveBeenCalledWith('self', 'banned');
    await button(wrapper, '重置密码').trigger('click');
    await wrapper.find('#password-self').setValue('secret123');
    await wrapper.find('.users-page__password').trigger('submit');
    await flushPromises();
    expect(api.resetUserPassword).toHaveBeenCalledWith('self', 'secret123');
    expect(wrapper.find('#password-self').exists()).toBe(false);
    vi.restoreAllMocks();
  });

  it('邀请码按当前管理员接口读取和生成', async () => {
    const wrapper = mount(SuperadminUsersView);
    await flushPromises();
    expect(wrapper.text()).toContain('暂无有效邀请码');
    await button(wrapper, '获取或生成邀请码').trigger('click');
    await flushPromises();
    expect(api.generateInviteCode).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain('ABC123');
    vi.restoreAllMocks();
  });
});
