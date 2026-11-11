import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
const api = vi.hoisted(() => ({
  fetchDish: vi.fn(),
  fetchDishReviews: vi.fn(),
  fetchDishImages: vi.fn(),
  fetchDishRating: vi.fn(),
  fetchDishFavorite: vi.fn(),
  setDishFavorite: vi.fn(),
}));
vi.mock('@/api/dish.api.js', () => api);
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useRoute: () => ({
    params: { canteenId: 'c1', stallId: 's1', dishId: 'd1' },
  }),
  RouterLink: RouterLinkStub,
}));
import DishDetailView from './DishDetailView.vue';
import { clearAsyncDataCache } from '@/composables/useAsyncData.js';
beforeEach(() => {
  setActivePinia(createPinia());
  clearAsyncDataCache();
  Object.values(api).forEach((fn) => fn.mockReset());
  api.fetchDish.mockResolvedValue({
    id: 'd1',
    name: '牛肉面',
    price: 0,
    stallId: 's1',
    diningHallId: 'c1',
    stallName: '面档',
    diningHallName: '第一食堂',
  });
  api.fetchDishImages.mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    size: 20,
  });
  api.fetchDishRating.mockResolvedValue({
    averageScore: 4.25,
    reviewCount: 30,
  });
  api.fetchDishFavorite.mockResolvedValue({ saved: false });
  api.setDishFavorite.mockResolvedValue({ saved: true });
  api.fetchDishReviews.mockResolvedValue({
    items: [
      {
        id: 'r1',
        userId: 'user-id',
        userDisplayName: '干饭达人',
        rating: 5,
        content: '好吃',
      },
    ],
    total: 21,
    page: 1,
    size: 20,
  });
});
describe('菜品真实详情', () => {
  it('收藏后只更新想吃按钮，不重新请求详情或评价', async () => {
    const wrapper = mount(DishDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();
    await wrapper.get('button[aria-pressed="false"]').trigger('click');
    await flushPromises();
    expect(api.setDishFavorite).toHaveBeenCalledExactlyOnceWith('d1', true);
    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe('已想吃');
    expect(api.fetchDish).toHaveBeenCalledTimes(1);
    expect(api.fetchDishReviews).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
  it('图片或评分慢时，菜品信息、点评与操作入口仍可用；重试只读取失败区域', async () => {
    let completeImage;
    api.fetchDishImages.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeImage = resolve;
        }),
    );
    api.fetchDishRating.mockRejectedValueOnce(new Error('评分断网'));
    const wrapper = mount(DishDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('牛肉面');
    expect(wrapper.text()).toContain('好吃');
    expect(wrapper.text()).toContain('写点评');
    expect(wrapper.text()).toContain('评分断网');
    const heading = wrapper.get('h1').element;
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '重试')
      .trigger('click');
    await flushPromises();
    expect(api.fetchDish).toHaveBeenCalledTimes(1);
    expect(api.fetchDishReviews).toHaveBeenCalledTimes(1);
    expect(api.fetchDishImages).toHaveBeenCalledTimes(1);
    expect(api.fetchDishRating).toHaveBeenCalledTimes(2);
    expect(wrapper.get('h1').element).toBe(heading);
    completeImage({ items: [] });
    await flushPromises();
    wrapper.unmount();
  });
  it('写点评按钮进入当前菜品子页面，不使用选择目标的查询参数', async () => {
    const wrapper = mount(DishDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();
    const link = wrapper
      .findAllComponents(RouterLinkStub)
      .find((link) => link.text() === '写点评');
    expect(link.props('to')).toEqual({
      name: 'dishReviewCreate',
      params: { canteenId: 'c1', stallId: 's1', dishId: 'd1' },
    });
  });
  it('评分取服务器实时汇总，评论显示昵称与正文', async () => {
    const wrapper = mount(DishDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('4.25 / 5');
    expect(wrapper.text()).toContain('实时统计');
    expect(wrapper.text()).toContain('干饭达人');
    expect(wrapper.text()).not.toContain('user-id');
    expect(wrapper.text()).toContain('好吃');
    expect(wrapper.text()).toContain('暂未上传菜品图片');
    expect(wrapper.text()).toContain('¥0.00');
    expect(wrapper.text()).not.toContain('避雷');
    expect(wrapper.text()).not.toContain('推荐 ·');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '下一页')
      .trigger('click');
    await flushPromises();
    expect(api.fetchDishReviews.mock.calls.at(-1).slice(0, 2)).toEqual([
      'd1',
      2,
    ]);
  });
  it('跨食堂或档口URL不展示错误上下文', async () => {
    api.fetchDish.mockResolvedValue({
      id: 'd1',
      name: '不能展示',
      diningHallId: 'other',
      stallId: 's1',
    });
    const wrapper = mount(DishDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('不匹配');
    expect(wrapper.text()).not.toContain('不能展示');
    expect(api.fetchDishImages).not.toHaveBeenCalled();
  });
  it('无快照评分显示暂无评分，不以评论计算分数', async () => {
    api.fetchDishRating.mockResolvedValue({
      averageScore: null,
      reviewCount: 0,
    });
    const wrapper = mount(DishDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('暂无评分');
  });
});
