import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const fetchAuditItems = vi.fn();
const submitAudit = vi.fn();
vi.mock('@/api/admin-audit.api.js', () => ({
  fetchAuditItems: (...args) => fetchAuditItems(...args),
  submitAudit: (...args) => submitAudit(...args),
}));
vi.mock('@/store/useAuthStore.js', () => ({
  useAuthStore: () => ({ user: { account: 'admin' } }),
}));
const message = vi.hoisted(() => ({ success: vi.fn() }));
vi.mock('element-plus', () => ({ ElMessage: message }));

import AdminAuditView from './AdminAuditView.vue';

describe('AdminAuditView', () => {
  beforeEach(() => {
    fetchAuditItems.mockReset();
    submitAudit.mockReset();
    message.success.mockReset();
    fetchAuditItems.mockResolvedValue([
      {
        id: 'sub-1',
        dish_name: '牛肉面',
        canteen_name: '一食堂',
        stall_name: '面档',
        submitter_account: 'alice',
        status: 'pending',
      },
    ]);
  });

  it('仅展示待审内容，空意见不能发送审核请求', async () => {
    const wrapper = mount(AdminAuditView);
    await flushPromises();
    expect(wrapper.text()).toContain('牛肉面');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '驳回')
      .trigger('click');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.get('[role="alert"]').text()).toContain('审核原因');
    expect(submitAudit).not.toHaveBeenCalled();
  });

  it('提交驳回后刷新列表，不重复提交', async () => {
    let resolveAudit;
    submitAudit.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAudit = resolve;
        }),
    );
    const wrapper = mount(AdminAuditView);
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '驳回')
      .trigger('click');
    await wrapper.get('textarea').setValue('内容不符合投稿要求');
    await wrapper.get('form').trigger('submit');
    await wrapper.get('form').trigger('submit');
    expect(submitAudit).toHaveBeenCalledTimes(1);
    expect(submitAudit).toHaveBeenCalledWith(
      'submissions',
      'sub-1',
      'rejected',
      '内容不符合投稿要求',
      'admin',
    );
    resolveAudit({});
    await flushPromises();
    expect(fetchAuditItems).toHaveBeenCalledTimes(2);
    expect(message.success).toHaveBeenCalledWith('已驳回');
  });

  it('切换类型时加载对应审核列表，失败显示重试', async () => {
    fetchAuditItems.mockImplementation((kind) =>
      kind === 'reviews'
        ? Promise.reject(new Error('无法读取点评'))
        : Promise.resolve([]),
    );
    const wrapper = mount(AdminAuditView);
    await flushPromises();
    await wrapper.findAll('[aria-label="审核类型"] button')[1].trigger('click');
    await flushPromises();
    expect(fetchAuditItems).toHaveBeenCalledWith('reviews');
    expect(wrapper.text()).toContain('无法读取点评');
  });
});
