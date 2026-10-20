import { beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  fetchReviewReplies: vi.fn(),
  createReviewReply: vi.fn(),
  deleteReviewReply: vi.fn(),
}));
vi.mock('@/api/review.api.js', () => api);
import ReviewReplySection from './ReviewReplySection.vue';
const row = {
  id: 'reply',
  content: '第一条',
  userDisplayName: '甲',
  ownedByMe: true,
};
const render = () =>
  mount(ReviewReplySection, {
    props: { review: { id: 'r', replyCount: 2 } },
    global: { stubs: { RouterLink: true } },
  });
const button = (w, label) =>
  w.findAll('button').find((b) => b.text() === label);
beforeEach(() => {
  vi.resetAllMocks();
  api.fetchReviewReplies.mockResolvedValue({
    items: [row],
    total: 2,
    hasMore: true,
    nextCursor: 'next',
  });
});
it('展开才获取一页，加载更多使用游标并显示删除对象占位', async () => {
  const w = render();
  expect(api.fetchReviewReplies).not.toHaveBeenCalled();
  await w.get('button').trigger('click');
  await flushPromises();
  api.fetchReviewReplies.mockResolvedValue({
    items: [
      {
        id: 'child',
        content: '后续讨论',
        replyToId: 'gone',
        replyToDeleted: true,
      },
    ],
    total: 2,
    hasMore: false,
    nextCursor: null,
  });
  await button(w, '加载更多回复').trigger('click');
  await flushPromises();
  expect(api.fetchReviewReplies).toHaveBeenLastCalledWith('r', 'next');
  expect(w.text()).toContain('第一条');
  expect(w.text()).toContain('已删除的回复');
});
it('失败保留正文及去重ID，指定回复对象不拼接正文，成功不插入未审核内容', async () => {
  const w = render();
  await w.get('button').trigger('click');
  await flushPromises();
  await button(w, '回复这条').trigger('click');
  await w.get('textarea').setValue('继续讨论');
  api.createReviewReply
    .mockRejectedValueOnce(new Error('连接中断'))
    .mockResolvedValue({ id: 'pending', status: 'pending' });
  await w.get('form').trigger('submit');
  await flushPromises();
  expect(w.get('textarea').element.value).toBe('继续讨论');
  const first = api.createReviewReply.mock.calls[0][1];
  expect(first.replyToId).toBe('reply');
  await w.get('form').trigger('submit');
  await flushPromises();
  expect(api.createReviewReply.mock.calls[1][1]).toEqual(first);
  expect(w.text()).toContain('审核通过后公开');
  expect(w.text()).not.toContain('继续讨论');
});
it('自己的回复经确认后删除，再读取服务端计数', async () => {
  const w = render();
  await w.get('button').trigger('click');
  await flushPromises();
  await button(w, '删除回复').trigger('click');
  expect(api.deleteReviewReply).not.toHaveBeenCalled();
  api.fetchReviewReplies.mockResolvedValue({
    items: [],
    total: 0,
    hasMore: false,
    nextCursor: null,
  });
  await button(w, '确认删除').trigger('click');
  await flushPromises();
  expect(api.deleteReviewReply).toHaveBeenCalledExactlyOnceWith('reply');
  expect(w.text()).not.toContain('第一条');
});
