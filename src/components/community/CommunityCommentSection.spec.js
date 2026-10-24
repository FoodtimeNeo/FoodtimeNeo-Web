import { beforeEach, describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CommunityCommentSection from './CommunityCommentSection.vue';
const api = vi.hoisted(() => ({
  fetchRootComments: vi.fn(),
  fetchCommentReplies: vi.fn(),
  createPostComment: vi.fn(),
  deletePostComment: vi.fn(),
}));
vi.mock('@/api/community.api.js', () => api);
const root = {
  id: 'root',
  userId: 'u1',
  status: 'approved',
  author: { name: '甲同学' },
  content: '一级评论',
  createdAt: '2026-10-23T01:00:00Z',
};
const reply = {
  id: 'reply',
  userId: 'u2',
  rootCommentId: 'root',
  replyToCommentId: 'root',
  replyToDisplayName: '甲同学',
  status: 'approved',
  author: { name: '乙同学' },
  content: '楼内回复',
  createdAt: '2026-10-23T02:00:00Z',
};
describe('紧凑楼中楼', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    api.fetchRootComments.mockResolvedValue({ items: [root], hasMore: false });
    api.fetchCommentReplies.mockResolvedValue({
      items: [reply],
      hasMore: false,
    });
  });
  it('只缩进一层，楼内互相回复发送实际对象 ID', async () => {
    api.createPostComment.mockResolvedValue({ id: 'new' });
    const wrapper = mount(CommunityCommentSection, {
      props: { postId: 'post' },
    });
    await flushPromises();
    expect(wrapper.findAll('.compact-replies')).toHaveLength(1);
    await wrapper
      .find('[data-comment-id="reply"] .reply-button')
      .trigger('click');
    expect(wrapper.find('.reply-selection').text()).toContain('乙同学');
    expect(wrapper.find('textarea').element.value).toBe('');
    await wrapper.find('textarea').setValue('赞同你的推荐');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.createPostComment).toHaveBeenCalledWith('post', {
      content: '赞同你的推荐',
      rootCommentId: 'root',
      replyToCommentId: 'reply',
      clientRequestId: expect.any(String),
    });
  });
  it('失败保留草稿，重试复用编号', async () => {
    api.createPostComment
      .mockRejectedValueOnce(new Error('请求超时'))
      .mockResolvedValueOnce({ id: 'new' });
    const wrapper = mount(CommunityCommentSection, {
      props: { postId: 'post' },
    });
    await flushPromises();
    await wrapper.find('textarea').setValue('重试评论');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('textarea').element.value).toBe('重试评论');
    expect(wrapper.text()).toContain('请求超时');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.createPostComment.mock.calls[0][1].clientRequestId).toBe(
      api.createPostComment.mock.calls[1][1].clientRequestId,
    );
  });
  it('删根评论仅展示占位并保留回复，禁止继续回复', async () => {
    api.fetchRootComments.mockResolvedValue({
      items: [{ ...root, content: '', deleted: true }],
      hasMore: false,
    });
    const wrapper = mount(CommunityCommentSection, {
      props: { postId: 'post' },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('原评论已删除');
    expect(wrapper.text()).toContain('楼内回复');
    expect(wrapper.findAll('.reply-button')).toHaveLength(0);
  });

  it('长讨论提交一级评论后保留已加载楼层，并从刷新后的游标继续翻页', async () => {
    const roots = Array.from({ length: 33 }, (_, i) => ({
      ...root,
      id: `root-${i}`,
      content: `旧楼层${i}`,
    }));
    api.fetchCommentReplies.mockResolvedValue({ items: [], hasMore: false });
    api.fetchRootComments
      .mockResolvedValueOnce({
        items: roots.slice(0, 20),
        hasMore: true,
        nextCursor: 'page-20',
      })
      .mockResolvedValueOnce({
        items: roots.slice(20, 32),
        hasMore: true,
        nextCursor: 'page-32',
      })
      .mockResolvedValueOnce({
        items: [
          { ...root, id: 'new', status: 'pending', content: '新一级评论' },
          ...roots.slice(0, 32),
        ],
        hasMore: true,
        nextCursor: 'refreshed-33',
      })
      .mockResolvedValueOnce({ items: roots.slice(32), hasMore: false });
    api.createPostComment.mockResolvedValue({ id: 'new' });
    const wrapper = mount(CommunityCommentSection, {
      props: { postId: 'post' },
    });
    await flushPromises();
    const more = () =>
      wrapper
        .findAll('button')
        .find((button) => button.text() === '加载更多评论');
    await more().trigger('click');
    await flushPromises();
    await wrapper.find('textarea').setValue('新一级评论');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.findAll('.comment-thread')).toHaveLength(33);
    expect(wrapper.text()).toContain('旧楼层31');
    expect(wrapper.text()).toContain('新一级评论');
    expect(api.fetchRootComments).toHaveBeenNthCalledWith(3, 'post', {
      size: 33,
      cursor: undefined,
    });
    await more().trigger('click');
    await flushPromises();
    expect(api.fetchRootComments).toHaveBeenLastCalledWith('post', {
      cursor: 'refreshed-33',
    });
    expect(wrapper.findAll('.comment-thread')).toHaveLength(34);
    wrapper.unmount();
  });

  it('楼内提交回复后保留展开范围与下一页游标', async () => {
    const replies = Array.from({ length: 24 }, (_, i) => ({
      ...reply,
      id: `reply-${i}`,
      content: `楼内回复${i}`,
    }));
    api.fetchCommentReplies
      .mockResolvedValueOnce({
        items: replies.slice(0, 3),
        hasMore: true,
        nextCursor: 'reply-3',
      })
      .mockResolvedValueOnce({
        items: replies.slice(3, 23),
        hasMore: true,
        nextCursor: 'reply-23',
      })
      .mockResolvedValueOnce({
        items: replies.slice(0, 23),
        hasMore: true,
        nextCursor: 'refreshed-reply-23',
      })
      .mockResolvedValueOnce({ items: replies.slice(23), hasMore: false });
    api.createPostComment.mockResolvedValue({ id: 'new' });
    const wrapper = mount(CommunityCommentSection, {
      props: { postId: 'post' },
    });
    await flushPromises();
    await wrapper.find('.more-replies').trigger('click');
    await flushPromises();
    await wrapper
      .find('[data-comment-id="reply-22"] .reply-button')
      .trigger('click');
    await wrapper.find('textarea').setValue('继续讨论');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.findAll('.compact-replies [data-comment-id]')).toHaveLength(
      23,
    );
    expect(wrapper.text()).toContain('楼内回复22');
    expect(api.fetchCommentReplies).toHaveBeenNthCalledWith(3, 'post', 'root', {
      size: 23,
      cursor: undefined,
    });
    await wrapper.find('.more-replies').trigger('click');
    await flushPromises();
    expect(api.fetchCommentReplies).toHaveBeenLastCalledWith('post', 'root', {
      size: 20,
      cursor: 'refreshed-reply-23',
    });
    expect(wrapper.findAll('.compact-replies [data-comment-id]')).toHaveLength(
      24,
    );
    wrapper.unmount();
  });

  it('刷新超过100条的已加载范围时沿游标分批获取，不截断后面的楼层', async () => {
    const roots = Array.from({ length: 121 }, (_, i) => ({
      ...root,
      id: `root-${i}`,
      content: `长楼层${i}`,
    }));
    api.fetchCommentReplies.mockResolvedValue({ items: [], hasMore: false });
    api.fetchRootComments.mockImplementation(
      async (_post, { size = 20, cursor } = {}) => {
        const start = Number(cursor || 0);
        return {
          items: roots.slice(start, start + size),
          hasMore: start + size < roots.length,
          nextCursor: String(start + size),
        };
      },
    );
    api.createPostComment.mockResolvedValue({ id: 'new' });
    const wrapper = mount(CommunityCommentSection, {
      props: { postId: 'post' },
    });
    await flushPromises();
    for (let i = 0; i < 5; i++) {
      await wrapper
        .findAll('button')
        .find((button) => button.text() === '加载更多评论')
        .trigger('click');
      await flushPromises();
    }
    await wrapper.find('textarea').setValue('第121条');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.findAll('.comment-thread')).toHaveLength(121);
    expect(wrapper.text()).toContain('长楼层120');
    expect(api.fetchRootComments).toHaveBeenNthCalledWith(7, 'post', {
      size: 100,
      cursor: undefined,
    });
    expect(api.fetchRootComments).toHaveBeenNthCalledWith(8, 'post', {
      size: 21,
      cursor: '100',
    });
    wrapper.unmount();
  });

  it('切换帖子后，旧帖提交结果不清空新帖草稿', async () => {
    let finish;
    api.createPostComment.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const wrapper = mount(CommunityCommentSection, {
      props: { postId: 'post' },
    });
    await flushPromises();
    await wrapper.find('textarea').setValue('旧帖评论');
    await wrapper.find('form').trigger('submit');
    await wrapper.setProps({ postId: 'other-post' });
    await flushPromises();
    await wrapper.find('textarea').setValue('新帖草稿');
    finish({ id: 'old-result' });
    await flushPromises();
    expect(wrapper.find('textarea').element.value).toBe('新帖草稿');
    expect(wrapper.emitted('changed')).toBeUndefined();
    wrapper.unmount();
  });
});
