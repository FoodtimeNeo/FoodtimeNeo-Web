import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CommunityPostDetailModal from './CommunityPostDetailModal.vue';

const fetchCommunityPostDetail = vi.fn();
const fetchPostComments = vi.fn();
const createPostComment = vi.fn();

vi.mock('@/api/community.api.js', () => ({
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
