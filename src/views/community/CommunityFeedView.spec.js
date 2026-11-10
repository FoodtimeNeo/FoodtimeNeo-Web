import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const fetchCommunityPosts = vi.fn();
const fetchMyCommunityPosts = vi.fn();
const fetchMyCommunityFavorites = vi.fn();
const createCommunityPost = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/community.api.js', () => ({
  fetchCommunityPosts: (...args) => fetchCommunityPosts(...args),
  fetchMyCommunityPosts: (...args) => fetchMyCommunityPosts(...args),
  fetchMyCommunityFavorites: (...args) => fetchMyCommunityFavorites(...args),
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
    fetchMyCommunityPosts.mockReset();
    fetchMyCommunityFavorites.mockReset();
    createCommunityPost.mockReset();
    mockPush.mockReset();
  });

  it('只看关注可以搜索食记，翻页保留查询范围', async () => {
    fetchCommunityPosts.mockResolvedValue({
      items: [],
      hasMore: true,
      nextCursor: 'next',
    });
    const wrapper = mountView();
    await flushPromises();
    const tab = wrapper
      .findAll('.community-tabs button')
      .find((item) => item.text() === '关注');
    await tab.trigger('click');
    await flushPromises();
    expect(fetchCommunityPosts).toHaveBeenLastCalledWith({
      cursor: undefined,
      following: true,
    });
    await wrapper.get('.community-tools__search').trigger('click');
    await wrapper.get('#community-keyword').setValue('  鸡腿饭  ');
    await wrapper.get('.community-search').trigger('submit');
    await flushPromises();
    expect(fetchCommunityPosts).toHaveBeenLastCalledWith({
      cursor: undefined,
      following: true,
      q: '鸡腿饭',
    });
    await wrapper.get('.community-more').trigger('click');
    await flushPromises();
    expect(fetchCommunityPosts).toHaveBeenLastCalledWith({
      cursor: 'next',
      following: true,
      q: '鸡腿饭',
    });
    wrapper.unmount();
  });

  it('使用公开信息流并以两列渲染', async () => {
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
    expect(fetchCommunityPosts).toHaveBeenCalledWith({ cursor: undefined });

    // 验证渲染标题与电脑端三列结构
    expect(wrapper.text()).toContain('学一瓦罐汤');
    expect(wrapper.text()).toContain('明湖酸汤粉');
    expect(wrapper.text()).toContain('学二牛肉拉面');
    const cols = wrapper.findAll('.community-waterfall__col');
    expect(cols.length).toBe(3);
  });

  it('在移动端视口下以两列渲染瀑布流', async () => {
    const originalInnerWidth = window.innerWidth;
    window.innerWidth = 375;
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
    window.innerWidth = originalInnerWidth;
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

  it('下拉松手才刷新，加载期间保留已显示的食记', async () => {
    fetchCommunityPosts.mockResolvedValueOnce({
      items: [{ id: 'p1', title: '食堂瓦罐汤' }],
    });
    let respond;
    fetchCommunityPosts.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          respond = resolve;
        }),
    );
    const wrapper = mountView();
    await flushPromises();

    const stream = wrapper.get('.community-stream');
    await stream.trigger('touchstart', {
      touches: [{ clientX: 90, clientY: 40 }],
    });
    await stream.trigger('touchmove', {
      touches: [{ clientX: 90, clientY: 170 }],
    });
    expect(wrapper.get('.community-refresh').classes()).toContain(
      'is-dragging',
    );
    expect(fetchCommunityPosts).toHaveBeenCalledTimes(1);
    await stream.trigger('touchend', {
      changedTouches: [{ clientX: 90, clientY: 170 }],
    });
    expect(fetchCommunityPosts).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('食堂瓦罐汤');
    respond({ items: [{ id: 'p2', title: '新食记' }] });
    await flushPromises();
    expect(wrapper.text()).toContain('新食记');
    expect(wrapper.get('.community-refresh').classes()).not.toContain(
      'is-visible',
    );
    wrapper.unmount();
  });

  it('横向滑动从发现切换到关注', async () => {
    fetchCommunityPosts.mockResolvedValue({ items: [] });
    const wrapper = mountView();
    await flushPromises();
    const stream = wrapper.get('.community-stream');
    await stream.trigger('touchstart', {
      touches: [{ clientX: 50, clientY: 80 }],
    });
    await stream.trigger('touchmove', {
      touches: [{ clientX: 155, clientY: 85 }],
    });
    await stream.trigger('touchend', {
      changedTouches: [{ clientX: 155, clientY: 85 }],
    });
    expect(wrapper.get('.community-tabs [aria-pressed="true"]').text()).toBe(
      '关注',
    );
    expect(fetchCommunityPosts).toHaveBeenLastCalledWith({
      cursor: undefined,
      following: true,
    });
    wrapper.unmount();
  });

  it('拖动时同步移动页面和红线，长滑仍只前进一页', async () => {
    fetchCommunityPosts.mockResolvedValue({ items: [] });
    fetchMyCommunityFavorites.mockResolvedValue({ items: [] });
    const wrapper = mountView();
    await flushPromises();
    const stream = wrapper.get('.community-stream');
    Object.defineProperty(
      wrapper.get('.community-pager').element,
      'clientWidth',
      { value: 400 },
    );
    const indicator = wrapper.get('.community-tabs__indicator');
    await stream.trigger('touchstart', {
      touches: [{ clientX: 380, clientY: 80 }],
    });
    await stream.trigger('touchmove', {
      touches: [{ clientX: 280, clientY: 80 }],
    });
    expect(indicator.element.style.transform).toBe('translateX(125%)');
    expect(
      wrapper.get('.community-pager__page.is-active').element.style.transform,
    ).toBe('translateX(-25%)');
    expect(
      wrapper.get('.community-pager__page[aria-label="收藏"]').element.style
        .transform,
    ).toBe('translateX(75%)');
    expect(fetchMyCommunityFavorites).not.toHaveBeenCalled();
    await stream.trigger('touchmove', {
      touches: [{ clientX: -500, clientY: 80 }],
    });
    expect(indicator.element.style.transform).toBe('translateX(200%)');
    await stream.trigger('touchend', {
      changedTouches: [{ clientX: -500, clientY: 80 }],
    });
    expect(wrapper.get('.community-tabs [aria-pressed="true"]').text()).toBe(
      '收藏',
    );
    expect(fetchMyCommunityPosts).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('短滑和边缘外滑都留在原页', async () => {
    fetchCommunityPosts.mockResolvedValue({ items: [] });
    const wrapper = mountView();
    await flushPromises();
    const stream = wrapper.get('.community-stream');
    await stream.trigger('touchstart', {
      touches: [{ clientX: 90, clientY: 80 }],
    });
    await stream.trigger('touchmove', {
      touches: [{ clientX: 120, clientY: 80 }],
    });
    await stream.trigger('touchend', {
      changedTouches: [{ clientX: 120, clientY: 80 }],
    });
    expect(wrapper.get('.community-tabs [aria-pressed="true"]').text()).toBe(
      '发现',
    );
    expect(
      wrapper.get('.community-tabs__indicator').element.style.transform,
    ).toBe('translateX(100%)');
    expect(fetchCommunityPosts).toHaveBeenCalledTimes(1);
    wrapper.unmount();

    const edge = mountView();
    await edge.get('.community-tabs button').trigger('click');
    const edgeStream = edge.get('.community-stream');
    await edgeStream.trigger('touchstart', {
      touches: [{ clientX: 30, clientY: 80 }],
    });
    await edgeStream.trigger('touchmove', {
      touches: [{ clientX: 260, clientY: 80 }],
    });
    await edgeStream.trigger('touchend', {
      changedTouches: [{ clientX: 260, clientY: 80 }],
    });
    expect(edge.get('.community-tabs [aria-pressed="true"]').text()).toBe(
      '关注',
    );
    expect(edge.get('.community-tabs__indicator').element.style.transform).toBe(
      'translateX(0%)',
    );
    edge.unmount();
  });

  it('发帖成功后再次打开使用空白预填数据', async () => {
    fetchCommunityPosts.mockResolvedValue({ items: [], total: 0 });
    fetchMyCommunityPosts.mockResolvedValue({ items: [], total: 0 });
    const wrapper = mountView();
    await flushPromises();

    const modal = wrapper.findComponent({ name: 'PostCreateModal' });
    modal.vm.$emit('created', { id: 'pending-post' });
    await wrapper.get('.community-fab-btn').trigger('click');

    expect(modal.props('initialData')).toEqual({});
  });
});
