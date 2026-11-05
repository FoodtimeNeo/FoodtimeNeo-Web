import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const fetchCanteens = vi.fn();
const fetchCommunityPosts = vi.fn();
const mockPush = vi.fn();
const fetchDailyRecommendations = vi.fn();
vi.mock('@/api/recommendation.api.js', () => ({
  fetchDailyRecommendations: (...args) => fetchDailyRecommendations(...args),
}));

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
import { useAuthStore } from '@/store/useAuthStore.js';

const recommended = {
  id: 'real-dish',
  name: '真实推荐菜品',
  rating: null,
  canteenName: '真实食堂 · 真实档口',
  intro: '今日探索',
  route: {
    name: 'dishDetail',
    params: { canteenId: 'hall', stallId: 'stall', dishId: 'real-dish' },
  },
};

function mountHome() {
  return mount(HomeView, {
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

describe('HomeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().setSession({ user: { id: 'one', role: 'user' } });
    fetchDailyRecommendations.mockReset().mockResolvedValue([recommended]);
    fetchCanteens.mockReset().mockResolvedValue([]);
    fetchCommunityPosts.mockReset().mockResolvedValue({ items: [], total: 0 });
    mockPush.mockReset();
  });

  it('展示 01 今日推荐、02 食堂手账与 03 社区动态，且社区采用紧凑瀑布流渲染', async () => {
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

    // 01 今日推荐部分
    expect(wrapper.text()).toContain('今日推荐');
    expect(wrapper.text()).toContain('真实推荐菜品');
    expect(wrapper.text()).toContain('无评分');
    expect(wrapper.text()).not.toContain('红烧牛肉面');

    // 02 食堂部分
    expect(wrapper.text()).toContain('选择今天的食堂');
    expect(wrapper.text()).toContain('学一餐厅');

    // 02 社区动态部分
    expect(wrapper.text()).toContain('校园食记 · 社区动态');
    expect(wrapper.text()).toContain('今日热门');
    expect(wrapper.text()).toContain('学一瓦罐汤');

    // 验证瀑布流分列结构存在
    const waterfallCols = wrapper.findAll('.home-community-waterfall__col');
    expect(waterfallCols.length).toBeGreaterThan(0);

    // 点击卡片在电脑端弹出小红书详情弹窗而不单开页面
    const postCard = wrapper.find('.community-post-card');
    expect(postCard.exists()).toBe(true);
    await postCard.trigger('click');
    await flushPromises();

    // 弹窗组件被唤起
    const detailModal = wrapper.findComponent({
      name: 'CommunityPostDetailModal',
    });
    expect(detailModal.exists()).toBe(true);
    expect(detailModal.props('modelValue')).toBe(true);
    expect(detailModal.props('postId')).toBe('p1');
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

  it('推荐卡进入真实菜品详情', async () => {
    const wrapper = mountHome();
    await flushPromises();
    await wrapper
      .find('[aria-labelledby="recommendations-title"] .canteen-card')
      .trigger('click');
    expect(mockPush).toHaveBeenCalledWith(recommended.route);
    wrapper.unmount();
  });

  it('加载失败提供重试，空数据不显示示例推荐', async () => {
    fetchDailyRecommendations
      .mockRejectedValueOnce(new Error('服务暂不可用'))
      .mockResolvedValueOnce([]);
    const wrapper = mountHome();
    await flushPromises();
    const section = wrapper.find('[aria-labelledby="recommendations-title"]');
    expect(section.text()).toContain('服务暂不可用');
    await section.find('button').trigger('click');
    await flushPromises();
    expect(section.text()).toContain('今日暂无推荐');
    expect(section.find('.canteen-card').exists()).toBe(false);
    wrapper.unmount();
  });

  it('切换用户时取消旧请求，旧响应不能覆盖当前身份，注销后清空推荐', async () => {
    let resolveOld;
    fetchDailyRecommendations.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    const wrapper = mountHome();
    await flushPromises();
    const firstSignal = fetchDailyRecommendations.mock.calls[0][0].signal;
    useAuthStore().setSession({ user: { id: 'two', role: 'visitor' } });
    await flushPromises();
    expect(firstSignal.aborted).toBe(true);
    resolveOld([{ ...recommended, name: '过期推荐' }]);
    await flushPromises();
    expect(wrapper.text()).not.toContain('过期推荐');
    useAuthStore().clear();
    await flushPromises();
    expect(
      wrapper.find('[aria-labelledby="recommendations-title"]').text(),
    ).not.toContain('真实推荐菜品');
    wrapper.unmount();
  });
});
