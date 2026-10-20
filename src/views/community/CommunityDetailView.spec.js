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
    const dots = wrapper.findAll('.dot-item');
    expect(dots.length).toBe(2);

    // 图片自适应展示存在
    const mediaImg = wrapper.find('.media-img');
    expect(mediaImg.exists()).toBe(true);
    expect(mediaImg.attributes('src')).toBe('/p1.jpg');

    // 底部操作栏存在
    const bottomBar = wrapper.find('.bottom-action-bar');
    expect(bottomBar.exists()).toBe(true);
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

  it('点赞与收藏可即时切换且不包含下阶段文案', async () => {
    fetchCommunityPostDetail.mockResolvedValue({
      id: 'p1',
      title: '学一瓦罐汤',
      content: '排骨汤浓郁好喝',
      author: { id: 'u-1', name: '同学' },
      createdAt: '2026-10-19T10:00:00.000Z',
      status: 'approved',
      images: [],
      likeCount: 10,
      favoriteCount: 5,
    });
    fetchPostComments.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    // 严禁出现“下阶段”
    expect(wrapper.text()).not.toContain('下阶段');
    expect(wrapper.text()).not.toContain('下一阶段');

    const btns = wrapper.findAll(
      '.community-detail-card__interactions .interact-btn',
    );
    expect(btns.length).toBe(2);

    // 点赞
    await btns[0].trigger('click');
    expect(wrapper.text()).toContain('已赞 11');
    expect(btns[0].classes()).toContain('is-active');

    // 取消点赞
    await btns[0].trigger('click');
    expect(wrapper.text()).toContain('点赞 10');
    expect(btns[0].classes()).not.toContain('is-active');

    // 收藏
    await btns[1].trigger('click');
    expect(wrapper.text()).toContain('已收藏 6');
    expect(btns[1].classes()).toContain('is-active');
  });
});
