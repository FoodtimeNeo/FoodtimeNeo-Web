import { beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  fetchMyReviewReplies: vi.fn(),
  deleteReviewReply: vi.fn(),
}));
vi.mock('@/api/review.api.js', () => api);
import MyReviewRepliesView from './MyReviewRepliesView.vue';
beforeEach(() => {
  vi.resetAllMocks();
  api.fetchMyReviewReplies.mockResolvedValue({
    items: [
      {
        id: 'x',
        content: '回复正文',
        status: 'rejected',
        reviewReason: '需要修改',
        reviewDeleted: true,
      },
    ],
    page: 1,
    size: 20,
    total: 1,
  });
});
it('显示审核原因和原点评删除提示，确认删除后刷新列表', async () => {
  const w = mount(MyReviewRepliesView, {
    global: { stubs: { RouterLink: true } },
  });
  await flushPromises();
  expect(w.text()).toContain('已驳回');
  expect(w.text()).toContain('需要修改');
  expect(w.text()).toContain('原点评已删除');
  const find = (label) => w.findAll('button').find((b) => b.text() === label);
  await find('删除回复').trigger('click');
  expect(api.deleteReviewReply).not.toHaveBeenCalled();
  api.fetchMyReviewReplies.mockResolvedValue({
    items: [],
    page: 1,
    size: 20,
    total: 0,
  });
  await find('确认删除').trigger('click');
  await flushPromises();
  expect(api.deleteReviewReply).toHaveBeenCalledExactlyOnceWith('x');
  expect(w.text()).toContain('暂无回复记录');
});
