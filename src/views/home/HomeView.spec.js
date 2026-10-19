import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const fetchCanteens = vi.fn();
const fetchCommunityPosts = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/canteen.api.js', () => ({
  fetchCanteens: (...args) => fetchCanteens(...args),
}));

vi.mock('@/api/community.api.js', () => ({
  fetchCommunityPosts: (...args) => fetchCommunityPosts(...args),
  createCommunityPost: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  RouterLink: RouterLinkStub,
}));

import HomeView from './HomeView.vue';

function mountHome() {
  return mount(HomeView, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        ElDialog: {
          template:
            '<div class="el-dialog-stub" v-if="modelValue"><slot /></div>',
          props: ['modelValue'],
        },
      },
    },
  });
}

describe('HomeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchCanteens.mockReset();
    fetchCommunityPosts.mockReset();
    mockPush.mockReset();
  });

  it('展示 01 食堂手账 与 02 社区动态两大章节，且社区采用紧凑瀑布流渲染', async () => {
    fetchCanteens.mockResolvedValue([
      { id: 'c1', name: '学一餐厅', description: '老牌食堂' },
    ]);
    fetchCommunityPosts.mockResolvedValue({
      items: [
        {
          id: 'p1',
          title: '学一瓦罐汤',
          status: 'approved',
          images: [{ url: '/soup.jpg', width: 800, height: 600 }],
        },
        {
          id: 'p2',
          title: '明湖酸汤粉',
          status: 'approved',
          images: [{ url: '/powder.jpg', width: 800, height: 1000 }],
        },
      ],
      total: 2,
    });

    const wrapper = mountHome();
    await flushPromises();

    // 01 食堂部分
    expect(wrapper.text()).toContain('选择今天的食堂');
    expect(wrapper.text()).toContain('学一餐厅');

    // 02 社区动态部分
    expect(wrapper.text()).toContain('校园食记 · 社区动态');
    expect(wrapper.text()).toContain('今日热门');
    expect(wrapper.text()).toContain('学一瓦罐汤');

    // 验证瀑布流分列结构存在
    const waterfallCols = wrapper.findAll('.home-community-waterfall__col');
    expect(waterfallCols.length).toBeGreaterThan(0);

    // 点击卡片跳转到详情页
    const postCard = wrapper.find('.community-post-card');
    expect(postCard.exists()).toBe(true);
    await postCard.trigger('click');
    expect(mockPush).toHaveBeenCalledWith({
      name: 'communityDetail',
      params: { postId: 'p1' },
    });
  });

  it('首页提供快速发帖入口可唤起发帖弹窗', async () => {
    fetchCanteens.mockResolvedValue([]);
    fetchCommunityPosts.mockResolvedValue({ items: [], total: 0 });

    const wrapper = mountHome();
    await flushPromises();

    const quickBtn = wrapper.find('.community-quick-post-btn');
    expect(quickBtn.exists()).toBe(true);
    expect(wrapper.find('.el-dialog-stub').exists()).toBe(false);

    await quickBtn.trigger('click');
    expect(wrapper.find('.el-dialog-stub').exists()).toBe(true);
  });
});
