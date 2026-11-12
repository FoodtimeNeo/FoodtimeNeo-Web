import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import AdminReportsView from './AdminReportsView.vue';

const api = vi.hoisted(() => ({
  fetchReports: vi.fn(),
  fetchAdminDecisions: vi.fn(),
  fetchAdminReportFollowUps: vi.fn(),
  decideReport: vi.fn(),
  performReportAction: vi.fn(),
  replyReportFollowUp: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock('@/api/safety.api.js', () => api);
vi.mock('@/api/submission.api.js', () => ({ uploadImage: vi.fn() }));
vi.mock('element-plus', () => ({ ElMessageBox: { confirm: api.confirm } }));
const decision = {
  decisionId: 'decision-1',
  reportId: 'report-1',
  targetType: 'post',
  outcome: 'upheld',
  publicReason: '审核理由',
};
const page = (items, total = items.length) => ({
  items,
  total,
  page: 1,
  size: 20,
});
let wrapper;
async function render() {
  wrapper = mount(AdminReportsView, {
    global: { stubs: { RouterLink: true } },
  });
  await flushPromises();
}
const button = (label) =>
  wrapper.findAll('button').find((item) => item.text() === label);

beforeEach(() => {
  vi.resetAllMocks();
  api.fetchReports.mockResolvedValue(page([]));
  api.fetchAdminDecisions.mockResolvedValue(page([decision]));
  api.confirm.mockResolvedValue('confirm');
  api.performReportAction.mockResolvedValue({ id: 'action-1' });
});
afterEach(() => wrapper?.unmount());

it('取消确认不会下架、停用或恢复用户', async () => {
  api.confirm.mockRejectedValue('cancel');
  await render();
  for (const label of ['下架帖子', '停用被举报用户', '恢复被举报用户']) {
    await button(label).trigger('click');
    await flushPromises();
  }
  expect(api.confirm).toHaveBeenCalledTimes(3);
  expect(api.performReportAction).not.toHaveBeenCalled();
  expect(wrapper.text()).not.toContain('执行动作失败');
});

it('确认后请求执行期间阻止反复点击及并行管理动作', async () => {
  let complete;
  api.performReportAction.mockImplementation(
    () => new Promise((resolve) => (complete = resolve)),
  );
  await render();
  await button('下架帖子').trigger('click');
  await flushPromises();
  expect(api.performReportAction).toHaveBeenCalledTimes(1);
  expect(api.performReportAction).toHaveBeenCalledWith('report-1', {
    actionType: 'remove_post',
    note: '由决定 decision-1 触发',
  });
  expect(button('停用被举报用户').element.disabled).toBe(true);
  await button('下架帖子').trigger('click');
  expect(api.confirm).toHaveBeenCalledTimes(1);
  complete({ id: 'action-1' });
  await flushPromises();
  expect(wrapper.text()).toContain('下架帖子已完成');
  expect(button('停用被举报用户').element.disabled).toBe(false);
});

it('执行失败保留已处理列表及重试入口，不伪称成功', async () => {
  api.performReportAction.mockRejectedValueOnce(new Error('权限已变更'));
  await render();
  await button('恢复被举报用户').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('权限已变更');
  expect(wrapper.text()).toContain('审核理由');
  expect(wrapper.text()).not.toContain('恢复被举报用户已完成');
  await button('恢复被举报用户').trigger('click');
  await flushPromises();
  expect(api.performReportAction).toHaveBeenCalledTimes(2);
});

it('已处理决定独立分页，可以操作第 21 条之后的记录', async () => {
  api.fetchAdminDecisions.mockResolvedValueOnce(page([decision], 21));
  await render();
  api.fetchAdminDecisions.mockResolvedValue(
    page(
      [{ ...decision, decisionId: 'decision-21', reportId: 'report-21' }],
      21,
    ),
  );
  await button('下一页').trigger('click');
  await flushPromises();
  expect(api.fetchAdminDecisions).toHaveBeenLastCalledWith(
    2,
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  await button('下架帖子').trigger('click');
  await flushPromises();
  expect(api.performReportAction).toHaveBeenCalledWith(
    'report-21',
    expect.objectContaining({ actionType: 'remove_post' }),
  );
  expect(wrapper.text()).toContain('第 2 / 2 页');
});

it('读取已处理决定失败可重试，待处理举报仍然可见', async () => {
  api.fetchReports.mockResolvedValue(
    page([{ id: 'pending-1', targetType: 'comment', reason: '待审核原因' }]),
  );
  api.fetchAdminDecisions.mockRejectedValueOnce(new Error('读取超时'));
  await render();
  expect(wrapper.text()).toContain('待审核原因');
  expect(wrapper.text()).toContain('读取超时');
  const error = wrapper.findComponent({ name: 'ErrorState' });
  await error.vm.$emit('retry');
  await flushPromises();
  expect(wrapper.text()).toContain('审核理由');
});

it('提交决定后刷新已处理列表，无需退出重进才能执行动作', async () => {
  api.fetchReports.mockResolvedValueOnce(
    page([{ id: 'pending-1', targetType: 'post', reason: '待处理' }]),
  );
  api.fetchReports.mockResolvedValue(page([]));
  await render();
  await wrapper.get('.report-decision textarea').setValue('公开结论');
  await button('提交决定').trigger('click');
  await flushPromises();
  expect(api.decideReport).toHaveBeenCalledWith(
    'pending-1',
    expect.objectContaining({ publicReason: '公开结论' }),
  );
  expect(api.fetchAdminDecisions).toHaveBeenCalledTimes(2);
  expect(wrapper.text()).toContain('当前没有待处理举报');
});
