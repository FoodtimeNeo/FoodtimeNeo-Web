import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const api = vi.hoisted(() => ({
  fetchDashboard: vi.fn(),
  fetchAuditLogs: vi.fn(),
}));
vi.mock('@/api/superadmin.api.js', () => api);

import SuperadminView from './SuperadminView.vue';

function button(wrapper, label) {
  return wrapper.findAll('button').find((item) => item.text() === label);
}

describe('SuperadminView', () => {
  beforeEach(() => {
    api.fetchDashboard.mockReset();
    api.fetchAuditLogs.mockReset();
    api.fetchDashboard.mockResolvedValue({
      user_count: 12,
      pending_reviews: 0,
      dish_count: 35,
    });
    api.fetchAuditLogs.mockResolvedValue({
      items: [
        {
          id: 'log-1',
          operator_account: 'root',
          action: 'role_change',
          target_type: 'user',
          target_id: 'u1',
          detail: '角色已变更',
          created_at: '2026-10-14T10:00:00+08:00',
        },
      ],
      total: 21,
      page: 1,
      per_page: 20,
    });
  });

  it('展示后端统计值和操作日志，不把零显示为空', async () => {
    const wrapper = mount(SuperadminView);
    await flushPromises();
    expect(wrapper.text()).toContain('用户总数');
    expect(wrapper.text()).toContain('12');
    expect(wrapper.text()).toContain('待审点评');
    expect(wrapper.text()).toContain('0');
    expect(wrapper.text()).toContain('role_change');
    expect(wrapper.text()).toContain('角色已变更');
    expect(api.fetchAuditLogs).toHaveBeenCalledWith(1, 20);
  });

  it('按后端总数翻页，首尾页不能越界', async () => {
    const wrapper = mount(SuperadminView);
    await flushPromises();
    expect(button(wrapper, '上一页').attributes('disabled')).toBeDefined();
    await button(wrapper, '下一页').trigger('click');
    await flushPromises();
    expect(api.fetchAuditLogs).toHaveBeenCalledWith(2, 20);
    expect(wrapper.text()).toContain('第 2 / 2 页');
    expect(button(wrapper, '下一页').attributes('disabled')).toBeDefined();
  });

  it('看板和日志失败分别显示重试入口', async () => {
    api.fetchDashboard.mockRejectedValueOnce(new Error('看板加载失败'));
    api.fetchAuditLogs.mockRejectedValueOnce(new Error('日志加载失败'));
    const wrapper = mount(SuperadminView);
    await flushPromises();
    expect(wrapper.text()).toContain('看板加载失败');
    expect(wrapper.text()).toContain('日志加载失败');
    expect(
      wrapper.findAll('button').filter((item) => item.text() === '重试'),
    ).toHaveLength(2);
    await wrapper
      .findAll('button')
      .find((item) => item.text() === '重试')
      .trigger('click');
    await flushPromises();
    expect(api.fetchDashboard).toHaveBeenCalledTimes(2);
  });

  it('无统计和日志时显示空态', async () => {
    api.fetchDashboard.mockResolvedValue({});
    api.fetchAuditLogs.mockResolvedValue({ items: [], total: 0 });
    const wrapper = mount(SuperadminView);
    await flushPromises();
    expect(wrapper.text()).toContain('暂无统计数据');
    expect(wrapper.text()).toContain('暂无操作日志');
    expect(button(wrapper, '下一页').attributes('disabled')).toBeDefined();
  });
});
