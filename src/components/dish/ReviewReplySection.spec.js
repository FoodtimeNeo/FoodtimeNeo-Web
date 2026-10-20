import { beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  fetchReviewReplies: vi.fn(),
  createReviewReply: vi.fn(),
  deleteReviewReply: vi.fn(),
  setReplyLike: vi.fn(),
}));
import ReviewReplySection from './ReviewReplySection.vue';
const row = {
  id: 'reply',
  content: '第一条',
  userDisplayName: '甲',
  ownedByMe: true,
};
it('回复点赞直接应用响应，不重新加载楼层', async () => {
  const w = render();
  await w.get('button').trigger('click');
  await flushPromises();
  api.setReplyLike.mockResolvedValue({
    likedByMe: true,
    likeCount: 1,
    counterVersion: 1,
  });
  await w.get('[aria-pressed]').trigger('click');
  await flushPromises();
  expect(api.setReplyLike).toHaveBeenCalledExactlyOnceWith('reply', true);
  expect(api.fetchReviewReplies).toHaveBeenCalledTimes(1);
  expect(w.get('[aria-pressed]').attributes('aria-pressed')).toBe('true');
});
const render = () =>
  mount(ReviewReplySection, {
    props: { review: { id: 'r', replyCount: 2 }, actions: api },
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
  await w.get('summary').trigger('click');
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

it('编辑器按需展开，收起编辑与整楼后保留草稿、对象和点赞结果', async () => {
  const w = render();
  expect(w.find('textarea').exists()).toBe(false);
  await w.get('[aria-expanded]').trigger('click');
  await flushPromises();
  expect(w.find('textarea').exists()).toBe(false);
  await button(w, '回复这条').trigger('click');
  await w.get('textarea').setValue('保留草稿');
  await button(w, '收起编辑').trigger('click');
  expect(w.find('textarea').exists()).toBe(false);
  api.setReplyLike.mockResolvedValue({
    likedByMe: true,
    likeCount: 1,
    counterVersion: 1,
  });
  await w.get('[aria-pressed]').trigger('click');
  await flushPromises();
  await w.get('[aria-expanded]').trigger('click');
  await w.get('[aria-expanded]').trigger('click');
  expect(api.fetchReviewReplies).toHaveBeenCalledTimes(1);
  expect(w.get('[aria-pressed]').attributes('aria-pressed')).toBe('true');
  await button(w, '继续编辑回复…').trigger('click');
  expect(w.get('textarea').element.value).toBe('保留草稿');
  expect(w.get('label').text()).toBe('回复 甲');
});

it('加载失败可重试，取消指定对象后发送一级回复并使用新的操作标识', async () => {
  api.fetchReviewReplies.mockRejectedValueOnce(new Error('连接失败'));
  const w = render();
  await w.get('[aria-expanded]').trigger('click');
  await flushPromises();
  expect(w.text()).toContain('连接失败');
  await w.get('[aria-label="刷新回复"]').trigger('click');
  await flushPromises();
  await button(w, '回复这条').trigger('click');
  await w.get('textarea').setValue('正文');
  api.createReviewReply.mockRejectedValue(new Error('超时'));
  await w.get('form').trigger('submit');
  await flushPromises();
  const first = api.createReviewReply.mock.calls[0][1];
  await button(w, '取消回复对象').trigger('click');
  await w.get('form').trigger('submit');
  await flushPromises();
  const second = api.createReviewReply.mock.calls[1][1];
  expect(second.content).toBe(first.content);
  expect(second.replyToId).toBe(null);
  expect(second.clientRequestId).not.toBe(first.clientRequestId);
});

it('打开编辑器时将键盘焦点送入输入框，收起后回到入口', async () => {
  const w = mount(ReviewReplySection, {
    attachTo: document.body,
    props: { review: { id: 'focus', replyCount: 0 }, actions: api },
    global: { stubs: { RouterLink: true } },
  });
  await w.get('[aria-expanded]').trigger('click');
  await flushPromises();
  await button(w, '写下你的回复…').trigger('click');
  expect(document.activeElement).toBe(w.get('textarea').element);
  await button(w, '收起编辑').trigger('click');
  expect(document.activeElement).toBe(button(w, '写下你的回复…').element);
  w.unmount();
});
