import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { enableAutoUnmount, mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CommunityCommentSection from './CommunityCommentSection.vue';
const api = vi.hoisted(() => ({
  fetchRootComments: vi.fn(),
  fetchCommentReplies: vi.fn(),
  createPostComment: vi.fn(),
  fetchCommentStatus: vi.fn(),
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
const pending = (overrides) => ({
  ...root,
  id: 'new',
  status: 'pending',
  content: '新评论',
  author: { name: '我' },
  ...overrides,
});
const mountSection = () =>
  mount(CommunityCommentSection, { props: { postId: 'post' } });

enableAutoUnmount(afterEach);

describe('紧凑楼中楼', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    api.fetchRootComments.mockResolvedValue({ items: [root], hasMore: false });
    api.fetchCommentReplies.mockResolvedValue({
      items: [reply],
      hasMore: false,
    });
    api.fetchCommentStatus.mockResolvedValue({ id: 'new', status: 'pending' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('读取失败显示重试，不将错误伪装成空讨论', async () => {
    api.fetchRootComments.mockRejectedValueOnce(new Error('网络暂不可用'));
    const wrapper = mountSection();
    await flushPromises();
    expect(wrapper.text()).toContain('网络暂不可用');
    expect(wrapper.text()).toContain('重试加载');
    expect(wrapper.text()).not.toContain('还没有评论');
    wrapper.unmount();
  });

  it('只缩进一层，楼内互相回复发送实际对象 ID', async () => {
    api.createPostComment.mockResolvedValue(
      pending({ id: 'new', content: '赞同你的推荐' }),
    );
    const wrapper = mountSection();
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
      .mockResolvedValueOnce(pending({ content: '重试评论' }));
    const wrapper = mountSection();
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
    const wrapper = mountSection();
    await flushPromises();
    expect(wrapper.text()).toContain('原评论已删除');
    expect(wrapper.text()).toContain('楼内回复');
    expect(wrapper.findAll('.reply-button')).toHaveLength(0);
  });

  it('发完一级评论立即显示审核中，且不额外拉取列表', async () => {
    api.createPostComment.mockResolvedValue(pending({ content: '新一级评论' }));
    const wrapper = mountSection();
    await flushPromises();
    const before = api.fetchRootComments.mock.calls.length;

    await wrapper.find('textarea').setValue('新一级评论');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.findAll('.comment-thread')).toHaveLength(2);
    expect(wrapper.text()).toContain('新一级评论');
    expect(wrapper.text()).toContain('审核中');
    // 乐观插入，不再为了看到自己的评论而整页刷新
    expect(api.fetchRootComments).toHaveBeenCalledTimes(before);
    wrapper.unmount();
  });

  it('审核通过后自动刷新一次，显示为正式评论', async () => {
    vi.useFakeTimers();
    api.createPostComment.mockResolvedValue(pending({ content: '新一级评论' }));
    api.fetchCommentStatus.mockResolvedValue({ id: 'new', status: 'approved' });
    api.fetchRootComments
      .mockResolvedValueOnce({ items: [root], hasMore: false })
      .mockResolvedValue({
        items: [pending({ content: '新一级评论', status: 'approved' }), root],
        hasMore: false,
      });
    const wrapper = mountSection();
    await flushPromises();
    await wrapper.find('textarea').setValue('新一级评论');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('审核中');

    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();

    expect(api.fetchCommentStatus).toHaveBeenCalledWith('new');
    expect(wrapper.text()).toContain('新一级评论');
    expect(wrapper.text()).not.toContain('审核中');
    expect(api.fetchRootComments).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('楼内提交回复后立即插入到对应楼层', async () => {
    api.createPostComment.mockResolvedValue(
      pending({
        id: 'new-reply',
        rootCommentId: 'root',
        replyToCommentId: 'reply',
        content: '继续讨论',
      }),
    );
    const wrapper = mountSection();
    await flushPromises();
    await wrapper
      .find('[data-comment-id="reply"] .reply-button')
      .trigger('click');
    await wrapper.find('textarea').setValue('继续讨论');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.findAll('.compact-replies [data-comment-id]')).toHaveLength(
      2,
    );
    expect(wrapper.text()).toContain('继续讨论');
    expect(wrapper.text()).toContain('审核中');
    expect(api.fetchCommentReplies).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('通过后刷新超过100条的已加载范围时沿游标分批获取，不截断后面的楼层', async () => {
    vi.useFakeTimers();
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
    api.createPostComment.mockResolvedValue(
      pending({ id: 'new', content: '第121条' }),
    );
    api.fetchCommentStatus.mockResolvedValue({ id: 'new', status: 'approved' });
    const wrapper = mountSection();
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

    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();

    expect(api.fetchRootComments).toHaveBeenNthCalledWith(7, 'post', {
      size: 100,
      cursor: undefined,
    });
    expect(api.fetchRootComments).toHaveBeenNthCalledWith(8, 'post', {
      size: 22,
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
    const wrapper = mountSection();
    await flushPromises();
    await wrapper.find('textarea').setValue('旧帖评论');
    await wrapper.find('form').trigger('submit');
    await wrapper.setProps({ postId: 'other-post' });
    await flushPromises();
    await wrapper.find('textarea').setValue('新帖草稿');
    finish(pending({ id: 'old-result', content: '旧帖评论' }));
    await flushPromises();
    expect(wrapper.find('textarea').element.value).toBe('新帖草稿');
    expect(wrapper.emitted('changed')).toBeUndefined();
    wrapper.unmount();
  });
});
