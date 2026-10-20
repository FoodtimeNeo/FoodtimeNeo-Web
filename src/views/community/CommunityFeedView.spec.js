import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const fetchCommunityPosts = vi.fn();
const createCommunityPost = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/community.api.js', () => ({
  fetchCommunityPosts: (...args) => fetchCommunityPosts(...args),
  createCommunityPost: (...args) => createCommunityPost(...args),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {}, query: {} }),
  useRouter: () => ({ push: mockPush }),
  RouterLink: RouterLinkStub,
}));

import CommunityFeedView from './CommunityFeedView.vue';

function mountView() {
  return mount(CommunityFeedView, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        Teleport: true,
        ElDialog: {
          template:
            '<div class="el-dialog-stub" v-if="modelValue"><slot /></div>',
          props: ['modelValue'],
        },
      },
    },
  });
}

describe('CommunityFeedView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchCommunityPosts.mockReset();
    createCommunityPost.mockReset();
    mockPush.mockReset();
  });

  it('拉取帖子时默认请求 approved 审核通过状态，并在电脑端以三列渲染', async () => {
    fetchCommunityPosts.mockResolvedValue({
      items: [
        {
          id: 'p1',
          title: '学一瓦罐汤',
          status: 'approved',
          images: [{ url: '/img1.jpg', width: 800, height: 600 }],
        },
        {
          id: 'p2',
          title: '明湖酸汤粉',
          status: 'approved',
          images: [{ url: '/img2.jpg', width: 800, height: 1000 }],
        },
        {
          id: 'p3',
          title: '学二牛肉拉面',
          status: 'approved',
          images: [{ url: '/img3.jpg', width: 800, height: 800 }],
        },
      ],
      total: 3,
    });

    const wrapper = mountView();
    await flushPromises();

    // 验证审核过滤参数
    expect(fetchCommunityPosts).toHaveBeenCalledWith({ status: 'approved' });

    // 验证渲染标题与电脑端三列结构
    expect(wrapper.text()).toContain('学一瓦罐汤');
    expect(wrapper.text()).toContain('明湖酸汤粉');
    expect(wrapper.text()).toContain('学二牛肉拉面');
    const cols = wrapper.findAll('.community-waterfall__col');
    expect(cols.length).toBe(3);
  });

  it('在移动端视口下以两列渲染瀑布流', async () => {
    // 模拟移动端 mediaQuery
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('768px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    fetchCommunityPosts.mockResolvedValue({
      items: [
        {
          id: 'p1',
          title: '学一瓦罐汤',
          status: 'approved',
          images: [{ url: '/img1.jpg', width: 800, height: 600 }],
        },
        {
          id: 'p2',
          title: '明湖酸汤粉',
          status: 'approved',
          images: [{ url: '/img2.jpg', width: 800, height: 1000 }],
        },
      ],
      total: 2,
    });

    const wrapper = mountView();
    await flushPromises();

    const cols = wrapper.findAll('.community-waterfall__col');
    expect(cols.length).toBe(2);
  });

  it('点击卡片在当前页弹出小红书详情弹窗而不单开页面', async () => {
    fetchCommunityPosts.mockResolvedValue({
      items: [
        {
          id: 'p1',
          title: '学一瓦罐汤',
          status: 'approved',
          images: [{ url: '/img1.jpg' }],
        },
      ],
      total: 1,
    });

    const wrapper = mountView();
    await flushPromises();

    const card = wrapper.find('.community-post-card');
    expect(card.exists()).toBe(true);
    await card.trigger('click');
    await flushPromises();

    const detailModal = wrapper.findComponent({
      name: 'CommunityPostDetailModal',
    });
    expect(detailModal.exists()).toBe(true);
    expect(detailModal.props('modelValue')).toBe(true);
    expect(detailModal.props('postId')).toBe('p1');
  });

  it('右下角存在悬浮发帖按钮，点击可唤起发帖弹窗', async () => {
    fetchCommunityPosts.mockResolvedValue({ items: [], total: 0 });
    const wrapper = mountView();
    await flushPromises();

    const fabBtn = wrapper.find('.community-fab-btn');
    expect(fabBtn.exists()).toBe(true);

    // 初始弹窗未打开
    expect(wrapper.find('.el-dialog-stub').exists()).toBe(false);

    // 点击发帖按钮
    await fabBtn.trigger('click');
    expect(wrapper.find('.el-dialog-stub').exists()).toBe(true);
  });

  it('顶部右上角存在发帖按钮，点击可唤起发帖弹窗', async () => {
    fetchCommunityPosts.mockResolvedValue({ items: [], total: 0 });
    const wrapper = mountView();
    await flushPromises();

    const topBtn = wrapper.find('.community-header-post-btn');
    expect(topBtn.exists()).toBe(true);

    expect(wrapper.find('.el-dialog-stub').exists()).toBe(false);
    await topBtn.trigger('click');
    expect(wrapper.find('.el-dialog-stub').exists()).toBe(true);
  });
});
