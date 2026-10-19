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

  it('展示 01 食堂手账 与 02 社区动态两大章节', async () => {
    fetchCanteens.mockResolvedValue([
      { id: 'c1', name: '学一餐厅', description: '老牌食堂' },
    ]);
    fetchCommunityPosts.mockResolvedValue({
      items: [
        {
          id: 'p1',
          title: '学一瓦罐汤',
          status: 'approved',
          images: [{ url: '/soup.jpg' }],
        },
      ],
      total: 1,
    });

    const wrapper = mountHome();
    await flushPromises();

    // 01 食堂部分
    expect(wrapper.text()).toContain('选择今天的食堂');
    expect(wrapper.text()).toContain('学一餐厅');

    // 02 社区动态部分
    expect(wrapper.text()).toContain('校园食记 · 社区动态');
    expect(wrapper.text()).toContain('学一瓦罐汤');

    // 点击卡片跳转到详情页
    const postCard = wrapper.find('.community-post-card');
    expect(postCard.exists()).toBe(true);
    await postCard.trigger('click');
    expect(mockPush).toHaveBeenCalledWith({
      name: 'communityDetail',
      params: { postId: 'p1' },
    });
  });
});
