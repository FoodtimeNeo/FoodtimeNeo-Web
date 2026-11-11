import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';
const api = vi.hoisted(() => ({
  fetchFeedbackDetail: vi.fn(),
  fetchFeedbackReplies: vi.fn(),
  replyToFeedback: vi.fn(),
}));
vi.mock('@/api/feedback.api.js', () => api);
let route;
vi.mock('vue-router', () => ({ useRoute: () => route }));
vi.mock('@/store/useAuthStore.js', () => ({
  useAuthStore: () => ({ user: { id: 'admin' } }),
}));
import FeedbackDetailView from './FeedbackDetailView.vue';
const row = {
  id: 'f1',
  type: 'function',
  content: '原反馈',
  status: 'processing',
  createdAt: '2026-11-11T00:00:00Z',
  userDisplayName: '小明',
};
const mountView = (admin = true) =>
  mount(FeedbackDetailView, {
    props: { admin },
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  });
beforeEach(() => {
  vi.resetAllMocks();
  route = reactive({ params: { feedbackId: 'f1' } });
  api.fetchFeedbackDetail.mockResolvedValue(row);
  api.fetchFeedbackReplies.mockResolvedValue({
    items: [],
    page: 1,
    total: 0,
    size: 20,
  });
});
it('普通用户只能查看自己的记录和完整回复历史', async () => {
  api.fetchFeedbackReplies.mockResolvedValue({
    items: [
      { id: 'r1', content: '第一次回复', createdAt: row.createdAt },
      { id: 'r2', content: '第二次回复', createdAt: row.createdAt },
    ],
    page: 1,
    size: 20,
    total: 2,
  });
  const view = mountView(false);
  await flushPromises();
  expect(view.find('form').exists()).toBe(false);
  expect(view.text()).toContain('第一次回复');
  expect(view.text()).toContain('第二次回复');
  expect(api.fetchFeedbackReplies).toHaveBeenCalledWith(
    'f1',
    1,
    false,
    expect.anything(),
  );
  view.unmount();
});
it('超管失败重试保留回复并复用编号，完成后隐藏编辑表单', async () => {
  const view = mountView();
  await flushPromises();
  await view.find('textarea').setValue('管理员回复');
  await view.find('input[type=checkbox]').setValue(true);
  api.replyToFeedback.mockRejectedValueOnce(new Error('网络失败'));
  await view.find('form').trigger('submit');
  await flushPromises();
  const input = api.replyToFeedback.mock.calls[0][1];
  expect(view.find('textarea').element.value).toBe('管理员回复');
  api.replyToFeedback.mockResolvedValue({ ...row, status: 'completed' });
  await view.find('form').trigger('submit');
  await flushPromises();
  expect(api.replyToFeedback).toHaveBeenLastCalledWith('f1', input);
  expect(view.find('form').exists()).toBe(false);
  expect(view.text()).toContain('已完成');
  view.unmount();
});
it('切换详情拒绝旧记录与旧草稿继续显示', async () => {
  const view = mountView();
  await flushPromises();
  await view.find('textarea').setValue('旧回复');
  api.fetchFeedbackDetail.mockRejectedValue(new Error('反馈不存在或不可访问'));
  route.params.feedbackId = 'another';
  await flushPromises();
  expect(view.text()).not.toContain('原反馈');
  expect(view.find('textarea').exists()).toBe(false);
  expect(view.text()).toContain('反馈不存在或不可访问');
  view.unmount();
});
