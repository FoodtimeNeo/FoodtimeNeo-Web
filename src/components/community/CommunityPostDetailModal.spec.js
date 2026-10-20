import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CommunityPostDetailModal from './CommunityPostDetailModal.vue';

const fetchCommunityPostDetail = vi.fn();
const fetchPostComments = vi.fn();
const createPostComment = vi.fn();

vi.mock('@/api/community.api.js', () => ({
  fetchCommunityPostDetail: (...args) => fetchCommunityPostDetail(...args),
  fetchPostComments: (...args) => fetchPostComments(...args),
  createPostComment: (...args) => createPostComment(...args),
}));

describe('CommunityPostDetailModal', () => {
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
        { id: 'img-1', url: '/soup1.jpg' },
        { id: 'img-2', url: '/soup2.jpg' },
      ],
      likeCount: 10,
      favoriteCount: 5,
    });
    fetchPostComments.mockResolvedValue([
      {
        id: 'c1',
        content: '看起来真不错！',
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

    expect(fetchCommunityPostDetail).toHaveBeenCalledWith('p1');
    expect(wrapper.text()).toContain('学一瓦罐汤美味分享');
    expect(wrapper.text()).toContain('干饭学长');
    expect(wrapper.text()).toContain('#瓦罐汤');
    expect(wrapper.text()).toContain('看起来真不错！');

    // 图片自适应容器存在
    const mediaImg = wrapper.find('.redbook-media-pane__img');
    expect(mediaImg.exists()).toBe(true);
    expect(mediaImg.attributes('src')).toBe('/soup1.jpg');

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
