import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CommunityPostDetailModal from './CommunityPostDetailModal.vue';

const fetchCommunityPostDetail = vi.fn();
const fetchPostComments = vi.fn();
const createPostComment = vi.fn();
const recordPostView = vi.fn();

vi.mock('@/api/browsingHistory.api.js', () => ({
  fetchHistorySettings: vi.fn().mockResolvedValue({
    enabled: false,
    revision: 1,
    dishEpoch: 0,
    postEpoch: 0,
  }),
  recordBrowsingHistory: vi.fn(),
  updateHistorySettings: vi.fn(),
}));
vi.mock('@/api/follow.api.js', () => ({
  fetchFollowStatus: vi.fn().mockResolvedValue({ followed: false }),
}));
vi.mock('@/api/community.api.js', () => ({
  recordPostView: (...args) => recordPostView(...args),
  fetchCommunityPostDetail: (...args) => fetchCommunityPostDetail(...args),
  fetchRootComments: async (...args) => ({
    items: await fetchPostComments(...args),
    hasMore: false,
  }),
  fetchCommentReplies: async () => ({ items: [], hasMore: false }),
  createPostComment: (...args) => createPostComment(...args),
}));

describe('CommunityPostDetailModal', () => {
  it('快速切帖时旧详情响应不能覆盖当前帖子', async () => {
    setActivePinia(createPinia());
    let resolveOld;
    const old = new Promise((resolve) => {
      resolveOld = resolve;
    });
    fetchCommunityPostDetail.mockImplementation((id) =>
      id === 'old'
        ? old
        : Promise.resolve({
            id: 'new',
            title: '当前食记',
            content: '新正文',
            author: { name: '作者' },
            images: [],
          }),
    );
    const wrapper = mount(CommunityPostDetailModal, {
      props: { modelValue: true, postId: 'old' },
      global: { stubs: { Teleport: true, CommunityCommentSection: true } },
    });
    const [, request] = fetchCommunityPostDetail.mock.calls[0];
    await wrapper.setProps({ postId: 'new' });
    expect(request.signal.aborted).toBe(true);
    await flushPromises();
    resolveOld({ id: 'old', title: '过时食记', images: [] });
    await flushPromises();
    expect(wrapper.text()).toContain('当前食记');
    expect(wrapper.text()).not.toContain('过时食记');
    wrapper.unmount();
  });
  it('先显示列表已有的正文；服务器确认帖子不可见时移除旧内容', async () => {
    let deny;
    fetchCommunityPostDetail.mockImplementation(
      () => new Promise((_, reject) => (deny = reject)),
    );
    const wrapper = mount(CommunityPostDetailModal, {
      props: {
        modelValue: true,
        postId: 'cached',
        initialPost: { id: 'cached', title: '已浏览的食记', images: [] },
      },
      global: { stubs: { Teleport: true, CommunityCommentSection: true } },
    });
    expect(wrapper.text()).toContain('已浏览的食记');
    deny({ status: 404, message: '食记不可见' });
    await flushPromises();
    expect(wrapper.text()).not.toContain('已浏览的食记');
    expect(wrapper.text()).toContain('食记不可见');
    wrapper.unmount();
  });
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchCommunityPostDetail.mockReset();
    fetchPostComments.mockReset();
    createPostComment.mockReset();
    recordPostView.mockReset();
    recordPostView.mockResolvedValue({ viewCount: 1 });
  });

  it('详情右侧显示浏览量，每次进入计一次，评论刷新不重复累计', async () => {
    fetchCommunityPostDetail.mockResolvedValue({
      id: 'p1',
      title: '食记',
      images: [],
      author: {},
      viewCount: 1200,
      createdAt: '2026-11-11T10:00:00Z',
      status: 'approved',
    });
    recordPostView.mockResolvedValue({ viewCount: 1201 });
    const wrapper = mount(CommunityPostDetailModal, {
      props: { modelValue: true, postId: 'p1' },
      global: { stubs: { Teleport: true, CommunityCommentSection: true } },
    });
    await flushPromises();
    expect(wrapper.get('.redbook-post-footline').text()).toContain(
      '1,201 次浏览',
    );
    const first = recordPostView.mock.calls[0][1];
    expect(recordPostView).toHaveBeenCalledTimes(1);
    wrapper
      .findComponent({ name: 'CommunityCommentSection' })
      .vm.$emit('changed');
    await flushPromises();
    expect(recordPostView).toHaveBeenCalledTimes(1);
    expect(wrapper.get('.post-view-count').text()).toContain('1,201');
    await wrapper.setProps({ modelValue: false });
    await wrapper.setProps({ modelValue: true });
    await flushPromises();
    expect(recordPostView).toHaveBeenCalledTimes(2);
    expect(recordPostView.mock.calls[1][1]).not.toBe(first);
    wrapper.unmount();
  });

  it('统计请求慢时正文照常显示；切帖后旧统计不能覆盖新帖子', async () => {
    let finish;
    fetchCommunityPostDetail.mockImplementation(async (id) => ({
      id,
      title: id,
      author: {},
      images: [],
      viewCount: id === 'second' ? 9 : 0,
    }));
    recordPostView
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue({ viewCount: 10 });
    const wrapper = mount(CommunityPostDetailModal, {
      props: { modelValue: true, postId: 'first' },
      global: { stubs: { Teleport: true, CommunityCommentSection: true } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('first');
    await wrapper.setProps({ postId: 'second' });
    await flushPromises();
    finish({ viewCount: 999 });
    await flushPromises();
    expect(wrapper.text()).toContain('second');
    expect(wrapper.get('.post-view-count').text()).toContain('10 次浏览');
    expect(wrapper.get('.post-view-count').text()).not.toContain('999');
    wrapper.unmount();
  });

  it('modelValue 为 true 时正确拉取帖子并渲染小红书左右双栏结构', async () => {
    fetchCommunityPostDetail.mockResolvedValue({
      id: 'p1',
      title: '学一瓦罐汤美味分享',
      content: '今天下课喝了一大碗排骨汤，太香了！',
      author: { id: 'u-101', name: '干饭学长', avatar: '' },
      createdAt: '2026-10-19T10:00:00.000Z',
      status: 'approved',
      tags: ['瓦罐汤', '北京赛区'],
      images: [
        { id: 'img-1', url: 'https://example.com/soup1.jpg' },
        { id: 'img-2', url: 'https://example.com/soup2.jpg' },
      ],
      likeCount: 10,
      favoriteCount: 5,
    });
    fetchPostComments.mockResolvedValue([
      {
        id: 'c1',
        content: '看起来真不错！',
        status: 'approved',
        author: { id: 'u-102', name: '小王' },
        createdAt: '2026-10-19T10:30:00.000Z',
        likeCount: 2,
      },
    ]);

    const wrapper = mount(CommunityPostDetailModal, {
      props: {
        modelValue: true,
        postId: 'p1',
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    await flushPromises();

    expect(fetchCommunityPostDetail).toHaveBeenCalledWith('p1', {
      signal: expect.any(AbortSignal),
    });
    expect(wrapper.text()).toContain('学一瓦罐汤美味分享');
    expect(wrapper.text()).toContain('干饭学长');
    expect(wrapper.text()).toContain('#瓦罐汤');
    expect(wrapper.text()).toContain('看起来真不错！');

    // 图片自适应容器存在
    const mediaImg = wrapper.find('.redbook-media-pane .media-image img');
    expect(mediaImg.exists()).toBe(true);
    expect(mediaImg.attributes('src')).toBe('https://example.com/soup1.jpg');
    expect(wrapper.findComponent({ name: 'MediaImage' }).props('size')).toBe(
      'thumb',
    );

    // 底部吸底交互栏存在
    const bottomBar = wrapper.find('.redbook-bottom-bar');
    expect(bottomBar.exists()).toBe(true);
    expect(bottomBar.text()).toContain('10'); // likeCount
    expect(bottomBar.text()).toContain('5'); // favoriteCount

    // 点击关闭按钮触发事件
    const closeBtn = wrapper.find('.redbook-modal__close-btn');
    await closeBtn.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([false]);
  });
});
