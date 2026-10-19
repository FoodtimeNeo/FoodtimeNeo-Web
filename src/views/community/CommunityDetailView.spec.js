import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ApiError } from '@/api/http.js';

const fetchCommunityPostDetail = vi.fn();
const fetchPostComments = vi.fn();
const createPostComment = vi.fn();

vi.mock('@/api/community.api.js', () => ({
  fetchCommunityPostDetail: (...args) => fetchCommunityPostDetail(...args),
  fetchPostComments: (...args) => fetchPostComments(...args),
  createPostComment: (...args) => createPostComment(...args),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { postId: 'p1' } }),
  useRouter: () => ({ push: vi.fn() }),
  RouterLink: RouterLinkStub,
}));

import CommunityDetailView from './CommunityDetailView.vue';

function mountView() {
  return mount(CommunityDetailView, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        Teleport: true,
      },
    },
  });
}

describe('CommunityDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchCommunityPostDetail.mockReset();
    fetchPostComments.mockReset();
    createPostComment.mockReset();
  });

  it('展示帖子标题、正文、作者信息、发布时间与多图轮播', async () => {
    fetchCommunityPostDetail.mockResolvedValue({
      id: 'p1',
      title: '学一瓦罐汤美味分享',
      content: '今天下课喝了一大碗排骨汤，太香了！',
      author: { id: 'u-101', name: '干饭学长', avatar: '' },
      createdAt: '2026-10-19T10:00:00.000Z',
      status: 'approved',
      images: [
        { id: 'img-1', url: '/p1.jpg' },
        { id: 'img-2', url: '/p2.jpg' },
      ],
      likeCount: 5,
      favoriteCount: 2,
    });
    fetchPostComments.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(fetchCommunityPostDetail).toHaveBeenCalledWith('p1');
    expect(wrapper.text()).toContain('学一瓦罐汤美味分享');
    expect(wrapper.text()).toContain('今天下课喝了一大碗排骨汤');
    expect(wrapper.text()).toContain('干饭学长');
    expect(wrapper.text()).toContain('ID: u-101');

    // 多图轮播与指示圆点
    const dots = wrapper.findAll('.community-image-viewer__dot');
    expect(dots.length).toBe(2);
  });

  it('帖子不存在或加载失败时显示错误态', async () => {
    fetchCommunityPostDetail.mockRejectedValue(
      new ApiError('帖子不存在或已被删除', { status: 404, code: 'NOT_FOUND' }),
    );
    fetchPostComments.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain('帖子不存在或已被删除');
  });

  it('待审核帖子渲染黄色审核提示条', async () => {
    fetchCommunityPostDetail.mockResolvedValue({
      id: 'p2',
      title: '审核中的帖子',
      content: '待审核内容',
      author: { id: 'u-admin', name: '测试者' },
      createdAt: '2026-10-19T11:00:00.000Z',
      status: 'pending',
      images: [],
    });
    fetchPostComments.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('.community-detail-card__audit-banner').exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain('正在审核中');
  });
});
